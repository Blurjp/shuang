import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Extend Express Request to include start time
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
    }
  }
}

/**
 * Request logging middleware
 * Logs incoming HTTP requests with timing information
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  req.startTime = startTime;

  // Log request
  logger.http(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const { statusCode } = res;

    const logData = {
      method: req.method,
      path: req.path,
      statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    };

    if (statusCode >= 500) {
      logger.error(`HTTP ${statusCode} - ${req.method} ${req.path}`, logData);
    } else if (statusCode >= 400) {
      logger.warn(`HTTP ${statusCode} - ${req.method} ${req.path}`, logData);
    } else {
      logger.http(`HTTP ${statusCode} - ${req.method} ${req.path} (${duration}ms)`, logData);
    }
  });

  next();
}

/**
 * Error logging middleware
 * Logs errors with full stack traces
 */
export function errorLogger(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const duration = req.startTime ? Date.now() - req.startTime : 0;

  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    ip: req.ip,
    duration: `${duration}ms`,
  });

  next(err);
}
