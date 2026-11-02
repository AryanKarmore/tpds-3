function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', err);

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: err.message || 'An unexpected internal server error occurred',
    details: err.details || undefined
  });
}

module.exports = errorHandler;
