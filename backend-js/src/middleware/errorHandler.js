/**
 * Error Handler Middleware
 * Centralized error handling for the Express application
 * Handles file size errors (413), validation errors (400), and generic errors (500)
 */

import config from '../config/index.js';

/**
 * Custom error class for validation errors
 */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

/**
 * Custom error class for not found errors
 */
export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

/**
 * Custom error class for conflict errors (e.g., duplicate file)
 */
export class ConflictError extends Error {
  constructor(message = 'Resource already exists') {
    super(message);
    this.name = 'ConflictError';
    this.statusCode = 409;
  }
}

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log error for debugging (in production, use proper logging)
  console.error('Error:', {
    name: err.name,
    message: err.message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Handle Multer file size errors (413 Payload Too Large)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: `File is too large. Max size is ${config.maxFileSize / (1024 * 1024)}MB`
    });
  }

  // Handle Multer file count errors
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      error: 'Too many files uploaded'
    });
  }

  // Handle Multer unexpected field errors
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Unexpected file field'
    });
  }

  // Handle validation errors (400 Bad Request)
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: err.message
    });
  }

  // Handle not found errors (404 Not Found)
  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      error: err.message
    });
  }

  // Handle conflict errors (409 Conflict)
  if (err.name === 'ConflictError') {
    return res.status(409).json({
      message: err.message
    });
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON in request body'
    });
  }

  // Handle generic errors (500 Internal Server Error)
  const statusCode = err.statusCode || err.status || 500;
  const message = statusCode === 500 ? 'Something went wrong' : err.message;

  res.status(statusCode).json({
    error: message
  });
};

/**
 * 404 Not Found handler for unmatched routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
};

export { errorHandler, notFoundHandler };
export default errorHandler;
