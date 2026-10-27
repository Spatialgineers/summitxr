import type { Request, Response, NextFunction } from 'express';

/** Minimal in-memory token bucket (no deps). One bucket per key. */
export class TokenBucket {
  private tokens: number;
  private last: number;

  constructor(private capacity: number, private refillPerSec: number) {
    this.tokens = capacity;
    this.last = Date.now();
  }

  take(cost = 1): boolean {
    const now = Date.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((now - this.last) / 1000) * this.refillPerSec);
    this.last = now;
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }

  isFull(): boolean {
    const now = Date.now();
    return this.tokens + ((now - this.last) / 1000) * this.refillPerSec >= this.capacity;
  }
}

/**
 * Per-IP REST limiter. Budgets are generous because a whole venue can sit
 * behind one Wi-Fi NAT address; this stops scripted floods, not attendees.
 */
export function ipRateLimit(opts: { capacity: number; refillPerSec: number; maxKeys?: number }) {
  const buckets = new Map<string, TokenBucket>();
  const maxKeys = opts.maxKeys ?? 20_000;

  const sweep = setInterval(() => {
    for (const [k, b] of buckets) if (b.isFull()) buckets.delete(k);
  }, 60_000);
  sweep.unref?.();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= maxKeys) buckets.clear();
      bucket = new TokenBucket(opts.capacity, opts.refillPerSec);
      buckets.set(key, bucket);
    }
    if (!bucket.take()) {
      res.setHeader('Retry-After', '5');
      res.status(429).json({ error: 'RATE_LIMITED' });
      return;
    }
    next();
  };
}
