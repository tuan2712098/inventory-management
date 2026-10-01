const express = require('express');
const ExcelJS = require('exceljs');
const { Product, Category, Supplier, Warehouse, StockLevel, StockIn, StockOut, StockAlert, StockMovement } = require('../models');
const { allow, MANAGERS } = require('../middlewares/auth');
const { asyncRoute, fail } = require('../utils/http');
const v = require('../utils/validate');
const router = express.Router();

function movementFilter(query) {
  const filter = {};
  if (query.product) filter.product = v.objectId(query.product, 'Sản phẩm');
  if (query.warehouse) filter.warehouse = v.objectId(query.warehouse, 'Kho');
  if (query.type) filter.type = v.oneOf(query.type, ['stock_in', 'stock_out', 'transfer_in', 'transfer_out', 'audit_adjustment'], 'Loại thao tác');
  if (query.from || query.to) {
    filter.createdAt = {};
    if (query.from) {
      const from = new Date(`${query.from}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(query.from) || Number.isNaN(from.getTime())) fail(400, 'Ngày bắt đầu không hợp lệ');
      filter.createdAt.$gte = from;
    }
    if (query.to) {
      const to = new Date(`${query.to}T23:59:59.999Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(query.to) || Number.isNaN(to.getTime())) fail(400, 'Ngày kết thúc không hợp lệ');
      filter.createdAt.$lte = to;
    }
  }
  return filter;
}

router.get('/summary', asyncRoute(async (req, res) => {
  const startDay = new Date();
  startDay.setHours(0, 0, 0, 0);
  const startMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 5, 1));
  const [productCount, warehouseCount, supplierCount, categoryCount, stockInsToday, stockOutsToday, openAlerts, levels, movements, recent, topOut] = await Promise.all([
    Product.countDocuments({ status: 'active' }), Warehouse.countDocuments({ status: 'active' }),
    Supplier.countDocuments({ status: 'active' }), Category.countDocuments({ status: 'active' }),
    StockIn.countDocuments({ createdAt: { $gte: startDay } }), StockOut.countDocuments({ createdAt: { $gte: startDay } }),
    StockAlert.countDocuments({ status: 'open' }),
    StockLevel.find().populate('product', 'name sku costPrice minStockThreshold status').populate('warehouse', 'name code').lean(),
    StockMovement.find({ createdAt: { $gte: startMonth }, type: { $in: ['stock_in', 'stock_out'] } }).select('type quantityChange createdAt').lean(),
    StockMovement.find().sort({ createdAt: -1 }).limit(8).populate('product', 'name sku').populate('warehouse', 'name code').populate('createdBy', 'fullName').lean(),
    StockMovement.aggregate([
      { $match: { type: 'stock_out', createdAt: { $gte: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)) } } },
      { $group: { _id: '$product', quantity: { $sum: { $abs: '$quantityChange' } } } },
      { $sort: { quantity: -1 } }, { $limit: 5 },
      { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } },
      { $unwind: '$product' },
      { $project: { product: '$product.name', sku: '$product.sku', quantity: 1 } },
    ]),
  ]);
  const lowStock = levels.filter(x => x.product && x.quantity < x.product.minStockThreshold);
  const months = [];
  for (let offset = 5; offset >= 0; offset--) {
    const date = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - offset, 1));
    const key = date.toISOString().slice(0, 7);
    months.push({ month: key, stockIn: 0, stockOut: 0 });
  }
  for (const movement of movements) {
    const key = movement.createdAt.toISOString().slice(0, 7);
    const row = months.find(x => x.month === key);
    if (!row) continue;
    if (movement.type === 'stock_in') row.stockIn += movement.quantityChange;
    if (movement.type === 'stock_out') row.stockOut += Math.abs(movement.quantityChange);
  }
  res.json({
    totals: {
      products: productCount, warehouses: warehouseCount, suppliers: supplierCount, categories: categoryCount,
      lowStock: lowStock.length, openAlerts, stockInsToday, stockOutsToday,
      totalQuantity: levels.reduce((sum, item) => sum + item.quantity, 0),
      inventoryValue: levels.reduce((sum, item) => sum + item.quantity * (item.product?.costPrice || 0), 0),
    },
    monthly: months, topOut, recentMovements: recent,
    lowStock: lowStock.slice(0, 12),
  });
}));

router.get('/movements', asyncRoute(async (req, res) => {
  const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), 10000);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 50, 1), 200);
  const filter = movementFilter(req.query);
  const [items, total] = await Promise.all([
    StockMovement.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate('product', 'name sku unit').populate('warehouse', 'name code').populate('createdBy', 'fullName'),
    StockMovement.countDocuments(filter),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}));

router.get('/inventory', asyncRoute(async (req, res) => {
  const filter = {};
  if (req.query.warehouse) filter.warehouse = v.objectId(req.query.warehouse, 'Kho');
  const items = await StockLevel.find(filter).populate('product', 'name sku unit costPrice minStockThreshold category').populate('warehouse', 'name code');
  res.json({ items: items.map(l => ({
    id: l.id, product: l.product, warehouse: l.warehouse, quantity: l.quantity,
    totalValue: l.quantity * (l.product?.costPrice || 0), updatedAt: l.updatedAt,
  })) });
}));

router.get('/export', allow(...MANAGERS), asyncRoute(async (req, res) => {
  const type = v.oneOf(req.query.type || 'inventory', ['inventory', 'movements'], 'Loại báo cáo');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Inventory Management System';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(type === 'inventory' ? 'Ton kho' : 'Lich su');
  let rows;
  if (type === 'inventory') {
    const filter = req.query.warehouse ? { warehouse: v.objectId(req.query.warehouse, 'Kho') } : {};
    const data = await StockLevel.find(filter).populate('product', 'name sku unit costPrice minStockThreshold').populate('warehouse', 'name');
    sheet.columns = [
      { header: 'SKU', key: 'sku', width: 22 }, { header: 'Sản phẩm', key: 'name', width: 32 },
      { header: 'Kho', key: 'warehouse', width: 24 }, { header: 'Đơn vị', key: 'unit', width: 14 },
      { header: 'Số lượng', key: 'quantity', width: 16 }, { header: 'Giá vốn', key: 'price', width: 18 },
      { header: 'Giá trị', key: 'value', width: 18 }, { header: 'Ngưỡng cảnh báo', key: 'threshold', width: 20 },
    ];
    rows = data.map(l => ({ sku: l.product?.sku, name: l.product?.name, warehouse: l.warehouse?.name,
      unit: l.product?.unit, quantity: l.quantity, price: l.product?.costPrice,
      value: l.quantity * (l.product?.costPrice || 0), threshold: l.product?.minStockThreshold }));
  } else {
    const data = await StockMovement.find(movementFilter(req.query)).populate('product', 'name sku').populate('warehouse', 'name').populate('createdBy', 'fullName').sort({ createdAt: -1 }).limit(10000);
    sheet.columns = [
      { header: 'Ngày', key: 'date', width: 23 }, { header: 'SKU', key: 'sku', width: 23 },
      { header: 'Sản phẩm', key: 'product', width: 30 }, { header: 'Kho', key: 'warehouse', width: 24 },
      { header: 'Loại', key: 'type', width: 21 }, { header: 'Biến động', key: 'delta', width: 16 },
      { header: 'Trước', key: 'before', width: 14 }, { header: 'Sau', key: 'after', width: 14 },
      { header: 'Người thực hiện', key: 'by', width: 22 },
    ];
    rows = data.map(m => ({ date: m.createdAt.toISOString(), sku: m.product?.sku, product: m.product?.name,
      warehouse: m.warehouse?.name, type: m.type, delta: m.quantityChange, before: m.quantityBefore,
      after: m.quantityAfter, by: m.createdBy?.fullName }));
  }
  rows.forEach(row => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2456A7' } };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="inventory-${type}-${new Date().toISOString().slice(0, 10)}.xlsx"`);
  res.send(Buffer.from(buffer));
}));

module.exports = router;
