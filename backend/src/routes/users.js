const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { User, Warehouse, RefreshToken } = require('../models');
const { allow, ADMIN, MANAGERS } = require('../middlewares/auth');
const { asyncRoute, fail } = require('../utils/http');
const v = require('../utils/validate');
const router = express.Router();

const validRoles = ['super_admin', 'warehouse_manager', 'warehouse_staff', 'viewer'];
const allowedFields = ['fullName', 'email', 'role', 'status', 'phone', 'avatar', 'warehouses'];

function userOut(user) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.passwordHash;
  return obj;
}

async function warehouseIds(value) {
  if (!Array.isArray(value) || value.length > 100) v.text('', 'Danh sách kho');
  for (const w of value) v.objectId(w, 'Mã kho');
  const found = await Warehouse.countDocuments({ _id: { $in: value }, status: 'active' });
  if (found !== new Set(value).size) fail(400, 'Kho được chọn không tồn tại hoặc đã bị khóa');
  return [...new Set(value)];
}

router.get('/me', asyncRoute(async (req, res) => res.json(userOut(req.user))));
router.patch('/me', asyncRoute(async (req, res) => {
  const changes = {};
  if (req.body?.fullName !== undefined) changes.fullName = v.text(req.body.fullName, 'Họ tên', 2, 100);
  if (req.body?.phone !== undefined) changes.phone = v.text(req.body.phone || '', 'Điện thoại', 0, 30);
  if (req.body?.avatar !== undefined) changes.avatar = v.url(req.body.avatar, 'Ảnh đại diện');
  const user = await User.findByIdAndUpdate(req.user._id, { $set: changes }, { returnDocument: 'after', runValidators: true });
  res.json(userOut(user));
}));
router.get('/', allow(...ADMIN), asyncRoute(async (req, res) => {
  const page = Math.min(Math.max(Number.parseInt(req.query.page, 10) || 1, 1), 10000);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), 100);
  const filter = {};
  if (req.query.role) filter.role = v.oneOf(req.query.role, validRoles, 'Vai trò');
  if (req.query.status) filter.status = v.oneOf(req.query.status, ['active', 'inactive'], 'Trạng thái');
  if (req.query.q) { const q = String(req.query.q).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); filter.$or = [{ fullName: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }]; }
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);
  res.json({ items: items.map(userOut), total, page, pages: Math.ceil(total / limit) });
}));
router.post('/', allow(...ADMIN), asyncRoute(async (req, res) => {
  const email = v.email(req.body?.email);
  const fullName = v.text(req.body?.fullName, 'Họ tên', 2, 100);
  const role = v.oneOf(req.body?.role, validRoles, 'Vai trò');
  const warehouses = await warehouseIds(req.body?.warehouses || []);
  const temporaryPassword = crypto.randomBytes(18).toString('base64url');
  const user = await User.create({ fullName, email, role, warehouses, passwordHash: await bcrypt.hash(temporaryPassword, 12) });
  res.status(201).json({ user: userOut(user), temporaryPassword, notice: 'Mật khẩu tạm chỉ hiện một lần; cần chuyển cho nhân viên qua kênh riêng.' });
}));
router.get('/:id', allow(...MANAGERS), asyncRoute(async (req, res) => {
  v.objectId(req.params.id);
  const user = await User.findById(req.params.id);
  if (!user) fail(404, 'Không tìm thấy nhân viên');
  res.json(userOut(user));
}));
router.patch('/:id', allow(...ADMIN), asyncRoute(async (req, res) => {
  v.objectId(req.params.id);
  const existing = await User.findById(req.params.id);
  if (!existing) fail(404, 'Không tìm thấy nhân viên');
  const changes = {};
  for (const field of allowedFields) {
    if (req.body?.[field] === undefined) continue;
    const value = req.body[field];
    if (field === 'fullName') changes.fullName = v.text(value, 'Họ tên', 2, 100);
    if (field === 'email') changes.email = v.email(value);
    if (field === 'role') changes.role = v.oneOf(value, validRoles, 'Vai trò');
    if (field === 'status') changes.status = v.oneOf(value, ['active', 'inactive'], 'Trạng thái');
    if (field === 'phone') changes.phone = v.text(value || '', 'Điện thoại', 0, 30);
    if (field === 'avatar') changes.avatar = v.url(value, 'Ảnh đại diện');
    if (field === 'warehouses') changes.warehouses = await warehouseIds(value);
  }
  if (String(existing.id) === String(req.user.id) && (changes.status === 'inactive' || (changes.role && changes.role !== 'super_admin'))) {
    fail(400, 'Không thể tự khóa hoặc hạ quyền tài khoản admin đang đăng nhập');
  }
  const user = await User.findByIdAndUpdate(req.params.id, { $set: changes }, { returnDocument: 'after', runValidators: true });
  if (changes.status === 'inactive') await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  res.json(userOut(user));
}));
router.patch('/:id/status', allow(...ADMIN), asyncRoute(async (req, res) => {
  v.objectId(req.params.id);
  const status = v.oneOf(req.body?.status, ['active', 'inactive'], 'Trạng thái');
  if (String(req.params.id) === String(req.user._id) && status === 'inactive') fail(400, 'Không thể tự khóa tài khoản đang dùng');
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { status } }, { returnDocument: 'after' });
  if (!user) fail(404, 'Không tìm thấy nhân viên');
  if (status === 'inactive') await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  res.json(userOut(user));
}));
module.exports = router;
