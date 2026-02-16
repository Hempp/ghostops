// Rate Limiting Middleware - SENTINEL Security
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  firstRequest: number;
}

// In-memory rate limit store (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.firstRequest > 60000) { // 1 minute window
      rateLimitStore.delete(key);
    }
  }
}, 300000);

export interface RateLimitOptions {
  windowMs?: number;      // Time window in milliseconds (default: 60000 = 1 minute)
  maxRequests?: number;   // Max requests per window (default: 100)
  keyGenerator?: (req: Request) => string; // Function to generate rate limit key
  message?: string;       // Error message
}

export function createRateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = 60000,
    maxRequests = 100,
    keyGenerator = (req) => req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
    message = 'Too many requests, please try again later'
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || (now - entry.firstRequest > windowMs)) {
      // New window or first request
      rateLimitStore.set(key, { count: 1, firstRequest: now });
      next();
      return;
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.firstRequest + windowMs - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.status(429).json({ error: message, retryAfter });
      return;
    }

    entry.count++;
    next();
  };
}

// Pre-configured limiters for different use cases
export const webhookRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 60,  // 60 requests per minute per IP
  message: 'Webhook rate limit exceeded'
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 100,  // 100 requests per minute per IP
  message: 'API rate limit exceeded'
});

export const strictRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 10,   // 10 requests per minute (for sensitive endpoints)
  message: 'Rate limit exceeded for this endpoint'
});
