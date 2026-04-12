interface Bucket {
  tokens: number;
  ts: number;
}

const buckets = new Map<string, Bucket>();
const CAPACITY = 20;
const REFILL_PER_SEC = 10;

export function checkRateLimit(sessionId: string): boolean {
  const now = Date.now();
  const b = buckets.get(sessionId) ?? { tokens: CAPACITY, ts: now };
  const elapsed = (now - b.ts) / 1000;
  b.tokens = Math.min(CAPACITY, b.tokens + elapsed * REFILL_PER_SEC);
  b.ts = now;

  if (b.tokens < 1) {
    buckets.set(sessionId, b);
    return false;
  }

  b.tokens -= 1;
  buckets.set(sessionId, b);
  return true;
}

setInterval(() => {
  const now = Date.now();
  const cutoff = 10 * 60 * 1000;
  for (const [key, bucket] of buckets) {
    if (now - bucket.ts > cutoff) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref();
