const express = require('express');
const { StockLevel, StockMovement, StockAlert, StockIn, StockOut, StockTransfer, StockAudit, Product } = require('../models');
const { allow, MANAGERS, OPERATORS } = require('../middlewares/auth');
const { asyncRoute, fail } = require('../utils/http');
const v = require('../utils/validate');
const inventory = require('../services/inventory');

function listing(Model, populate = []) {
  return asyncRoute(async (req, res) => {
    const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), 10000);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 30, 1), 200);
    const filter = {};
    if (req.query.warehouse) filter.warehouse = v.objectId(req.query.warehouse, 'Kho');
    let query = Model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    for (const field of populate) query = query.populate(field);
    const [items, total] = await Promise.all([query, Model.countDocuments(filter)]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  });
}

const levels = express.Router();
levels.get('/', asyncRoute(async (req, res) => {
  const filter = {};
  if (req.query.warehouse) filter.warehouse = v.objectId(req.query.warehouse, 'Kho');
  if (req.query.product) filter.product = v.objectId(req.query.product, 'Sản phẩm');
  const items = await StockLevel.find(filter).populate('product', 'name sku unit costPrice minStockThreshold category').populate('warehouse', 'name code').sort({ updatedAt: -1 }).limit(1000);
  res.json({ items });
}));
levels.get('/low-stock', asyncRoute(async (req, res) => {
  const filter = {};
  if (req.query.warehouse) filter.warehouse = v.objectId(req.query.warehouse, 'Kho');
  const items = await StockLevel.find(filter).populate('product', 'name sku minStockThreshold unit').populate('warehouse', 'name code');
  res.json({ items: items.filter(l => l.product && l.quantity < l.product.minStockThreshold) });
}));

function receiptRouter(Model, createFn, permission = OPERATORS) {
  const router = express.Router();
  const populate = ['items.product', 'createdBy'];
  if (Model === StockIn) populate.push('supplier', 'warehouse');
  else if (Model === StockOut) populate.push('warehouse');
  else populate.push('fromWarehouse', 'toWarehouse');
  router.get('/', listing(Model, populate));
  router.get('/:id', asyncRoute(async (req, res) => {
    v.objectId(req.params.id);
    let query = Model.findById(req.params.id);
    for (const field of populate) query = query.populate(field);
    const record = await query;
    if (!record) fail(404, 'Không tìm thấy phiếu');
    res.json(record);
  }));
  router.post('/', allow(...permission), asyncRoute(async (req, res) => {
    res.status(201).json(await createFn(req.body || {}, req.user._id));
  }));
  return router;
}
const stockIn = receiptRouter(StockIn, inventory.stockIn);
const stockOut = receiptRouter(StockOut, inventory.stockOut);
const transfers = receiptRouter(StockTransfer, inventory.transfer, MANAGERS);

const audits = express.Router();
audits.get('/', asyncRoute(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = v.oneOf(req.query.status, ['in_progress', 'completed'], 'Trạng thái');
  const items = await StockAudit.find(filter).populate('warehouse', 'name code').populate('items.product', 'name sku unit').populate('createdBy', 'fullName').sort({ createdAt: -1 }).limit(100);
  res.json({ items });
}));
audits.get('/:id', asyncRoute(async (req, res) => {
  v.objectId(req.params.id);
  const item = await StockAudit.findById(req.params.id).populate('warehouse', 'name code').populate('items.product', 'name sku unit');
  if (!item) fail(404, 'Không tìm thấy phiếu kiểm kê');
  res.json(item);
}));
audits.post('/', allow(...OPERATORS), asyncRoute(async (req, res) => {
  res.status(201).json(await inventory.startAudit(req.body || {}, req.user._id));
}));
audits.patch('/:id/confirm', allow(...MANAGERS), asyncRoute(async (req, res) => {
  res.json(await inventory.confirmAudit(req.params.id, req.body || {}, req.user._id));
}));

const alerts = express.Router();
alerts.get('/', asyncRoute(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = v.oneOf(req.query.status, ['open', 'resolved'], 'Trạng thái');
  else filter.status = 'open';
  const items = await StockAlert.find(filter).populate('product', 'name sku').populate('warehouse', 'name code').sort({ createdAt: -1 }).limit(200);
  res.json({ items });
}));
alerts.patch('/:id/resolve', allow(...MANAGERS), asyncRoute(async (req, res) => {
  v.objectId(req.params.id);
  const alert = await StockAlert.findOneAndUpdate({ _id: req.params.id, status: 'open' },
    { $set: { status: 'resolved', resolvedAt: new Date(), resolvedBy: req.user._id } }, { returnDocument: 'after' });
  if (!alert) fail(404, 'Không tìm thấy cảnh báo đang mở');
  res.json(alert);
}));

module.exports = { levels, stockIn, stockOut, transfers, audits, alerts };
