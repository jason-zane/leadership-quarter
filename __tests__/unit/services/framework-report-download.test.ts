import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

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
vi.mock('@/utils/services/email-jobs', () => ({
  enqueueTemplatedEmailJob: vi.fn().mockResolvedValue({ error: null }),
}))

import {
  parseFrameworkReportDownloadPayload,
  requestAiReadinessReportDownload,
  requestLq8ReportDownload,
} from '@/utils/services/framework-report-download'
import {
  createReportAccessToken,
  hasReportAccessTokenSecret,
} from '@/utils/security/report-access'
import { createContactEvent, upsertContactByEmail } from '@/utils/services/contacts'
import { enqueueTemplatedEmailJob } from '@/utils/services/email-jobs'
import {
  createInterestSubmission,
  createSubmissionEvent,
  linkSubmissionToContact,
} from '@/utils/services/submissions'
import { createAdminClient } from '@/utils/supabase/admin'

const originalNotificationTo = process.env.RESEND_NOTIFICATION_TO

function makePayload() {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    workEmail: 'ada@example.com',
    organisation: 'Analytical Engines',
    role: 'Lead',
    consent: true,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.RESEND_NOTIFICATION_TO
  vi.mocked(createAdminClient).mockReturnValue({} as never)
  vi.mocked(hasReportAccessTokenSecret).mockReturnValue(true)
  vi.mocked(createInterestSubmission).mockResolvedValue({
    data: { id: 'sub-1' },
    error: null,
    missingTable: false,
  })
  vi.mocked(createSubmissionEvent).mockResolvedValue({ error: null })
  vi.mocked(linkSubmissionToContact).mockResolvedValue({ error: null })
  vi.mocked(upsertContactByEmail).mockResolvedValue({
    data: { id: 'contact-1' },
    error: null,
    missingTable: false,
  })
  vi.mocked(createContactEvent).mockResolvedValue({ error: null, missingTable: false })
  vi.mocked(createReportAccessToken).mockReturnValue('report-token')
})

afterAll(() => {
  if (originalNotificationTo === undefined) {
    delete process.env.RESEND_NOTIFICATION_TO
    return
  }

  process.env.RESEND_NOTIFICATION_TO = originalNotificationTo
})

describe('framework report download services', () => {
  it('rejects missing payloads', () => {
    expect(parseFrameworkReportDownloadPayload(null)).toEqual({
      ok: false,
      error: 'invalid_payload',
    })
  })

  it('rejects invalid emails and missing consent', () => {
    expect(
      parseFrameworkReportDownloadPayload({
        ...makePayload(),
        workEmail: 'not-an-email',
        consent: false,
      })
    ).toEqual({
      ok: false,
      error: 'invalid_fields',
    })
  })

  it('returns missing_service_role when admin credentials are unavailable', async () => {
    vi.mocked(createAdminClient).mockReturnValue(null)

    const result = await requestAiReadinessReportDownload({
      payload: makePayload(),
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    })

    expect(result).toEqual({
      ok: false,
      error: 'missing_service_role',
      message: 'Supabase admin credentials are not configured.',
    })
  })

  it('returns missing_report_secret when report tokens are disabled', async () => {
    vi.mocked(hasReportAccessTokenSecret).mockReturnValue(false)

    const result = await requestAiReadinessReportDownload({
      payload: makePayload(),
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    })

    expect(result).toEqual({
      ok: false,
      error: 'missing_report_secret',
      message: 'Report access token secret is not configured.',
    })
  })

  it('creates the AI readiness report workflow with the correct config', async () => {
    process.env.RESEND_NOTIFICATION_TO = 'notify@example.com'

    const result = await requestAiReadinessReportDownload({
      payload: makePayload(),
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        submissionId: 'sub-1',
        reportPath: '/framework/lq-ai-readiness/report',
        reportAccessToken: 'report-token',
      },
    })
    expect(createSubmissionEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        submissionId: 'sub-1',
        eventType: 'ai_readiness_report_requested',
        eventData: {
          source: 'site:ai_readiness_report_download',
          form_key: 'report_download_ai_readiness_v1',
        },
      })
    )
    expect(upsertContactByEmail).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: 'ada@example.com',
        source: 'site:ai_readiness_report_download',
      })
    )
    expect(linkSubmissionToContact).toHaveBeenCalledWith(expect.anything(), 'sub-1', 'contact-1')
    expect(enqueueTemplatedEmailJob).toHaveBeenCalledTimes(1)
    expect(enqueueTemplatedEmailJob).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        to: 'notify@example.com',
        templateKey: 'ai_readiness_report_internal_notification',
      })
    )
    expect(createReportAccessToken).toHaveBeenCalledWith({
      report: 'ai',
      submissionId: 'sub-1',
      expiresInSeconds: 604800,
    })
  })

  it('creates the LQ8 report workflow with the correct config', async () => {
    const result = await requestLq8ReportDownload({
      payload: makePayload(),
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    })

    expect(result).toEqual({
      ok: true,
      data: {
        submissionId: 'sub-1',
        reportPath: '/framework/lq8/report',
        reportAccessToken: 'report-token',
      },
    })
    expect(createSubmissionEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'lq8_report_requested',
      })
    )
    expect(enqueueTemplatedEmailJob).not.toHaveBeenCalled()
    expect(createReportAccessToken).toHaveBeenCalledWith({
      report: 'lq8',
      submissionId: 'sub-1',
      expiresInSeconds: 604800,
    })
  })
})
