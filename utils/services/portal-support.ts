import type { SupabaseClient } from '@supabase/supabase-js'
import { enqueueTemplatedEmailJob } from '@/utils/services/email-jobs'
import { createInterestSubmission, createSubmissionEvent } from '@/utils/services/submissions'

export type PortalSupportPayload = {
  topic?: string
  message?: string
  campaign_id?: string | null
}

type ParsedPortalSupportPayload = {
  topic: string
  message: string
  campaignId: string | null
}

type PortalSupportError =
  | 'invalid_payload'
  | 'invalid_topic'
  | 'invalid_message'
  | 'invalid_user_email'
  | 'invalid_campaign'
  | 'support_email_not_configured'

type PortalSupportFailure = {
  ok: false
  error: PortalSupportError
  message: string
}

type PortalSupportParseFailure =
  | { ok: false; error: 'invalid_payload'; message: string }
  | { ok: false; error: 'invalid_topic'; message: string }
  | { ok: false; error: 'invalid_message'; message: string }

export type SubmitPortalSupportResult =
  | {
      ok: true
      data: {
        requestId: string
      }
    }
  | PortalSupportFailure

function invalidResult<TError extends PortalSupportError>(
  error: TError,
  message: string
): { ok: false; error: TError; message: string } {
  return { ok: false, error, message }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function formatNameFromEmail(email: string) {
  const [local] = email.split('@')
  const normalized = local
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
  const [firstRaw, ...rest] = normalized.split(' ')
  const firstName = firstRaw ? firstRaw.charAt(0).toUpperCase() + firstRaw.slice(1) : 'there'
  const lastName = rest.join(' ').trim() || '—'
  return { firstName, lastName }
}

function resolveSupportRecipient() {
  const override = process.env.RESEND_NOTIFICATION_TO?.trim().toLowerCase()
  if (override && isValidEmail(override)) return override

  const replyTo = process.env.RESEND_REPLY_TO?.trim().toLowerCase()
  if (replyTo && isValidEmail(replyTo)) return replyTo

  return null
}

export function parsePortalSupportPayload(
  payload: PortalSupportPayload | null
):
  | { ok: true; data: ParsedPortalSupportPayload }
  | PortalSupportParseFailure {
  if (!payload) {
    return invalidResult('invalid_payload', 'Request payload is invalid.')
  }

  const topic = String(payload.topic ?? '').trim()
  const message = String(payload.message ?? '').trim()
  const campaignId = String(payload.campaign_id ?? '').trim() || null

  if (!topic || topic.length > 120) {
    return invalidResult(
      'invalid_topic',
      'Topic is required and must be 120 characters or fewer.'
    )
  }

  if (!message || message.length > 4000) {
    return invalidResult(
      'invalid_message',
      'Message is required and must be 4000 characters or fewer.'
    )
  }

  return {
    ok: true,
    data: {
      topic,
      message,
      campaignId,
    },
  }
}

export async function submitPortalSupportRequest(input: {
  adminClient: SupabaseClient
  organisationId: string
  organisationSlug: string
  userId: string
  userEmail?: string | null
  ipAddress: string | null
  userAgent: string | null
  payload: PortalSupportPayload | null
}): Promise<SubmitPortalSupportResult> {
  const parsed = parsePortalSupportPayload(input.payload)
  if (!parsed.ok) {
    return parsed
  }

  const userEmail = String(input.userEmail ?? '').trim().toLowerCase()
  if (!userEmail || !isValidEmail(userEmail)) {
    return invalidResult(
      'invalid_user_email',
      'Your account email is unavailable for support requests.'
    )
  }

  const { topic, message, campaignId } = parsed.data
  let campaignName = '—'

  if (campaignId) {
    const { data: campaign } = await input.adminClient
      .from('campaigns')
      .select('id, name:external_name')
      .eq('id', campaignId)
      .eq('organisation_id', input.organisationId)
      .maybeSingle()

    if (!campaign) {
      return invalidResult(
        'invalid_campaign',
        'Selected campaign is not available in your organisation.'
      )
    }

    campaignName = campaign.name ?? '—'
  }

  const supportRecipient = resolveSupportRecipient()
  if (!supportRecipient) {
    return invalidResult(
      'support_email_not_configured',
      'Support email recipient is not configured. Please contact an administrator.'
    )
  }

  const { firstName, lastName } = formatNameFromEmail(userEmail)
  const source = 'portal:support'
  let requestId = crypto.randomUUID()

  const submission = await createInterestSubmission(input.adminClient, {
    firstName,
    lastName,
    email: userEmail,
    source,
    formKey: 'portal_support_request_v1',
    schemaVersion: 1,
    answers: {
      topic,
      message,
      organisation_slug: input.organisationSlug,
      campaign_id: campaignId,
      campaign_name: campaignName,
    },
    rawPayload: {
      topic,
      message,
      organisation_slug: input.organisationSlug,
      campaign_id: campaignId,
      campaign_name: campaignName,
    },
    reviewStatus: 'pending_review',
    priority: 'normal',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  })

  if (submission.data?.id) {
    requestId = submission.data.id
    await createSubmissionEvent(input.adminClient, {
      submissionId: requestId,
      eventType: 'portal_support_requested',
      eventData: {
        organisation_slug: input.organisationSlug,
        campaign_id: campaignId,
      },
      actorUserId: input.userId,
    })
  }

  const variables = {
    first_name: firstName,
    last_name: lastName,
    email: userEmail,
    organisation: input.organisationSlug,
    topic,
    message,
    campaign_name: campaignName,
    source,
  }

  await Promise.all([
    enqueueTemplatedEmailJob(input.adminClient, {
      to: supportRecipient,
      templateKey: 'portal_support_internal_notification',
      variables,
    }),
    enqueueTemplatedEmailJob(input.adminClient, {
      to: userEmail,
      templateKey: 'portal_support_user_confirmation',
      variables,
    }),
  ])

  return {
    ok: true,
    data: { requestId },
  }
}
