import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))
vi.mock('@/utils/reports/assessment-report', () => ({
  getAssessmentReportData: vi.fn(),
  getAssessmentReportRecipientEmail: vi.fn(),
}))
vi.mock('@/utils/security/report-access', () => ({
  verifyReportAccessToken: vi.fn(),
}))
vi.mock('@/utils/services/email-jobs', () => ({
  enqueueAssessmentReportEmailJob: vi.fn(),
}))

import {
  queueAssessmentReportEmail,
  resolveAssessmentReportEmailAccess,
} from '@/utils/services/assessment-report-email'
import {
  getAssessmentReportData,
  getAssessmentReportRecipientEmail,
} from '@/utils/reports/assessment-report'
import { verifyReportAccessToken } from '@/utils/security/report-access'
import { enqueueAssessmentReportEmailJob } from '@/utils/services/email-jobs'
import { createAdminClient } from '@/utils/supabase/admin'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('assessment report email services', () => {
  it('returns invalid_access when the report token is invalid', () => {
    vi.mocked(verifyReportAccessToken).mockReturnValue(null)

    const result = resolveAssessmentReportEmailAccess('bad-token')

    expect(result).toEqual({
      ok: false,
      error: 'invalid_access',
      message: 'This report link is no longer valid.',
    })
  })

  it('returns the submission id when the report token is valid', () => {
    vi.mocked(verifyReportAccessToken).mockReturnValue({
      report: 'assessment',
      submissionId: 'sub-1',
      exp: 9999999999,
    })

    const result = resolveAssessmentReportEmailAccess('good-token')

    expect(result).toEqual({ ok: true, submissionId: 'sub-1' })
  })

  it('returns report_not_found when the report cannot be loaded', async () => {
    vi.mocked(createAdminClient).mockReturnValue({} as never)
    vi.mocked(getAssessmentReportData).mockResolvedValue(null)

    const result = await queueAssessmentReportEmail({ submissionId: 'sub-1' })

    expect(result).toEqual({
      ok: false,
      error: 'report_not_found',
      message: 'We could not load this report.',
    })
  })

  it('returns missing_recipient_email when no email is available', async () => {
    vi.mocked(createAdminClient).mockReturnValue({} as never)
    vi.mocked(getAssessmentReportData).mockResolvedValue({ submissionId: 'sub-1' } as never)
    vi.mocked(getAssessmentReportRecipientEmail).mockReturnValue(null)

    const result = await queueAssessmentReportEmail({ submissionId: 'sub-1' })

    expect(result).toEqual({
      ok: false,
      error: 'missing_recipient_email',
      message: 'No email address is available for this report.',
    })
  })

  it('returns a queued message when the email job is enqueued', async () => {
    vi.mocked(createAdminClient).mockReturnValue({} as never)
    vi.mocked(getAssessmentReportData).mockResolvedValue({ submissionId: 'sub-1' } as never)
    vi.mocked(getAssessmentReportRecipientEmail).mockReturnValue('ada@example.com')
    vi.mocked(enqueueAssessmentReportEmailJob).mockResolvedValue({ error: null })

    const result = await queueAssessmentReportEmail({ submissionId: 'sub-1' })

    expect(result).toEqual({
      ok: true,
      data: {
        message: 'Report link email queued for ada@example.com.',
      },
    })
  })
})
