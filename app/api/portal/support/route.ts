import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { assertSameOrigin } from '@/utils/security/origin'
import { checkRateLimit } from '@/utils/security/ratelimit'
import { createInterestSubmission, createSubmissionEvent } from '@/utils/services/submissions'
import { enqueueTemplatedEmailJob } from '@/utils/services/email-jobs'

type SupportPayload = {
  topic?: string
  message?: string
  campaign_id?: string | null
}

function getIpAddress(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || 'unknown'
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

export async function POST(request: Request) {
  try {
    await assertSameOrigin()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_origin', message: 'Invalid request origin.' }, { status: 403 })
  }

  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const rateLimit = await checkRateLimit(`portal_support:${auth.user.id}`)
  if (!rateLimit.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited', message: 'Too many requests. Please try again shortly.' }, { status: 429 })
  }

  const body = (await request.json().catch(() => null)) as SupportPayload | null
  if (!body) {
    return NextResponse.json({ ok: false, error: 'invalid_payload', message: 'Request payload is invalid.' }, { status: 400 })
  }

  const topic = String(body.topic ?? '').trim()
  const message = String(body.message ?? '').trim()
  const campaignId = String(body.campaign_id ?? '').trim() || null
  const userEmail = (auth.user.email ?? '').trim().toLowerCase()

  if (!topic || topic.length > 120) {
    return NextResponse.json({ ok: false, error: 'invalid_topic', message: 'Topic is required and must be 120 characters or fewer.' }, { status: 400 })
  }
  if (!message || message.length > 4000) {
    return NextResponse.json({ ok: false, error: 'invalid_message', message: 'Message is required and must be 4000 characters or fewer.' }, { status: 400 })
  }
  if (!userEmail || !isValidEmail(userEmail)) {
    return NextResponse.json({ ok: false, error: 'invalid_user_email', message: 'Your account email is unavailable for support requests.' }, { status: 400 })
  }

  let campaignName = '—'
  if (campaignId) {
    const { data: campaign } = await auth.adminClient
      .from('campaigns')
      .select('id, name')
      .eq('id', campaignId)
      .eq('organisation_id', auth.context.organisationId)
      .maybeSingle()

    if (!campaign) {
      return NextResponse.json({ ok: false, error: 'invalid_campaign', message: 'Selected campaign is not available in your organisation.' }, { status: 400 })
    }
    campaignName = campaign.name ?? '—'
  }

  const supportRecipient = resolveSupportRecipient()
  if (!supportRecipient) {
    return NextResponse.json(
      {
        ok: false,
        error: 'support_email_not_configured',
        message: 'Support email recipient is not configured. Please contact an administrator.',
      },
      { status: 500 }
    )
  }

  const { firstName, lastName } = formatNameFromEmail(userEmail)
  const source = 'portal:support'
  const requestIdFallback = crypto.randomUUID()
  let requestId = requestIdFallback

  const submission = await createInterestSubmission(auth.adminClient, {
    firstName,
    lastName,
    email: userEmail,
    source,
    formKey: 'portal_support_request_v1',
    schemaVersion: 1,
    answers: {
      topic,
      message,
      organisation_slug: auth.context.organisationSlug,
      campaign_id: campaignId,
      campaign_name: campaignName,
    },
    rawPayload: {
      topic,
      message,
      organisation_slug: auth.context.organisationSlug,
      campaign_id: campaignId,
      campaign_name: campaignName,
    },
    reviewStatus: 'pending_review',
    priority: 'normal',
    ipAddress: getIpAddress(request),
    userAgent: request.headers.get('user-agent'),
  })

  if (submission.data?.id) {
    requestId = submission.data.id
    await createSubmissionEvent(auth.adminClient, {
      submissionId: requestId,
      eventType: 'portal_support_requested',
      eventData: {
        organisation_slug: auth.context.organisationSlug,
        campaign_id: campaignId,
      },
      actorUserId: auth.user.id,
    })
  }

  const variables = {
    first_name: firstName,
    last_name: lastName,
    email: userEmail,
    organisation: auth.context.organisationSlug,
    topic,
    message,
    campaign_name: campaignName,
    source,
  }

  await Promise.all([
    enqueueTemplatedEmailJob(auth.adminClient, {
      to: supportRecipient,
      templateKey: 'portal_support_internal_notification',
      variables,
    }),
    enqueueTemplatedEmailJob(auth.adminClient, {
      to: userEmail,
      templateKey: 'portal_support_user_confirmation',
      variables,
    }),
  ])

  return NextResponse.json({ ok: true, requestId })
}
