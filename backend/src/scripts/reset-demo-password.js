require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const { User, RefreshToken } = require('../models');
const { connectDatabase } = require('../config/db');
const emails = ['admin@inventory.local', 'manager@inventory.local', 'staff@inventory.local', 'viewer@inventory.local'];
async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Không được dùng trên production');
  await connectDatabase();
  const users = await User.find({ email: { $in: emails } });
  if (users.length !== 4) throw new Error('Chưa đủ 4 tài khoản demo, chạy npm run seed trước');
  const password = crypto.randomBytes(18).toString('base64url');
  const hash = await bcrypt.hash(password, 12);
  await User.updateMany({ email: { $in: emails } }, { $set: { passwordHash: hash, status: 'active' } });
  await RefreshToken.updateMany({ user: { $in: users.map(u => u._id) } }, { $set: { revokedAt: new Date() } });
  console.log('ĐÃ ĐỔI MẬT KHẨU 4 TÀI KHOẢN DEMO:', password);
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
