/**
 * Simple in-memory rate limiter for API endpoints.
 * Tracks request counts per IP address within a sliding window.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if a request should be rate-limited.
 * Returns null if allowed, or a NextResponse with 429 status if blocked.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: true; remaining: number } | { allowed: false; retryAfterMs: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // New window
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

/**
 * Get client IP from request headers.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}
