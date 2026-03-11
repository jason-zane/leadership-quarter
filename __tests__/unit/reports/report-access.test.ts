import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  createReportAccessToken,
  verifyReportAccessToken,
} from '@/utils/security/report-access'

describe('report access tokens', () => {
  const originalSecret = process.env.REPORT_ACCESS_TOKEN_SECRET

  beforeEach(() => {
    process.env.REPORT_ACCESS_TOKEN_SECRET = 'test-secret'
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-11T00:00:00.000Z'))
  })

  afterEach(() => {
    process.env.REPORT_ACCESS_TOKEN_SECRET = originalSecret
    vi.useRealTimers()
  })

  it('round-trips selection-aware assessment tokens', () => {
    const token = createReportAccessToken({
      report: 'assessment',
      submissionId: 'submission-1',
      selectionMode: 'latest_variant',
      reportVariantId: 'variant-1',
      expiresInSeconds: 60,
    })

    expect(token).toBeTruthy()
    expect(verifyReportAccessToken(String(token), 'assessment')).toEqual({
      report: 'assessment',
      submissionId: 'submission-1',
      selectionMode: 'latest_variant',
      reportVariantId: 'variant-1',
      exp: Math.floor(Date.now() / 1000) + 60,
    })
  })

  it('keeps legacy tokens compatible when no selection metadata is present', () => {
    const token = createReportAccessToken({
      report: 'assessment',
      submissionId: 'submission-2',
      expiresInSeconds: 60,
    })

    expect(verifyReportAccessToken(String(token), 'assessment')).toEqual({
      report: 'assessment',
      submissionId: 'submission-2',
      selectionMode: null,
      reportVariantId: null,
      exp: Math.floor(Date.now() / 1000) + 60,
    })
  })
})
