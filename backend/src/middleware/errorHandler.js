const { ZodError } = require('zod');
const ApiError = require('../utils/apiError');
const config = require('../config/env');

// Centralized Error Handling Middleware
// Express recognizes error-handling middleware by its 4 arguments: (err, req, res, next)
const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let errors = null;

  // 1. Handled Operational ApiErrors
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }
  // 2. Zod Validation Errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  // 3. Prisma Known Request Errors (e.g. Unique constraints, foreign keys)
  else if (err.code === 'P2002') {
    statusCode = 409;
    const target = err.meta?.target ? err.meta.target.join(', ') : 'field';
    message = `Unique constraint violation: A record with this ${target} already exists.`;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = err.meta?.cause || 'Record not found in database.';
  }
  // 4. JSON parse error in body
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON payload provided.';
  }
  // 5. Unhandled generic errors
  else {
    message = config.nodeEnv === 'production' ? 'An unexpected internal error occurred.' : err.message;
    if (config.nodeEnv !== 'production') {
      console.error('Unhandled Server Error:', err);
    }
  }

  const responsePayload = {
    success: false,
    message,
    ...(errors && { errors }),
    ...(config.nodeEnv !== 'production' && { stack: err.stack }),
  };

  return res.status(statusCode).json(responsePayload);
};

// 404 Not Found Catch-All Middleware
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Endpoint not found: ${req.method} ${req.originalUrl}`));
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
