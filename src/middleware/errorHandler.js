import { logger } from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error', err);

  // Get status code from error if available, default to 500
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  const errorResponse = {
    status: 'error',
    message
  };

  // Add error code if available
  if (err.code) {
    errorResponse.code = err.code;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};