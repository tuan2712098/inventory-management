class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function fail(status, message, details) {
  throw new AppError(status, message, details);
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.status) return res.status(error.status).json({ message: error.message, details: error.details });
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(error.errors).map(e => e.message).join('; ') });
  }
  if (error.name === 'CastError') return res.status(400).json({ message: 'ID hoặc dữ liệu không hợp lệ' });
  if (error.code === 11000) return res.status(409).json({ message: 'Dữ liệu đã tồn tại (mã hoặc email bị trùng)' });
  console.error('API error:', error);
  res.status(500).json({ message: 'Lỗi máy chủ. Vui lòng thử lại.' });
}

module.exports = { AppError, fail, asyncRoute, errorHandler };
