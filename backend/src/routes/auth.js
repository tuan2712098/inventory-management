const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, RefreshToken } = require('../models');
const { authenticate } = require('../middlewares/auth');
const { asyncRoute, fail } = require('../utils/http');
const { text, email } = require('../utils/validate');
const router = express.Router();

const hash = token => crypto.createHash('sha256').update(token).digest('hex');
const publicUser = user => ({ id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status, warehouses: user.warehouses });

async function issue(user) {
  const accessToken = jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: '15m' });
  const refreshToken = crypto.randomBytes(48).toString('base64url');
  await RefreshToken.create({ user: user._id, tokenHash: hash(refreshToken), expiresAt: new Date(Date.now() + 7 * 86400 * 1000) });
  return { accessToken, refreshToken, user: publicUser(user) };
}

router.post('/login', asyncRoute(async (req, res) => {
  const mail = email(req.body?.email);
  const password = req.body?.password;
  if (typeof password !== 'string' || password.length > 128) fail(400, 'Mật khẩu không hợp lệ');
  const user = await User.findOne({ email: mail }).select('+passwordHash');
  if (!user || user.status !== 'active' || !await bcrypt.compare(password, user.passwordHash)) {
    fail(401, 'Email hoặc mật khẩu không đúng');
  }
  res.json(await issue(user));
}));

router.post('/refresh', asyncRoute(async (req, res) => {
  const token = req.body?.refreshToken;
  if (typeof token !== 'string' || token.length < 40 || token.length > 200) fail(401, 'Refresh token không hợp lệ');
  const session = await RefreshToken.findOneAndUpdate(
    { tokenHash: hash(token), revokedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { revokedAt: new Date() } },
    { returnDocument: 'after' }
  );
  if (!session) fail(401, 'Phiên đăng nhập đã hết hạn');
  const user = await User.findById(session.user);
  if (!user || user.status !== 'active') fail(401, 'Tài khoản đã bị khóa');
  res.json(await issue(user));
}));

router.post('/logout', asyncRoute(async (req, res) => {
  const token = req.body?.refreshToken;
  if (typeof token === 'string' && token.length < 200) {
    await RefreshToken.updateOne({ tokenHash: hash(token) }, { $set: { revokedAt: new Date() } });
  }
  res.json({ message: 'Đã đăng xuất' });
}));

router.post('/change-password', authenticate, asyncRoute(async (req, res) => {
  const oldPassword = req.body?.oldPassword;
  const newPassword = req.body?.newPassword;
  if (typeof oldPassword !== 'string' || typeof newPassword !== 'string' || newPassword.length < 8 || newPassword.length > 128) {
    fail(400, 'Mật khẩu mới cần từ 8 đến 128 ký tự');
  }
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!await bcrypt.compare(oldPassword, user.passwordHash)) fail(400, 'Mật khẩu hiện tại không đúng');
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();
  await RefreshToken.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  res.json({ message: 'Đã đổi mật khẩu. Hãy đăng nhập lại.' });
}));

module.exports = router;
