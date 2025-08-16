/**
 * Rate Limiting Middleware
 * Prevents abuse and ensures fair usage of API resources
 */

import { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../utils/errors';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export function createRateLimiter(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const key = `${clientId}:${req.route?.path || req.path}`;
    const now = Date.now();

    // Initialize or reset if window expired
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + config.windowMs
      };
    }

    // Increment request count
    store[key].count++;

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': config.max.toString(),
      'X-RateLimit-Remaining': Math.max(0, config.max - store[key].count).toString(),
      'X-RateLimit-Reset': new Date(store[key].resetTime).toISOString()
    });

    // Check if limit exceeded
    if (store[key].count > config.max) {
      throw new RateLimitError(config.message || 'Rate limit exceeded');
    }

    next();
  };
}

// Pre-configured rate limiters
export const rateLimiters = {
  upload: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: 'Too many upload requests. Please try again in 15 minutes.'
  }),

  api: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    message: 'Too many API requests. Please try again in a minute.'
  }),

  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
  })
};