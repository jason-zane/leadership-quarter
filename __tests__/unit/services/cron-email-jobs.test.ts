import { beforeEach, describe, expect, it, vi } from 'vitest'

const resendSendMock = vi.fn()

vi.mock('resend', () => ({
  Resend: class {
    emails = { send: resendSendMock }
  },
}))
vi.mock('@/utils/services/email-templates', () => ({
  getRuntimeEmailTemplates: vi.fn(),
}))
vi.mock('@/utils/email-templates', () => ({
  renderTemplate: vi.fn(),
}))
vi.mock('@/utils/assessments/email', () => ({
  sendSurveyCompletionEmail: vi.fn(),
  sendAssessmentReportEmail: vi.fn(),
}))
vi.mock('@/utils/reports/assessment-report', () => ({
  getAssessmentReportData: vi.fn(),
}))
vi.mock('@/utils/reports/report-variants', () => ({
  resolveSubmissionReportSelection: vi.fn(),
}))
vi.mock('@/utils/security/report-access', () => ({
  createReportAccessToken: vi.fn(),
}))
vi.mock('@/utils/hosts', () => ({
  getPublicBaseUrl: vi.fn(() => 'https://example.com'),
}))

import { runPendingEmailJobs } from '@/utils/services/cron-email-jobs'
import { sendAssessmentReportEmail, sendSurveyCompletionEmail } from '@/utils/assessments/email'
import { renderTemplate } from '@/utils/email-templates'
import { getRuntimeEmailTemplates } from '@/utils/services/email-templates'
import { getAssessmentReportData } from '@/utils/reports/assessment-report'
import { resolveSubmissionReportSelection } from '@/utils/reports/report-variants'
import { createReportAccessToken } from '@/utils/security/report-access'

function createEmailJobsTable(rows: unknown[] = []) {
  const selectChain = {
    eq: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }

  const claimChain = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'claimed' } }),
  }

  const update = vi
    .fn()
    .mockImplementationOnce(() => claimChain)
    .mockImplementation(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }))

  return {
    select: vi.fn().mockReturnValue(selectChain),
    update,
  }
}

function createAdminClientMock(rows: unknown[] = []) {
  const emailJobsTable = createEmailJobsTable(rows)
  const submissionMetaQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { report_token: null },
      error: null,
    }),
  }
  return {
    from: vi.fn((table: string) => {
      if (table === 'email_jobs') return emailJobsTable
      if (table === 'assessment_submissions') return submissionMetaQuery
      return {}
    }),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.RESEND_API_KEY = 'resend-key'
  process.env.RESEND_FROM_EMAIL = 'hello@example.com'
  delete process.env.RESEND_REPLY_TO
  vi.mocked(getRuntimeEmailTemplates).mockResolvedValue({
    interest_internal_notification: { subject: '', html: '', text: '' },
    interest_user_confirmation: { subject: '', html: '', text: '' },
    inquiry_internal_notification: { subject: '', html: '', text: '' },
    inquiry_user_confirmation: { subject: '', html: '', text: '' },
    lq8_report_internal_notification: { subject: '', html: '', text: '' },
    lq8_report_user_confirmation: { subject: '', html: '', text: '' },
    ai_readiness_report_internal_notification: { subject: '', html: '', text: '' },
    ai_readiness_report_user_confirmation: { subject: '', html: '', text: '' },
    portal_support_internal_notification: { subject: '', html: '', text: '' },
    portal_support_user_confirmation: { subject: '', html: '', text: '' },
    survey_invitation: { subject: '', html: '', text: '' },
    survey_completion_confirmation: { subject: '', html: '', text: '' },
  } as never)
  vi.mocked(renderTemplate).mockReturnValue({
    subject: 'Subject',
    html: '<p>Hello</p>',
    text: 'Hello',
  })
  resendSendMock.mockResolvedValue({ error: null })
  vi.mocked(sendSurveyCompletionEmail).mockResolvedValue({ ok: true })
  vi.mocked(sendAssessmentReportEmail).mockResolvedValue({ ok: true })
  vi.mocked(resolveSubmissionReportSelection).mockResolvedValue(null)
  vi.mocked(getAssessmentReportData).mockResolvedValue({
    submissionId: 'sub-1',
    assessment: { id: 'a-1', key: 'assess', name: 'Assessment' },
    participant: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      organisation: 'Org',
      role: 'Lead',
      status: 'completed',
      completedAt: '',
      createdAt: '',
    },
    scores: {},
    bands: {},
    classification: { key: 'leader', label: 'Leader', description: null },
    dimensions: [],
    recommendations: [],
    reportConfig: { sections: [] },
  } as never)
  vi.mocked(createReportAccessToken).mockReturnValue('report-token')
})

describe('runPendingEmailJobs', () => {
  it('returns email_not_configured when env is missing', async () => {
    delete process.env.RESEND_API_KEY

    const result = await runPendingEmailJobs({
      adminClient: createAdminClientMock() as never,
    })

    expect(result).toEqual({ ok: false, error: 'email_not_configured' })
  })

  it('processes templated email jobs successfully', async () => {
    const result = await runPendingEmailJobs({
      adminClient: createAdminClientMock([
        {
          id: 'job-1',
          job_type: 'templated_email',
          payload: {
            to: 'member@example.com',
            templateKey: 'survey_invitation',
            variables: { first_name: 'Ada' },
          },
          attempts: 0,
          max_attempts: 3,
        },
      ]) as never,
    })

    expect(result).toEqual({
      ok: true,
      data: {
        fetched: 1,
        sent: 1,
        failed: 0,
        skipped: 0,
      },
    })
    expect(resendSendMock).toHaveBeenCalledOnce()
  })

  it('marks invalid payload jobs as failed/retryable', async () => {
    const result = await runPendingEmailJobs({
      adminClient: createAdminClientMock([
        {
          id: 'job-1',
          job_type: 'templated_email',
          payload: { to: 'member@example.com' },
          attempts: 0,
          max_attempts: 3,
        },
      ]) as never,
    })

    expect(result).toEqual({
      ok: true,
      data: {
        fetched: 1,
        sent: 0,
        failed: 1,
        skipped: 0,
      },
    })
  })

  it('processes assessment report email jobs', async () => {
    const result = await runPendingEmailJobs({
      adminClient: createAdminClientMock([
        {
          id: 'job-1',
          job_type: 'assessment_report_email',
          payload: { submissionId: 'sub-1', to: 'member@example.com' },
          attempts: 0,
          max_attempts: 3,
        },
      ]) as never,
    })

    expect(result.ok).toBe(true)
    expect(sendAssessmentReportEmail).toHaveBeenCalledOnce()
  })
})
