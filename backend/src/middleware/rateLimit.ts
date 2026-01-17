import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for authentication endpoints
 * Prevents brute force attacks on login/register
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: {
    error: 'Too many authentication attempts, please try again later',
    retryAfter: 900 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for content generation
 * Prevents abuse of the AI generation API
 */
export const contentGenerationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1, // 1 request per minute
  message: {
    error: 'Content generation rate limit exceeded. Please wait before generating again.',
    retryAfter: 60 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for general API requests
 * Prevents general API abuse
 */
export const generalApiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests, please try again later',
    retryAfter: 900 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for photo uploads
 * Prevents storage abuse
 */
export const photoUploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 uploads per hour
  message: {
    error: 'Photo upload rate limit exceeded. Please try again later.',
    retryAfter: 3600 // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});
