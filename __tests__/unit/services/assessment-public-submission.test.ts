import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/utils/assessments/submission-pipeline', () => ({ submitAssessment: vi.fn() }))
vi.mock('@/utils/security/report-access', () => ({
  hasReportAccessTokenSecret: vi.fn().mockReturnValue(true),
  createReportAccessToken: vi.fn().mockReturnValue('report-token'),
}))

import { submitPublicAssessment } from '@/utils/services/assessment-public-submission'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import {
  createReportAccessToken,
  hasReportAccessTokenSecret,
} from '@/utils/security/report-access'
import { createAdminClient } from '@/utils/supabase/admin'

function makeAdminClientMock() {
  return {}
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(hasReportAccessTokenSecret).mockReturnValue(true)
  vi.mocked(createReportAccessToken).mockReturnValue('report-token')
})

describe('submitPublicAssessment', () => {
  it('returns a configuration error when the admin client is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(null as never)

    const result = await submitPublicAssessment({
      assessmentKey: 'ai-readiness',
      payload: { responses: { q1: 3 } },
    })

    expect(result).toEqual({ ok: false, error: 'missing_service_role' })
  })

  it('rejects invalid payloads', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock() as never)

    const result = await submitPublicAssessment({
      assessmentKey: 'ai-readiness',
      payload: {},
    })

    expect(result).toEqual({ ok: false, error: 'invalid_payload' })
  })

  it('returns a configuration error when the report secret is missing', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock() as never)
    vi.mocked(hasReportAccessTokenSecret).mockReturnValue(false)

    const result = await submitPublicAssessment({
      assessmentKey: 'ai-readiness',
      payload: { responses: { q1: 3 } },
    })

    expect(result).toEqual({ ok: false, error: 'missing_report_secret' })
  })

  it('propagates submission pipeline errors', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock() as never)
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: false,
      error: 'invalid_responses',
    })

    const result = await submitPublicAssessment({
      assessmentKey: 'ai-readiness',
      payload: { responses: { q1: 9 } },
    })

    expect(result).toEqual({ ok: false, error: 'invalid_responses' })
  })

  it('returns the submission payload with a report token', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock() as never)
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: true,
      data: {
        submissionId: 'sub-1',
        assessment: { id: 'assess-1', key: 'ai-readiness', name: 'AI Readiness' },
        normalizedResponses: {},
        scores: {},
        bands: {},
        classification: null,
        recommendations: [],
      },
    })

    const result = await submitPublicAssessment({
      assessmentKey: 'ai-readiness',
      payload: { responses: { q1: 3 } },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        submissionId: 'sub-1',
        reportPath: '/assess/r/assessment',
        reportAccessToken: 'report-token',
      },
    })
  })
})
