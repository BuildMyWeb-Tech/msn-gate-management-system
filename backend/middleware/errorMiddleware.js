// middleware/errorMiddleware.js
const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
};

const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || err.status || 500;
  if (status >= 500) console.error(`[${new Date().toISOString()}]`, err.stack);

  if (err.name === 'CastError')
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(409).json({ success: false, message: `Duplicate value for: ${field}`, field });
  }
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => ({ field: e.path, message: e.message }));
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  return res.status(status).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' ? { stack: err.stack } : {}),
  });
};

module.exports = { notFound, errorHandler };