require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { connectDatabase } = require('../config/db');
const { User, Category, Product, Warehouse, Supplier, StockIn, StockLevel, StockMovement, StockAlert } = require('../models');
const { stockIn } = require('../services/inventory');
const mongoose = require('mongoose');

const accounts = [
  { fullName: 'Quản trị hệ thống', email: 'admin@inventory.local', role: 'super_admin' },
  { fullName: 'Quản lý kho', email: 'manager@inventory.local', role: 'warehouse_manager' },
  { fullName: 'Nhân viên kho', email: 'staff@inventory.local', role: 'warehouse_staff' },
  { fullName: 'Người xem báo cáo', email: 'viewer@inventory.local', role: 'viewer' },
];

async function upsert(Model, key, details) {
  return Model.findOneAndUpdate(key, { $setOnInsert: details }, { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true });
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Không chạy dữ liệu demo trong production');
  await connectDatabase();
  const firstRun = !await User.exists({ email: accounts[0].email });
  if (firstRun && await User.countDocuments() > 0) throw new Error('Database đã có user thật. Seed demo chỉ chạy trên database riêng, mới hoàn toàn.');
  let temporaryPassword = null;
  if (firstRun) {
    temporaryPassword = crypto.randomBytes(18).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    for (const account of accounts) await User.create({ ...account, passwordHash });
  }
  const admin = await User.findOne({ email: accounts[0].email });
  if (!admin || admin.role !== 'super_admin') throw new Error('Admin demo không hợp lệ. Dừng để tránh sửa dữ liệu thật.');
  const cat1 = await upsert(Category, { code: 'ELECTRONICS' }, { name: 'Điện tử', code: 'ELECTRONICS' });
  const cat2 = await upsert(Category, { code: 'STATIONERY' }, { name: 'Văn phòng phẩm', code: 'STATIONERY' });
  const cat3 = await upsert(Category, { code: 'ACCESSORIES' }, { name: 'Phụ kiện', code: 'ACCESSORIES', parent: cat1._id });
  const hn = await upsert(Warehouse, { code: 'WH-HN' }, { name: 'Kho Hà Nội', code: 'WH-HN', address: 'Hà Nội' });
  const nb = await upsert(Warehouse, { code: 'WH-NB' }, { name: 'Kho Ninh Bình', code: 'WH-NB', address: 'Ninh Bình' });
  const supplier = await upsert(Supplier, { code: 'NCC-HOAPHAT' }, { name: 'Công ty Hòa Phát Demo', code: 'NCC-HOAPHAT', contactName: 'Bộ phận cung ứng', phone: '0900000000', email: 'hello@supplier.local', address: 'Hà Nội' });
  const details = [
    ['LAP-DEMO-01', 'Laptop văn phòng 14 inch', cat1._id, 'cái', 12500000, 15600000, 8],
    ['MOU-DEMO-01', 'Chuột không dây', cat3._id, 'cái', 95000, 149000, 20],
    ['KEY-DEMO-01', 'Bàn phím cơ', cat3._id, 'cái', 540000, 790000, 12],
    ['NOTE-DEMO-01', 'Sổ ghi chép A5', cat2._id, 'quyển', 18000, 29000, 25],
    ['PEN-DEMO-01', 'Bút bi xanh', cat2._id, 'hộp', 42000, 58000, 30],
    ['USB-DEMO-01', 'USB 64 GB', cat1._id, 'cái', 95000, 149000, 15],
  ];
  const products = [];
  for (const [sku, name, category, unit, costPrice, salePrice, minStockThreshold] of details) {
    products.push(await upsert(Product, { sku }, { sku, name, category, unit, costPrice, salePrice, minStockThreshold }));
  }
  if (!await StockIn.exists({ invoiceNo: 'DEMO-INITIAL-STOCK' })) {
    await stockIn({ warehouse: hn.id, supplier: supplier.id, invoiceNo: 'DEMO-INITIAL-STOCK', note: 'Dữ liệu nhập kho demo ban đầu', items: products.map((p, i) => ({ product: p.id, quantity: [18, 58, 35, 90, 120, 24][i], costPrice: p.costPrice })) }, admin._id);
    await stockIn({ warehouse: nb.id, supplier: supplier.id, invoiceNo: 'DEMO-SECOND-WAREHOUSE', note: 'Nhập hàng kho thứ hai', items: products.slice(0, 4).map((p, i) => ({ product: p.id, quantity: [4, 15, 9, 20][i], costPrice: p.costPrice })) }, admin._id);
  }
  console.log('SEED THÀNH CÔNG | Database: inventory_management');
  for (const account of accounts) console.log(`${account.role.padEnd(20)} ${account.email}`);
  if (temporaryPassword) console.log(`MẬT KHẨU DEMO CHUNG (chỉ hiện lần đầu): ${temporaryPassword}`);
  else console.log('Tài khoản đã tồn tại; không đổi mật khẩu. Nếu quên, chạy: npm run demo:reset-password');
  console.log('Giữ riêng mật khẩu demo, không commit lên GitHub.');
}

main().catch(error => { console.error('SEED ERROR:', error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
