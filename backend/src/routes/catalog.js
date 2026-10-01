const express = require('express');
const { Category, Product, Warehouse, Supplier, StockLevel } = require('../models');
const { allow, MANAGERS } = require('../middlewares/auth');
const { asyncRoute, fail } = require('../utils/http');
const v = require('../utils/validate');

async function active(model, id, label) {
  v.objectId(id, label);
  const found = await model.findOne({ _id: id, status: 'active' });
  if (!found) fail(400, `${label} không tồn tại hoặc đã bị khóa`);
  return found;
}

async function validateCategory(input, existingId) {
  const data = {};
  if (input.name !== undefined) data.name = v.text(input.name, 'Tên danh mục', 2, 100);
  if (input.code !== undefined) data.code = v.code(input.code, 'Mã danh mục');
  if (input.parent !== undefined) {
    data.parent = v.optionalObjectId(input.parent, 'Danh mục cha');
    if (data.parent) {
      if (String(data.parent) === String(existingId)) fail(400, 'Không thể chọn chính mình làm danh mục cha');
      let cursor = await active(Category, data.parent, 'Danh mục cha');
      const seen = new Set(existingId ? [String(existingId)] : []);
      while (cursor && cursor.parent) {
        if (seen.has(String(cursor._id))) fail(400, 'Không thể tạo vòng lặp danh mục');
        seen.add(String(cursor._id));
        cursor = await Category.findById(cursor.parent);
      }
      if (cursor && seen.has(String(cursor._id))) fail(400, 'Không thể tạo vòng lặp danh mục');
    }
  }
  return data;
}

async function validateProduct(input) {
  const data = {};
  if (input.name !== undefined) data.name = v.text(input.name, 'Tên sản phẩm', 2, 150);
  if (input.sku !== undefined) data.sku = v.code(input.sku, 'SKU');
  if (input.category !== undefined) data.category = (await active(Category, input.category, 'Danh mục'))._id;
  if (input.unit !== undefined) data.unit = v.text(input.unit, 'Đơn vị', 1, 20);
  if (input.costPrice !== undefined) data.costPrice = v.number(input.costPrice, 'Giá vốn', 0);
  if (input.salePrice !== undefined) data.salePrice = v.number(input.salePrice, 'Giá bán', 0);
  if (input.minStockThreshold !== undefined) data.minStockThreshold = v.integer(input.minStockThreshold, 'Ngưỡng tồn', 0, 1000000);
  if (input.description !== undefined) data.description = v.text(input.description || '', 'Mô tả', 0, 1000);
  if (input.imageUrl !== undefined) data.imageUrl = v.url(input.imageUrl, 'Ảnh sản phẩm');
  return data;
}

async function validateWarehouse(input) {
  const data = {};
  if (input.name !== undefined) data.name = v.text(input.name, 'Tên kho', 2, 120);
  if (input.code !== undefined) data.code = v.code(input.code, 'Mã kho');
  if (input.address !== undefined) data.address = v.text(input.address || '', 'Địa chỉ', 0, 300);
  if (input.staff !== undefined) {
    if (!Array.isArray(input.staff) || input.staff.length > 100) fail(400, 'Danh sách nhân viên không hợp lệ');
    data.staff = input.staff.map(u => v.objectId(u, 'Nhân viên'));
  }
  return data;
}

async function validateSupplier(input) {
  const data = {};
  for (const [key, label, min, max] of [
    ['name', 'Nhà cung cấp', 2, 150], ['contactName', 'Người liên hệ', 0, 100],
    ['phone', 'Điện thoại', 0, 30], ['address', 'Địa chỉ', 0, 300], ['taxCode', 'Mã số thuế', 0, 50],
  ]) if (input[key] !== undefined) data[key] = v.text(input[key] || '', label, min, max);
  if (input.code !== undefined) data.code = v.code(input.code, 'Mã nhà cung cấp');
  if (input.email !== undefined) data.email = input.email ? v.email(input.email) : '';
  return data;
}

function crud(model, options) {
  const router = express.Router();
  const { validate, populate = [], name, searchable = ['name'] } = options;
  router.get('/', asyncRoute(async (req, res) => {
    const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), 10000);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 200);
    const filter = {};
    if (req.query.status) filter.status = v.oneOf(req.query.status, ['active', 'inactive'], 'Trạng thái');
    if (req.query.q) {
      const safe = String(req.query.q).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = searchable.map(field => ({ [field]: new RegExp(safe, 'i') }));
    }
    if (model === Product && req.query.category) filter.category = v.objectId(req.query.category, 'Danh mục');
    let query = model.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    for (const field of populate) query = query.populate(field);
    const [items, total] = await Promise.all([query, model.countDocuments(filter)]);
    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  }));
  router.get('/:id', asyncRoute(async (req, res) => {
    v.objectId(req.params.id);
    let query = model.findById(req.params.id);
    for (const field of populate) query = query.populate(field);
    const item = await query;
    if (!item) fail(404, `Không tìm thấy ${name}`);
    res.json(item);
  }));
  router.post('/', allow(...MANAGERS), asyncRoute(async (req, res) => {
    const data = await validate(req.body || {});
    const item = await model.create(data);
    res.status(201).json(item);
  }));
  router.patch('/:id', allow(...MANAGERS), asyncRoute(async (req, res) => {
    v.objectId(req.params.id);
    if (!await model.exists({ _id: req.params.id })) fail(404, `Không tìm thấy ${name}`);
    const data = await validate(req.body || {}, req.params.id);
    if (req.body?.status !== undefined) data.status = v.oneOf(req.body.status, ['active', 'inactive'], 'Trạng thái');
    const item = await model.findByIdAndUpdate(req.params.id, { $set: data }, { returnDocument: 'after', runValidators: true });
    res.json(item);
  }));
  router.delete('/:id', allow(...MANAGERS), asyncRoute(async (req, res) => {
    v.objectId(req.params.id);
    const item = await model.findByIdAndUpdate(req.params.id, { $set: { status: 'inactive' } }, { returnDocument: 'after' });
    if (!item) fail(404, `Không tìm thấy ${name}`);
    res.json({ message: 'Đã ngừng sử dụng, dữ liệu lịch sử vẫn được giữ lại', item });
  }));
  return router;
}

const categories = crud(Category, { validate: validateCategory, name: 'danh mục', populate: ['parent'], searchable: ['name', 'code'] });
const products = crud(Product, { validate: validateProduct, name: 'sản phẩm', populate: ['category'], searchable: ['name', 'sku'] });
products.get('/:id/movements', asyncRoute(async (req, res) => {
  v.objectId(req.params.id);
  const { StockMovement } = require('../models');
  const items = await StockMovement.find({ product: req.params.id }).populate('warehouse', 'name code').populate('createdBy', 'fullName').sort({ createdAt: -1 }).limit(200);
  res.json({ items });
}));
const warehouses = crud(Warehouse, { validate: validateWarehouse, name: 'kho', searchable: ['name', 'code', 'address'] });
const suppliers = crud(Supplier, { validate: validateSupplier, name: 'nhà cung cấp', searchable: ['name', 'code', 'phone'] });

module.exports = { categories, products, warehouses, suppliers };
