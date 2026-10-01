const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { asyncRoute, fail } = require('../utils/http');

const authenticate = asyncRoute(async (req, res, next) => {
  const value = req.headers.authorization || '';
  if (!/^Bearer\s+\S+$/.test(value)) fail(401, 'Bạn cần đăng nhập');
  let payload;
  try { payload = jwt.verify(value.slice(7), process.env.JWT_SECRET, { algorithms: ['HS256'] }); }
  catch { fail(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn'); }
  if (!payload.sub) fail(401, 'Token không hợp lệ');
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') fail(401, 'Tài khoản đã bị vô hiệu hóa');
  req.user = user;
  next();
});

const roles = (...allowed) => (req, res, next) => {
  if (!req.user || !allowed.includes(req.user.role)) return next(new Error('Missing authorization middleware'));
  next();
};

const allow = (...allowed) => (req, res, next) => {
  if (!req.user || !allowed.includes(req.user.role)) return res.status(403).json({ message: 'Bạn không có quyền thực hiện thao tác này' });
  next();
};

const ADMIN = ['super_admin'];
const MANAGERS = ['super_admin', 'warehouse_manager'];
const OPERATORS = ['super_admin', 'warehouse_manager', 'warehouse_staff'];
module.exports = { authenticate, allow, ADMIN, MANAGERS, OPERATORS };
