/**
 * In-memory sliding window rate limiter.
 *
 * Suitable for single-process deployments (local dev, single-instance hosting).
 * For multi-instance deployments, replace the Map with a Redis-backed store.
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Prune expired entries every 5 minutes to prevent unbounded memory growth.
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, win] of store) {
      if (now > win.resetAt) store.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms
}

/**
 * @param key        Unique key per (action, identifier) e.g. "auth:login:1.2.3.4"
 * @param max        Max requests allowed in the window
 * @param windowMs   Window duration in milliseconds
 */
export function checkRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now > existing.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: max - 1, resetAt };
  }

  if (existing.count >= max) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { allowed: true, remaining: max - existing.count, resetAt: existing.resetAt };
}

/** Extract the best available client IP from a Next.js request. */
export function getClientIp(req: Request): string {
  return (
    (req.headers.get('x-forwarded-for') ?? '').split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}
