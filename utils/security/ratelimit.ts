import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

const limiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'miles-between',
    })
  : null

export type RateLimitResult =
  | { ok: true; remaining?: number; reset?: number }
  | { ok: false; remaining?: number; reset?: number }

export async function checkRateLimit(key: string): Promise<RateLimitResult> {
  if (!limiter) {
    return { ok: true }
  }

  const result = await limiter.limit(key)
  return { ok: result.success, remaining: result.remaining, reset: result.reset }
}
