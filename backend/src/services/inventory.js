const mongoose = require('mongoose');
const { Product, Warehouse, Supplier, StockLevel, StockMovement, StockAlert, StockIn, StockOut, StockTransfer, StockAudit } = require('../models');
const { fail } = require('../utils/http');
const v = require('../utils/validate');

let queue = Promise.resolve();

function serial(operation) {
  const job = queue.then(async () => {
    if (process.env.MONGO_TRANSACTIONS !== 'true') return operation(null);
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => { result = await operation(session); });
      return result;
    } finally { await session.endSession(); }
  });
  queue = job.catch(() => undefined);
  return job;
}

function opt(session, extra = {}) {
  return { ...extra, ...(session ? { session } : {}) };
}

async function create(Model, data, session) {
  const docs = await Model.create([data], opt(session));
  return docs[0];
}

async function ensureWarehouse(value, session) {
  v.objectId(value, 'Kho');
  const record = await Warehouse.findOne({ _id: value, status: 'active' }).session(session);
  if (!record) fail(400, 'Kho không tồn tại hoặc đã ngừng hoạt động');
  return record;
}

async function ensureProducts(items, session) {
  const products = await Product.find({ _id: { $in: items.map(row => row.product) }, status: 'active' }).session(session);
  if (products.length !== items.length) fail(400, 'Có sản phẩm không tồn tại hoặc đã ngừng hoạt động');
  return new Map(products.map(p => [String(p._id), p]));
}

async function adjustLevel({ product, warehouse, quantityChange, type, referenceId, referenceType, note, user, session, productDoc }) {
  let updated;
  if (quantityChange >= 0) {
    updated = await StockLevel.findOneAndUpdate(
      { product, warehouse }, { $inc: { quantity: quantityChange } },
      opt(session, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true, runValidators: true })
    );
  } else {
    updated = await StockLevel.findOneAndUpdate(
      { product, warehouse, quantity: { $gte: -quantityChange } },
      { $inc: { quantity: quantityChange } },
      opt(session, { returnDocument: 'after', runValidators: true })
    );
    if (!updated) {
      const level = await StockLevel.findOne({ product, warehouse }).session(session);
      fail(409, `Không đủ tồn kho cho SKU ${productDoc?.sku || product}. Tồn: ${level?.quantity || 0}, yêu cầu: ${-quantityChange}`);
    }
  }
  const before = updated.quantity - quantityChange;
  await create(StockMovement, {
    product, warehouse, type, quantityChange, quantityBefore: before, quantityAfter: updated.quantity,
    referenceId, referenceType, note, createdBy: user,
  }, session);
  const p = productDoc || await Product.findById(product).session(session);
  if (p) await syncAlert(p, warehouse, updated.quantity, user, session);
  return updated;
}

async function syncAlert(product, warehouse, quantity, user, session) {
  if (quantity < product.minStockThreshold) {
    await StockAlert.findOneAndUpdate(
      { product: product._id, warehouse, status: 'open' },
      { $set: { quantity, threshold: product.minStockThreshold } },
      opt(session, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true })
    );
  } else {
    await StockAlert.updateMany({ product: product._id, warehouse, status: 'open' },
      { $set: { status: 'resolved', resolvedAt: new Date(), resolvedBy: user } }, opt(session));
  }
}

function receiptCode(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${require('crypto').randomBytes(3).toString('hex').toUpperCase()}`;
}

function noteValue(raw, max = 500) {
  return v.text(raw || '', 'Ghi chú', 0, max);
}

async function stockIn(body, user) {
  const items = v.items(body?.items, true);
  const warehouse = v.objectId(body?.warehouse, 'Kho');
  const supplier = v.objectId(body?.supplier, 'Nhà cung cấp');
  const note = noteValue(body?.note);
  const invoiceNo = v.text(body?.invoiceNo || '', 'Số hóa đơn', 0, 100);
  return serial(async session => {
    await ensureWarehouse(warehouse, session);
    if (!await Supplier.exists({ _id: supplier, status: 'active' }).session(session)) fail(400, 'Nhà cung cấp không hợp lệ');
    const products = await ensureProducts(items, session);
    const receipt = await create(StockIn, { code: receiptCode('IN'), warehouse, supplier, items, invoiceNo, note, createdBy: user }, session);
    for (const row of items) {
      await adjustLevel({ product: row.product, warehouse, quantityChange: row.quantity, type: 'stock_in', referenceId: receipt._id, referenceType: 'StockIn', note, user, session, productDoc: products.get(row.product) });
    }
    return receipt;
  });
}

async function stockOut(body, user) {
  const items = v.items(body?.items);
  const warehouse = v.objectId(body?.warehouse, 'Kho');
  const reason = v.text(body?.reason, 'Lý do xuất', 3, 150);
  const note = noteValue(body?.note);
  return serial(async session => {
    await ensureWarehouse(warehouse, session);
    const products = await ensureProducts(items, session);
    for (const row of items) {
      const level = await StockLevel.findOne({ product: row.product, warehouse }).session(session);
      if (!level || level.quantity < row.quantity) fail(409, `SKU ${products.get(row.product).sku} chỉ còn ${level?.quantity || 0} sản phẩm`);
    }
    const receipt = await create(StockOut, { code: receiptCode('OUT'), warehouse, reason, items, note, createdBy: user }, session);
    for (const row of items) {
      await adjustLevel({ product: row.product, warehouse, quantityChange: -row.quantity, type: 'stock_out', referenceId: receipt._id, referenceType: 'StockOut', note: `${reason}. ${note}`.trim(), user, session, productDoc: products.get(row.product) });
    }
    return receipt;
  });
}

async function transfer(body, user) {
  const items = v.items(body?.items);
  const fromWarehouse = v.objectId(body?.fromWarehouse, 'Kho nguồn');
  const toWarehouse = v.objectId(body?.toWarehouse, 'Kho đích');
  if (fromWarehouse === toWarehouse) fail(400, 'Kho nguồn và kho đích phải khác nhau');
  const note = noteValue(body?.note);
  return serial(async session => {
    await ensureWarehouse(fromWarehouse, session);
    await ensureWarehouse(toWarehouse, session);
    const products = await ensureProducts(items, session);
    for (const row of items) {
      const level = await StockLevel.findOne({ product: row.product, warehouse: fromWarehouse }).session(session);
      if (!level || level.quantity < row.quantity) fail(409, `Kho nguồn không đủ SKU ${products.get(row.product).sku}. Tồn: ${level?.quantity || 0}`);
    }
    const receipt = await create(StockTransfer, { code: receiptCode('TRF'), fromWarehouse, toWarehouse, items, note, createdBy: user }, session);
    for (const row of items) {
      const basic = { product: row.product, referenceId: receipt._id, referenceType: 'StockTransfer', note, user, session, productDoc: products.get(row.product) };
      await adjustLevel({ ...basic, warehouse: fromWarehouse, quantityChange: -row.quantity, type: 'transfer_out' });
      await adjustLevel({ ...basic, warehouse: toWarehouse, quantityChange: row.quantity, type: 'transfer_in' });
    }
    return receipt;
  });
}

async function startAudit(body, user) {
  const warehouse = v.objectId(body?.warehouse, 'Kho');
  const note = noteValue(body?.note);
  return serial(async session => {
    await ensureWarehouse(warehouse, session);
    if (await StockAudit.exists({ warehouse, status: 'in_progress' }).session(session)) fail(409, 'Kho này đang có phiếu kiểm kê chưa hoàn thành');
    const levels = await StockLevel.find({ warehouse }).session(session).sort({ createdAt: 1 });
    if (!levels.length) fail(400, 'Kho chưa có tồn kho để kiểm kê');
    return create(StockAudit, {
      code: receiptCode('AUD'), warehouse, note, createdBy: user,
      items: levels.map(l => ({ product: l.product, expectedQuantity: l.quantity })),
    }, session);
  });
}

async function confirmAudit(auditId, body, user) {
  v.objectId(auditId, 'Phiếu kiểm kê');
  if (!Array.isArray(body?.items) || body.items.length === 0) fail(400, 'Cần nhập số lượng thực tế cho từng dòng');
  const actual = new Map();
  for (const item of body.items) {
    const product = v.objectId(item?.product, 'Sản phẩm');
    if (actual.has(product)) fail(400, 'Sản phẩm bị trùng trong kiểm kê');
    actual.set(product, v.integer(item.actualQuantity, 'Số lượng thực tế', 0, 1000000000));
  }
  const note = noteValue(body?.note, 1000);
  return serial(async session => {
    const audit = await StockAudit.findOne({ _id: auditId, status: 'in_progress' }).session(session);
    if (!audit) fail(404, 'Không tìm thấy phiếu kiểm kê chưa xác nhận');
    if (actual.size !== audit.items.length || audit.items.some(row => !actual.has(String(row.product)))) {
      fail(400, 'Phải nhập đầy đủ số lượng thực tế của các sản phẩm trong phiếu');
    }
    const products = await Product.find({ _id: { $in: audit.items.map(x => x.product) } }).session(session);
    const map = new Map(products.map(p => [String(p._id), p]));
    const changes = [];
    for (const row of audit.items) {
      const current = await StockLevel.findOne({ product: row.product, warehouse: audit.warehouse }).session(session);
      if (!current || current.quantity !== row.expectedQuantity) fail(409, 'Tồn kho đã thay đổi kể từ lúc mở phiếu; hãy tạo phiếu kiểm kê mới');
      const newQuantity = actual.get(String(row.product));
      const difference = newQuantity - row.expectedQuantity;
      changes.push({ row, newQuantity, difference, productDoc: map.get(String(row.product)) });
    }
    if (changes.some(c => c.difference !== 0) && !note) fail(400, 'Kiểm kê có chênh lệch phải ghi lý do');
    for (const change of changes) {
      if (change.difference !== 0) {
        await adjustLevel({ product: change.row.product, warehouse: audit.warehouse, quantityChange: change.difference, type: 'audit_adjustment', referenceId: audit._id, referenceType: 'StockAudit', note, user, session, productDoc: change.productDoc });
      }
    }
    audit.items.forEach(row => {
      row.actualQuantity = actual.get(String(row.product));
      row.difference = row.actualQuantity - row.expectedQuantity;
    });
    audit.status = 'completed';
    audit.note = note || audit.note;
    audit.confirmedAt = new Date();
    audit.confirmedBy = user;
    await audit.save(opt(session));
    return audit;
  });
}

module.exports = { serial, stockIn, stockOut, transfer, startAudit, confirmAudit };
