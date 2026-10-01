require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const { connectDatabase } = require('./config/db');
const { errorHandler } = require('./utils/http');
const { authenticate } = require('./middlewares/auth');

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: [process.env.FRONTEND_ORIGIN || 'http://localhost:5174', 'http://127.0.0.1:5174'] }));
  app.use(express.json({ limit: '1mb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'inventory-management', database: require('mongoose').connection.readyState === 1 ? 'connected' : 'disconnected' }));
  app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 80, standardHeaders: 'draft-7', legacyHeaders: false }), require('./routes/auth'));
  app.use('/api', authenticate);
  app.use('/api/users', require('./routes/users'));
  app.use('/api/categories', require('./routes/catalog').categories);
  app.use('/api/products', require('./routes/catalog').products);
  app.use('/api/warehouses', require('./routes/catalog').warehouses);
  app.use('/api/suppliers', require('./routes/catalog').suppliers);
  app.use('/api/stock-levels', require('./routes/stock').levels);
  app.use('/api/stock-in', require('./routes/stock').stockIn);
  app.use('/api/stock-out', require('./routes/stock').stockOut);
  app.use('/api/stock-transfers', require('./routes/stock').transfers);
  app.use('/api/stock-audits', require('./routes/stock').audits);
  app.use('/api/alerts', require('./routes/stock').alerts);
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api', (_req, res) => res.status(404).json({ message: 'Không tìm thấy API' }));
  app.use(errorHandler);
  return app;
}

if (require.main === module) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 ||
      !process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32 ||
      process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    console.error('Cấu hình JWT_SECRET/JWT_REFRESH_SECRET trong backend/.env phải đủ dài và khác nhau.');
    process.exit(1);
  }
  connectDatabase().then(() => {
    const port = Number(process.env.PORT || 4100);
    createApp().listen(port, () => console.log(`Inventory API: http://localhost:${port}`));
  }).catch(error => { console.error(error.message); process.exit(1); });
}

module.exports = { createApp };
