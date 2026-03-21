import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { logOperationalAlert, logRateLimitEvent } from '@/utils/logger'
import { getPlatformSettingSync } from '@/utils/services/platform-settings'

const DEFAULT_PREFIX = 'lq:rl'
const PRODUCTION_MISSING_REDIS_MESSAGE =
  '[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limiting is disabled in production.'
const DEVELOPMENT_MISSING_REDIS_MESSAGE =
  '[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — rate limiting is disabled.'
const PRODUCTION_UNAVAILABLE_REDIS_MESSAGE =
  '[rate-limit] Upstash Redis is unreachable or invalid — rate limiting is disabled in production.'
const DEVELOPMENT_UNAVAILABLE_REDIS_MESSAGE =
  '[rate-limit] Upstash Redis is unreachable or invalid — rate limiting is disabled.'

const PUBLIC_READ_API_PREFIXES = [
  '/api/assessments/public/',
  '/api/assessments/runtime/public/',
  '/api/assessments/campaigns/',
  '/api/assessments/runtime/campaign/',
  '/api/assessments/invitation/',
  '/api/assessments/runtime/invitation/',
  '/api/assessments/contact-gate/',
  '/api/assessments/runtime/site-cta/',
  '/api/reports/export/',
  '/api/reports/assessment/pdf',
  '/api/reports/lq8/pdf',
  '/api/reports/ai/pdf',
  '/api/reports/ai_survey/pdf',
]

const PUBLIC_WRITE_API_PREFIXES = [
  '/api/inquiry',
  '/api/reports/export',
  '/api/reports/assessment/email',
  '/api/reports/ai_survey/email',
  '/api/reports/ai-readiness/request-download',
  '/api/reports/lq8/request-download',
  '/api/assessments/ai-readiness/submit',
  '/api/assessments/public/',
  '/api/assessments/campaigns/',
  '/api/assessments/invitation/',
  '/api/assessments/contact-gate/',
]

type RequestLike = Pick<Request, 'headers' | 'method' | 'url'> & {
  nextUrl?: Pick<URL, 'pathname'>
}

type RequestHeadersLike = Pick<Request, 'headers' | 'method'>

export type RateLimitResult = {
  allowed: boolean
  limit: number
  remaining: number
  reset: number
  retryAfterSeconds?: number
  pending?: Promise<unknown>
}

export type PublicRateLimitBucket =
  | 'bypass'
  | 'public-page'
  | 'public-read-api'
  | 'public-write-api'

export type PublicRateLimitConfig = {
  bucket: Exclude<PublicRateLimitBucket, 'bypass'>
  limit: number
  windowSeconds: number
}

let redis: Redis | null = null
let warnedMissingRedis = false
let warnedUnavailableRedis = false
const ratelimitCache = new Map<string, Ratelimit>()

function isPlaceholderValue(value: string | undefined) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return true
  return (
    normalized.startsWith('replace_with_') ||
    normalized.startsWith('your_') ||
    normalized.startsWith('your-') ||
    normalized.includes('placeholder')
  )
}

function warnRedisUnavailable(errorMessage?: string) {
  if (warnedUnavailableRedis) return

  if (process.env.NODE_ENV === 'production') {
    logOperationalAlert({
      component: 'rate_limit',
      code: 'rate_limit_degraded',
      message: PRODUCTION_UNAVAILABLE_REDIS_MESSAGE,
      details: {
        mode: 'fail_open',
        ...(errorMessage ? { error: errorMessage } : {}),
      },
    })
  } else {
    console.warn(DEVELOPMENT_UNAVAILABLE_REDIS_MESSAGE)
  }

  warnedUnavailableRedis = true
}

function getRedis(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()

  if (!url || !token || isPlaceholderValue(url) || isPlaceholderValue(token)) {
    if (!warnedMissingRedis) {
      if (process.env.NODE_ENV === 'production') {
        logOperationalAlert({
          component: 'rate_limit',
          code: 'rate_limit_degraded',
          message: PRODUCTION_MISSING_REDIS_MESSAGE,
          details: {
            missingEnv: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
            mode: 'fail_open',
          },
        })
      } else {
        console.warn(DEVELOPMENT_MISSING_REDIS_MESSAGE)
      }
      warnedMissingRedis = true
    }

    return null
  }

  try {
    new URL(url)
  } catch {
    warnRedisUnavailable('invalid_upstash_rest_url')
    return null
  }

  redis = new Redis({ url, token })
  return redis
}

function getRatelimit(limit: number, windowSeconds: number, prefix = DEFAULT_PREFIX) {
  const redisClient = getRedis()
  if (!redisClient) return null

  const cacheKey = `${prefix}:${limit}:${windowSeconds}`
  const cached = ratelimitCache.get(cacheKey)
  if (cached) return cached

  const ratelimit = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix,
  })
  ratelimitCache.set(cacheKey, ratelimit)
  return ratelimit
}

function resolvePathname(request: RequestLike) {
  return request.nextUrl?.pathname ?? new URL(request.url).pathname
}

export function getClientIp(request: Pick<Request, 'headers'>) {
  // On Vercel, x-real-ip is set by the edge and cannot be spoofed by clients.
  // Prefer it over x-forwarded-for to prevent IP spoofing via header injection.
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  return 'unknown'
}

export function getRequestHost(request: Pick<Request, 'headers'>) {
  return request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? undefined
}

export function getRequestTraceId(request: Pick<Request, 'headers'>) {
  return request.headers.get('x-vercel-id') ?? request.headers.get('x-request-id') ?? undefined
}

export function getRateLimitHeaders(result: Pick<RateLimitResult, 'retryAfterSeconds'>) {
  const headers = new Headers()
  if (result.retryAfterSeconds) {
    headers.set('Retry-After', String(result.retryAfterSeconds))
  }
  return headers
}

export function logRateLimitExceededForRequest(input: {
  request: RequestHeadersLike
  route: string
  scope: 'public' | 'authenticated'
  bucket: string
  identifierType: 'ip' | 'user' | 'token'
  identifier: string
  result: Pick<RateLimitResult, 'limit' | 'remaining' | 'retryAfterSeconds'>
  source?: 'proxy' | 'route'
}) {
  logRateLimitEvent({
    source: input.source ?? 'route',
    scope: input.scope,
    route: input.route,
    method: input.request.method,
    bucket: input.bucket,
    identifierType: input.identifierType,
    identifier: input.identifier,
    limit: input.result.limit,
    remaining: input.result.remaining,
    retryAfterSeconds: input.result.retryAfterSeconds,
    host: getRequestHost(input.request),
    traceId: getRequestTraceId(input.request),
  })
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
  options?: { prefix?: string }
): Promise<RateLimitResult> {
  const ratelimit = getRatelimit(limit, windowSeconds, options?.prefix)
  if (!ratelimit) {
    return {
      allowed: true,
      limit,
      remaining: limit,
      reset: Date.now() + windowSeconds * 1000,
    }
  }

  try {
    const result = await ratelimit.limit(key)
    const retryAfterSeconds = result.success
      ? undefined
      : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))

    return {
      allowed: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfterSeconds,
      pending: result.pending,
    }
  } catch (error) {
    warnRedisUnavailable(error instanceof Error ? error.message : 'unknown_rate_limit_error')

    return {
      allowed: true,
      limit,
      remaining: limit,
      reset: Date.now() + windowSeconds * 1000,
    }
  }
}

export function classifyPublicRequest(request: RequestLike): PublicRateLimitBucket {
  const pathname = resolvePathname(request)
  const method = request.method.toUpperCase()

  if (method === 'OPTIONS') return 'bypass'
  if (pathname === '/api/csp-report' || pathname.startsWith('/api/cron/')) return 'bypass'

  if (pathname.startsWith('/api/')) {
    if (method === 'GET' || method === 'HEAD') {
      return PUBLIC_READ_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
        ? 'public-read-api'
        : 'bypass'
    }

    return PUBLIC_WRITE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
      ? 'public-write-api'
      : 'bypass'
  }

  return method === 'GET' || method === 'HEAD' ? 'public-page' : 'bypass'
}

export function getPublicRateLimitConfig(request: RequestLike): PublicRateLimitConfig | null {
  const bucket = classifyPublicRequest(request)

  switch (bucket) {
    case 'public-page':
      return { bucket, limit: getPlatformSettingSync<number>('rate_limits', 'public_page_rpm'), windowSeconds: 60 }
    case 'public-read-api':
      return { bucket, limit: getPlatformSettingSync<number>('rate_limits', 'public_read_api_rpm'), windowSeconds: 60 }
    case 'public-write-api':
      return { bucket, limit: getPlatformSettingSync<number>('rate_limits', 'public_write_api_rpm'), windowSeconds: 60 }
    default:
      return null
  }
}
