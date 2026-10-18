/**
 * src/lib/security/rate-limiter.ts
 *
 * PRD-02 :: Rate Limiter & Abuse Prevention.
 * Sliding window rate limiter for sensitive authentication and AI-triggering endpoints.
 * Note: Uses an in-memory store suitable for single-instance / local deployments.
 * For distributed multi-region deployments, swap with Redis/Upstash adapter.
 * All comments use Roman English or Roman Urdu.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitRecord>();

export interface RateLimitConfig {
  /** Maximum number of allowed requests in the window */
  maxRequests: number;
  /** Sliding window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Checks rate limit for a specific key (IP address or User ID).
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  let record = memoryStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(key, record);
  }

  // Remove timestamps outside the active sliding window
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= config.maxRequests) {
    const oldest = record.timestamps[0];
    const resetAt = oldest + config.windowMs;
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetAt,
    };
  }

  // Record this request
  record.timestamps.push(now);

  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - record.timestamps.length,
    resetAt: now + config.windowMs,
  };
}

// ----------------------------------------------------------------------------
// Preset Configurations for Different Endpoints
// ----------------------------------------------------------------------------

/** Auth sensitive actions (login / register): 10 attempts per minute */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 1000,
};

/** AI analysis endpoint (/api/complaints/[id]/analyze): 5 calls per minute per user */
export const AI_ANALYSIS_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60 * 1000,
};

/** Complaint creation: 10 complaints per 10 minutes */
export const COMPLAINT_SUBMISSION_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 10 * 60 * 1000,
};
