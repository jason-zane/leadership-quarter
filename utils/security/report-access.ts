import crypto from 'node:crypto'
import type { ReportSelectionMode } from '@/utils/reports/report-variants'

export type ReportAccessKind = 'lq8' | 'ai' | 'ai_survey' | 'assessment' | 'assessment_v2'

type ReportAccessPayload = {
  report: ReportAccessKind
  submissionId: string
  selectionMode?: ReportSelectionMode
  reportVariantId?: string | null
  exp: number
}

export type VerifiedReportAccessPayload = {
  report: ReportAccessKind
  submissionId: string
  selectionMode: ReportSelectionMode | null
  reportVariantId: string | null
  exp: number
}

type GateAccessPayload = {
  submissionId: string
  campaignId: string
  assessmentId: string
  exp: number
}

function getSecret() {
  return process.env.REPORT_ACCESS_TOKEN_SECRET?.trim() || null
}

function getGateSecret() {
  return process.env.ASSESSMENT_GATE_TOKEN_SECRET?.trim() || null
}

export function hasReportAccessTokenSecret() {
  return Boolean(process.env.REPORT_ACCESS_TOKEN_SECRET?.trim())
}

export function hasGateAccessTokenSecret() {
  return Boolean(process.env.ASSESSMENT_GATE_TOKEN_SECRET?.trim())
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
  selectionMode?: ReportSelectionMode | null
  reportVariantId?: string | null
  expiresInSeconds?: number
}) {
  const secret = getSecret()
  if (!secret) return null

  const now = Math.floor(Date.now() / 1000)
  const payload: ReportAccessPayload = {
    report: input.report,
    submissionId: input.submissionId,
    ...(input.selectionMode ? { selectionMode: input.selectionMode } : {}),
    ...(input.reportVariantId?.trim() ? { reportVariantId: input.reportVariantId.trim() } : {}),
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

    const selectionMode =
      payload.selectionMode === 'frozen_default'
      || payload.selectionMode === 'latest_variant'
      || payload.selectionMode === 'latest_campaign_default'
        ? payload.selectionMode
        : null
    const reportVariantId = typeof payload.reportVariantId === 'string' && payload.reportVariantId.trim()
      ? payload.reportVariantId.trim()
      : null

    if (selectionMode === 'latest_variant' && !reportVariantId) {
      return null
    }

    return {
      report: payload.report,
      submissionId: payload.submissionId,
      selectionMode,
      reportVariantId,
      exp: payload.exp,
    } satisfies VerifiedReportAccessPayload
  } catch {
    return null
  }
}

export function createGateAccessToken(input: {
  submissionId: string
  campaignId: string
  assessmentId: string
  expiresInSeconds?: number
}) {
  const secret = getGateSecret()
  if (!secret) return null

  const now = Math.floor(Date.now() / 1000)
  const payload: GateAccessPayload = {
    submissionId: input.submissionId,
    campaignId: input.campaignId,
    assessmentId: input.assessmentId,
    exp: now + (input.expiresInSeconds ?? 24 * 60 * 60),
  }

  const payloadBase64 = toBase64Url(JSON.stringify(payload))
  const signature = sign(payloadBase64, secret)
  return `${payloadBase64}.${signature}`
}

export function verifyGateAccessToken(token: string) {
  const secret = getGateSecret()
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
    const payload = JSON.parse(fromBase64Url(payloadBase64)) as GateAccessPayload
    const now = Math.floor(Date.now() / 1000)
    if (!payload?.submissionId || !payload.campaignId || !payload.assessmentId || now >= payload.exp) {
      return null
    }
    return payload
  } catch {
    return null
  }
}
