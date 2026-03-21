type LogLevel = 'info' | 'warn' | 'error'

function hashIdentifier(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function writeLog(level: LogLevel, payload: Record<string, unknown>) {
  const entry = JSON.stringify({ ...payload, level, ts: Date.now() })

  if (level === 'error') {
    console.error(entry)
    return
  }

  if (level === 'warn') {
    console.warn(entry)
    return
  }

  console.log(entry)
}

export function logRequest(meta: {
  route: string
  status: number
  durationMs: number
  traceId?: string
  assessmentId?: string
  invitationId?: string
  error?: string
}) {
  writeLog('info', { type: 'request', ...meta })
}

export function logRateLimitEvent(meta: {
  source: 'proxy' | 'route'
  scope: 'public' | 'authenticated'
  route: string
  method: string
  bucket: string
  identifierType: 'ip' | 'user' | 'token'
  identifier: string
  limit: number
  remaining: number
  retryAfterSeconds?: number
  host?: string
  traceId?: string
  status?: number
}) {
  const { identifier, ...rest } = meta
  writeLog('warn', {
    type: 'rate_limit',
    status: meta.status ?? 429,
    identifierHash: hashIdentifier(identifier),
    ...rest,
  })
}

export function logOperationalAlert(meta: {
  component: string
  code: string
  message: string
  details?: Record<string, unknown>
}) {
  writeLog('error', {
    type: 'operational_alert',
    ...meta,
  })
}

export function logBackgroundJobRun(meta: {
  job: 'email_jobs' | 'psychometric_analysis_runs'
  route: string
  fetched: number
  processed: number
  failed: number
  skipped: number
  pendingCount: number
  oldestPendingAgeSeconds: number | null
}) {
  writeLog('info', {
    type: 'background_job_run',
    ...meta,
  })
}
