import crypto from 'node:crypto'

export type ReportAccessKind = 'lq8' | 'ai' | 'ai_survey'

type ReportAccessPayload = {
  report: ReportAccessKind
  submissionId: string
  exp: number
}

function getSecret() {
  return process.env.REPORT_ACCESS_TOKEN_SECRET?.trim() || process.env.CRON_SECRET?.trim() || null
}

export function hasReportAccessTokenSecret() {
  return Boolean(process.env.REPORT_ACCESS_TOKEN_SECRET?.trim() || process.env.CRON_SECRET?.trim())
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8')
}

function sign(payloadBase64: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url')
}

export function createReportAccessToken(input: {
  report: ReportAccessKind
  submissionId: string
  expiresInSeconds?: number
}) {
  const secret = getSecret()
  if (!secret) return null

  const now = Math.floor(Date.now() / 1000)
  const payload: ReportAccessPayload = {
    report: input.report,
    submissionId: input.submissionId,
    exp: now + (input.expiresInSeconds ?? 30 * 60),
  }

  const payloadBase64 = toBase64Url(JSON.stringify(payload))
  const signature = sign(payloadBase64, secret)
  return `${payloadBase64}.${signature}`
}

export function verifyReportAccessToken(token: string, expectedReport: ReportAccessKind) {
  const secret = getSecret()
  if (!secret) return null

  const [payloadBase64, signature] = token.split('.')
  if (!payloadBase64 || !signature) return null

  const expectedSignature = sign(payloadBase64, secret)
  const provided = Buffer.from(signature)
  const expected = Buffer.from(expectedSignature)
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(payloadBase64)) as ReportAccessPayload
    const now = Math.floor(Date.now() / 1000)
    if (!payload?.submissionId || payload.report !== expectedReport || now >= payload.exp) {
      return null
    }
    return payload
  } catch {
    return null
  }
}
