/**
 * Global Error Handler Middleware
 * Centralized error handling and logging for the Express application
 */

import { Request, Response, NextFunction } from 'express';
import { AgentOpsError, logError, formatErrorResponse } from '../utils/errors';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log the error with request context
  logError(error, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Don't send error details if response is already sent
  if (res.headersSent) {
    return next(error);
  }

  // Format error response
  const response = formatErrorResponse(error);
  const statusCode = error instanceof AgentOpsError ? error.statusCode : 500;

  // Send error response
  res.status(statusCode).json(response);
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
}

// Async error handler wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}