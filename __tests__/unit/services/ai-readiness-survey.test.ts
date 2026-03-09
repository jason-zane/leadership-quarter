import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/utils/security/report-access', () => ({
  hasReportAccessTokenSecret: vi.fn().mockReturnValue(true),
  createReportAccessToken: vi.fn().mockReturnValue('report-token'),
}))
vi.mock('@/utils/services/submissions', () => ({
  createInterestSubmission: vi.fn(),
  createSubmissionEvent: vi.fn(),
  linkSubmissionToContact: vi.fn(),
}))
vi.mock('@/utils/services/contacts', () => ({
  upsertContactByEmail: vi.fn(),
  createContactEvent: vi.fn(),
}))
vi.mock('@/utils/assessments/submission-pipeline', () => ({
  submitAssessment: vi.fn(),
}))

import {
  parseAiReadinessSurveyPayload,
  submitAiReadinessOrientationSurvey,
} from '@/utils/services/ai-readiness-survey'
import { submitAssessment } from '@/utils/assessments/submission-pipeline'
import { createReportAccessToken } from '@/utils/security/report-access'
import { createInterestSubmission } from '@/utils/services/submissions'
import { upsertContactByEmail } from '@/utils/services/contacts'
import { createAdminClient } from '@/utils/supabase/admin'

let interestSubmissionUpdateSpy: ReturnType<typeof vi.fn>

function makePayload() {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    workEmail: 'ada@example.com',
    organisation: 'Analytical Engines',
    role: 'Lead',
    consent: true,
    responses: {
      q1: 4,
      q2: 4,
      q3: 4,
      q4: 2,
      q5: 4,
      q6: 4,
      q7: 4,
      q8: 4,
      q9: 4,
      q10: 2,
      q11: 4,
      q12: 4,
      q13: 4,
      q14: 4,
      q15: 4,
      q16: 2,
      q17: 4,
      q18: 4,
    },
  }
}

function makeAdminClientMock() {
  interestSubmissionUpdateSpy = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  })
  return {
    from: vi.fn((table: string) => {
      if (table === 'interest_submissions') {
        return {
          update: interestSubmissionUpdateSpy,
        }
      }
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock() as never)
  vi.mocked(createInterestSubmission).mockResolvedValue({
    data: { id: 'sub-1' },
    error: null,
    missingTable: false,
  })
  vi.mocked(upsertContactByEmail).mockResolvedValue({
    data: { id: 'contact-1' },
    error: null,
    missingTable: false,
  })
  vi.mocked(createReportAccessToken).mockReturnValue('report-token')
})

describe('parseAiReadinessSurveyPayload', () => {
  it('rejects missing consent and invalid email', () => {
    const result = parseAiReadinessSurveyPayload({
      ...makePayload(),
      workEmail: 'not-an-email',
      consent: false,
    })

    expect(result).toEqual({ ok: false, error: 'invalid_fields' })
  })

  it('rejects invalid response values', () => {
    const result = parseAiReadinessSurveyPayload({
      ...makePayload(),
      responses: { ...makePayload().responses, q1: 7 },
    })

    expect(result).toEqual({ ok: false, error: 'invalid_responses' })
  })
})

describe('submitAiReadinessOrientationSurvey', () => {
  it('falls back to local scoring when assessment runtime is not found', async () => {
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: false,
      error: 'assessment_not_found',
    })

    const result = await submitAiReadinessOrientationSurvey({
      payload: makePayload(),
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.submissionId).toBe('sub-1')
      expect(result.data.reportAccessToken).toBe('report-token')
      expect(result.data.result.overallLabel).toBeTypeOf('string')
      expect(result.data.result.recommendations.length).toBeGreaterThan(0)
    }
  })

  it('returns fatal assessment pipeline errors', async () => {
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: false,
      error: 'classification_failed',
    })

    const result = await submitAiReadinessOrientationSurvey({
      payload: makePayload(),
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    })

    expect(result).toEqual({ ok: false, error: 'classification_failed' })
  })

  it('links the interest submission to the created assessment submission when psychometric scoring succeeds', async () => {
    vi.mocked(submitAssessment).mockResolvedValue({
      ok: true,
      data: {
        submissionId: 'assessment-sub-1',
        assessment: {
          id: 'assessment-1',
          key: 'ai_readiness_orientation_v1',
          name: 'AI Readiness Orientation Survey',
        },
        normalizedResponses: makePayload().responses,
        scores: {
          openness: 4.1,
          riskPosture: 3.4,
          capability: 3.9,
        },
        bands: {
          openness: 'Conditional Adopter',
          riskPosture: 'Moderate Awareness',
          capability: 'Developing',
        },
        classification: {
          key: 'developing_operator',
          label: 'Developing Operator',
        },
        recommendations: ['Focus on guided practice.'],
      },
    })

    const result = await submitAiReadinessOrientationSurvey({
      payload: makePayload(),
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    })

    expect(result.ok).toBe(true)
    expect(interestSubmissionUpdateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        assessment_submission_id: 'assessment-sub-1',
      })
    )
  })
})
