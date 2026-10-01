const mongoose = require('mongoose');
const { Schema } = mongoose;
const id = (ref, required = true) => ({ type: Schema.Types.ObjectId, ref, required });
const opts = { timestamps: true, versionKey: false };

const User = mongoose.model('User', new Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ['super_admin', 'warehouse_manager', 'warehouse_staff', 'viewer'], default: 'viewer' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  phone: { type: String, default: '' },
  avatar: { type: String, default: '' },
  warehouses: [{ type: Schema.Types.ObjectId, ref: 'Warehouse' }],
}, opts));

const Category = mongoose.model('Category', new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  parent: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, opts));

const Product = mongoose.model('Product', new Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, required: true, unique: true, uppercase: true },
  category: id('Category'),
  unit: { type: String, required: true, default: 'cái' },
  costPrice: { type: Number, required: true, min: 0 },
  salePrice: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  minStockThreshold: { type: Number, default: 10, min: 0 },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, opts));

const Warehouse = mongoose.model('Warehouse', new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  address: { type: String, default: '' },
  staff: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, opts));

const Supplier = mongoose.model('Supplier', new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  contactName: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' },
  address: { type: String, default: '' },
  taxCode: { type: String, default: '' },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
}, opts));

const stockLevelSchema = new Schema({
  product: id('Product'), warehouse: id('Warehouse'),
  quantity: { type: Number, min: 0, default: 0, required: true },
}, opts);
stockLevelSchema.index({ product: 1, warehouse: 1 }, { unique: true });
const StockLevel = mongoose.model('StockLevel', stockLevelSchema, 'stock_levels');

const lineSchema = new Schema({
  product: id('Product'), quantity: { type: Number, required: true, min: 1 },
  costPrice: { type: Number, min: 0 },
}, { _id: false });
const stockBase = { code: { type: String, required: true, unique: true }, items: [lineSchema], note: { type: String, default: '' }, createdBy: id('User'), status: { type: String, enum: ['confirmed'], default: 'confirmed' } };
const StockIn = mongoose.model('StockIn', new Schema({
  ...stockBase, warehouse: id('Warehouse'), supplier: id('Supplier'), invoiceNo: { type: String, default: '' },
}, opts), 'stock_in');
const StockOut = mongoose.model('StockOut', new Schema({
  ...stockBase, warehouse: id('Warehouse'), reason: { type: String, required: true },
}, opts), 'stock_out');
const StockTransfer = mongoose.model('StockTransfer', new Schema({
  ...stockBase, fromWarehouse: id('Warehouse'), toWarehouse: id('Warehouse'),
}, opts), 'stock_transfers');

const auditItemSchema = new Schema({
  product: id('Product'), expectedQuantity: { type: Number, required: true, min: 0 },
  actualQuantity: { type: Number, default: null, min: 0 },
  difference: { type: Number, default: null },
}, { _id: false });
const StockAudit = mongoose.model('StockAudit', new Schema({
  code: { type: String, unique: true, required: true },
  warehouse: id('Warehouse'), items: [auditItemSchema],
  status: { type: String, enum: ['in_progress', 'completed'], default: 'in_progress' },
  note: { type: String, default: '' }, createdBy: id('User'),
  confirmedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  confirmedAt: { type: Date, default: null },
}, opts), 'stock_audits');

const StockMovement = mongoose.model('StockMovement', new Schema({
  product: id('Product'), warehouse: id('Warehouse'),
  type: { type: String, enum: ['stock_in', 'stock_out', 'transfer_in', 'transfer_out', 'audit_adjustment'], required: true },
  quantityChange: { type: Number, required: true },
  quantityBefore: { type: Number, required: true },
  quantityAfter: { type: Number, required: true },
  referenceId: { type: Schema.Types.ObjectId, required: true },
  referenceType: { type: String, required: true },
  note: { type: String, default: '' },
  createdBy: id('User'),
}, opts), 'stock_movements');

const alertSchema = new Schema({
  product: id('Product'), warehouse: id('Warehouse'),
  quantity: { type: Number, required: true, min: 0 },
  threshold: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
}, opts);
alertSchema.index({ product: 1, warehouse: 1 }, { unique: true, partialFilterExpression: { status: 'open' } });
const StockAlert = mongoose.model('StockAlert', alertSchema, 'stock_alerts');

const refreshSchema = new Schema({
  user: id('User'), tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true }, revokedAt: { type: Date, default: null },
}, opts);
refreshSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const RefreshToken = mongoose.model('RefreshToken', refreshSchema);

module.exports = { User, Category, Product, Warehouse, Supplier, StockLevel, StockIn, StockOut, StockTransfer, StockAudit, StockMovement, StockAlert, RefreshToken };
