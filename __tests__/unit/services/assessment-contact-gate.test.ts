import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/utils/security/report-access', () => ({
  verifyGateAccessToken: vi.fn(),
  hasReportAccessTokenSecret: vi.fn().mockReturnValue(true),
  createReportAccessToken: vi.fn().mockReturnValue('report-token'),
}))
vi.mock('@/utils/services/contacts', () => ({
  upsertContactByEmail: vi.fn(),
  createContactEvent: vi.fn(),
}))

import {
  getAssessmentContactGate,
  unlockAssessmentContactGate,
} from '@/utils/services/assessment-contact-gate'
import {
  createReportAccessToken,
  hasReportAccessTokenSecret,
  verifyGateAccessToken,
} from '@/utils/security/report-access'
import { createContactEvent, upsertContactByEmail } from '@/utils/services/contacts'
import { createAdminClient } from '@/utils/supabase/admin'

function makeAdminClientMock(options?: {
  submission?: unknown
  submissionError?: unknown
  updateError?: unknown
}) {
  const submissionQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: options?.submission ?? null,
      error: options?.submissionError ?? null,
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: options?.updateError ?? null }),
    }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'assessment_submissions') return submissionQuery
      return {}
    }),
  }
}

function makeSubmissionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub-1',
    campaign_id: 'camp-1',
    assessment_id: 'assess-1',
    campaigns: { name: 'Pilot' },
    assessments: { name: 'AI Readiness' },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(verifyGateAccessToken).mockReturnValue({
    submissionId: 'sub-1',
    campaignId: 'camp-1',
    assessmentId: 'assess-1',
    exp: 9999999999,
  })
  vi.mocked(hasReportAccessTokenSecret).mockReturnValue(true)
  vi.mocked(createReportAccessToken).mockReturnValue('report-token')
  vi.mocked(upsertContactByEmail).mockResolvedValue({
    data: { id: 'contact-1' },
    error: null,
    missingTable: false,
  })
  vi.mocked(createContactEvent).mockResolvedValue({
    error: null,
    missingTable: false,
  })
})

describe('assessment contact gate services', () => {
  it('returns gate_expired when the gate token is invalid', async () => {
    vi.mocked(createAdminClient).mockReturnValue(makeAdminClientMock() as never)
    vi.mocked(verifyGateAccessToken).mockReturnValue(null)

    const result = await getAssessmentContactGate({ token: 'bad-token' })

    expect(result).toEqual({ ok: false, error: 'gate_expired' })
  })

  it('returns context data for a valid gate token', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({ submission: makeSubmissionRow() }) as never
    )

    const result = await getAssessmentContactGate({ token: 'gate-token' })

    expect(result).toEqual({
      ok: true,
      data: {
        context: {
          campaignName: 'Pilot',
          assessmentName: 'AI Readiness',
        },
      },
    })
  })

  it('returns invalid_fields for incomplete unlock input', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({ submission: makeSubmissionRow() }) as never
    )

    const result = await unlockAssessmentContactGate({
      token: 'gate-token',
      payload: {
        firstName: '',
      },
    })

    expect(result).toEqual({ ok: false, error: 'invalid_fields' })
  })

  it('returns gate_invalid when the submission does not match the gate payload', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({
        submission: makeSubmissionRow({ campaign_id: 'camp-2' }),
      }) as never
    )

    const result = await unlockAssessmentContactGate({
      token: 'gate-token',
      payload: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        workEmail: 'ada@example.com',
        organisation: 'Analytical Engines',
        role: 'Lead',
        consent: true,
      },
    })

    expect(result).toEqual({ ok: false, error: 'gate_invalid' })
  })

  it('returns report access data for a successful unlock', async () => {
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClientMock({ submission: makeSubmissionRow() }) as never
    )

    const result = await unlockAssessmentContactGate({
      token: 'gate-token',
      payload: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        workEmail: 'ada@example.com',
        organisation: 'Analytical Engines',
        role: 'Lead',
        consent: true,
      },
    })

    expect(result).toEqual({
      ok: true,
      data: {
        reportPath: '/assess/r/assessment',
        reportAccessToken: 'report-token',
      },
    })
  })
})
