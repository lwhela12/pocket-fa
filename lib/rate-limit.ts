import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import type { NextApiRequest, NextApiResponse } from 'next';

// Create Redis client for Upstash (Vercel's Redis provider)
// In production, these env vars are automatically set by Vercel when you add Upstash Redis
// For local development, you can skip rate limiting or use a local Redis instance
const redis = process.env.UPSTASH_KV_REST_API_URL && process.env.UPSTASH_KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_KV_REST_API_URL,
      token: process.env.UPSTASH_KV_REST_API_TOKEN,
    })
  : null;

// Define different rate limiters for different endpoint types
export const authRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 requests per 15 minutes
      analytics: true,
      prefix: 'ratelimit:auth',
    })
  : null;

export const apiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
      analytics: true,
      prefix: 'ratelimit:api',
    })
  : null;

export const aiRateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, '1 h'), // 20 AI requests per hour (to control Gemini API costs)
      analytics: true,
      prefix: 'ratelimit:ai',
    })
  : null;

/**
 * Apply rate limiting to an API route
 * @param req - Next.js API request
 * @param res - Next.js API response
 * @param limiter - Rate limiter to use (auth, api, or ai)
 * @returns true if rate limit is not exceeded, false otherwise
 */
export async function checkRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  limiter: typeof authRateLimiter | typeof apiRateLimiter | typeof aiRateLimiter
): Promise<boolean> {
  // Skip rate limiting in development if KV is not configured
  if (!limiter) {
    if (process.env.NODE_ENV === 'development') {
      return true; // Allow requests in development without KV
    }
    // In production, KV should always be configured
    res.status(500).json({
      success: false,
      error: 'Rate limiting not configured',
    });
    return false;
  }

  // Use IP address as identifier, fallback to a default for local development
  const identifier =
    req.headers['x-forwarded-for']?.toString() ||
    req.socket.remoteAddress ||
    'anonymous';

  try {
    const { success, limit, reset, remaining } = await limiter.limit(identifier);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', reset.toString());

    if (!success) {
      res.status(429).json({
        success: false,
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((reset - Date.now()) / 1000),
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow the request if rate limiting fails
    // In a highly secure environment, you might want to fail closed instead
    return true;
  }
}
