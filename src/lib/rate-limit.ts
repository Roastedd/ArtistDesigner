// Simple in-memory rate limiter. Per-process, per-user.
// Suitable for single-instance deploys; for multi-instance use Redis/Upstash.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    const reset = now + windowMs;
    buckets.set(key, { count: 1, resetAt: reset });
    return { ok: true, remaining: limit - 1, resetAt: reset };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }
  b.count += 1;
  return { ok: true, remaining: limit - b.count, resetAt: b.resetAt };
}
