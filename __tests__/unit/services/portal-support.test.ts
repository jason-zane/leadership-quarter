import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/services/email-jobs', () => ({
  enqueueTemplatedEmailJob: vi.fn(),
}))
vi.mock('@/utils/services/submissions', () => ({
  createInterestSubmission: vi.fn(),
  createSubmissionEvent: vi.fn(),
}))

import {
  parsePortalSupportPayload,
  submitPortalSupportRequest,
} from '@/utils/services/portal-support'
import { enqueueTemplatedEmailJob } from '@/utils/services/email-jobs'
import { createInterestSubmission, createSubmissionEvent } from '@/utils/services/submissions'

function createAdminClientMock(campaign?: { id: string; name?: string } | null) {
  const campaignQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: campaign, error: null }),
  }

  return {
    from: vi.fn((table: string) => {
      if (table === 'campaigns') {
        return campaignQuery
      }
      return {}
    }),
  }
}

const baseInput = {
  organisationId: 'org-1',
  organisationSlug: 'acme',
  userId: 'user-1',
  userEmail: 'user@example.com',
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  payload: {
    topic: 'Need help',
    message: 'Something is not working',
    campaign_id: null,
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.unstubAllEnvs()
  vi.stubEnv('RESEND_NOTIFICATION_TO', 'support@example.com')
  vi.mocked(createInterestSubmission).mockResolvedValue({
    data: { id: 'submission-1' },
    error: null,
    missingTable: false,
  })
  vi.mocked(createSubmissionEvent).mockResolvedValue({ error: null })
  vi.mocked(enqueueTemplatedEmailJob).mockResolvedValue({ error: null })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('parsePortalSupportPayload', () => {
  it('rejects invalid payloads and overlong fields', () => {
    expect(parsePortalSupportPayload(null)).toEqual({
      ok: false,
      error: 'invalid_payload',
      message: 'Request payload is invalid.',
    })

    expect(
      parsePortalSupportPayload({
        topic: 'x'.repeat(121),
        message: 'Hello',
      })
    ).toEqual({
      ok: false,
      error: 'invalid_topic',
      message: 'Topic is required and must be 120 characters or fewer.',
    })

    expect(
      parsePortalSupportPayload({
        topic: 'Need help',
        message: 'x'.repeat(4001),
      })
    ).toEqual({
      ok: false,
      error: 'invalid_message',
      message: 'Message is required and must be 4000 characters or fewer.',
    })
  })
})

describe('submitPortalSupportRequest', () => {
  it('returns invalid campaign when the selected campaign is outside the organisation', async () => {
    const result = await submitPortalSupportRequest({
      adminClient: createAdminClientMock(null) as never,
      ...baseInput,
      payload: {
        ...baseInput.payload,
        campaign_id: 'camp-1',
      },
    })

    expect(result).toEqual({
      ok: false,
      error: 'invalid_campaign',
      message: 'Selected campaign is not available in your organisation.',
    })
  })

  it('returns a configuration error when no support recipient is configured', async () => {
    vi.unstubAllEnvs()

    const result = await submitPortalSupportRequest({
      adminClient: createAdminClientMock() as never,
      ...baseInput,
    })

    expect(result).toEqual({
      ok: false,
      error: 'support_email_not_configured',
      message: 'Support email recipient is not configured. Please contact an administrator.',
    })
  })

  it('keeps the fallback request id when submission capture does not persist', async () => {
    vi.mocked(createInterestSubmission).mockResolvedValue({
      data: null,
      error: 'insert failed',
      missingTable: false,
    })
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('fallback-request-id')

    const result = await submitPortalSupportRequest({
      adminClient: createAdminClientMock() as never,
      ...baseInput,
    })

    expect(result).toEqual({
      ok: true,
      data: { requestId: 'fallback-request-id' },
    })
    expect(createSubmissionEvent).not.toHaveBeenCalled()
    expect(enqueueTemplatedEmailJob).toHaveBeenCalledTimes(2)
  })

  it('returns the persisted request id and enqueues both emails', async () => {
    const adminClient = createAdminClientMock({ id: 'camp-1', name: 'Pilot' })

    const result = await submitPortalSupportRequest({
      adminClient: adminClient as never,
      ...baseInput,
      payload: {
        ...baseInput.payload,
        campaign_id: 'camp-1',
      },
    })

    expect(result).toEqual({
      ok: true,
      data: { requestId: 'submission-1' },
    })
    expect(createInterestSubmission).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        email: 'user@example.com',
        answers: expect.objectContaining({
          campaign_id: 'camp-1',
          campaign_name: 'Pilot',
          organisation_slug: 'acme',
          topic: 'Need help',
        }),
      })
    )
    expect(createSubmissionEvent).toHaveBeenCalledWith(
      adminClient,
      expect.objectContaining({
        submissionId: 'submission-1',
        eventType: 'portal_support_requested',
        actorUserId: 'user-1',
      })
    )
    expect(enqueueTemplatedEmailJob).toHaveBeenNthCalledWith(
      1,
      adminClient,
      expect.objectContaining({
        to: 'support@example.com',
        templateKey: 'portal_support_internal_notification',
      })
    )
    expect(enqueueTemplatedEmailJob).toHaveBeenNthCalledWith(
      2,
      adminClient,
      expect.objectContaining({
        to: 'user@example.com',
        templateKey: 'portal_support_user_confirmation',
      })
    )
  })
})
