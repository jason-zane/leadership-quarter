import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { assertSameOrigin } from '@/utils/security/origin'
import { checkRateLimit } from '@/utils/security/ratelimit'
import {
  createInterestSubmission,
  createSubmissionEvent,
  linkSubmissionToContact,
} from '@/utils/services/submissions'
import { createContactEvent, upsertContactByEmail } from '@/utils/services/contacts'
import { enqueueTemplatedEmailJob } from '@/utils/services/email-jobs'

type InquiryPayload = {
  name?: string
  workEmail?: string
  organisation?: string
  role?: string
  topic?: string
  message?: string
  consent?: boolean
}

function getIpAddress(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || 'unknown'
}

function splitName(name: string) {
  const normalized = name.trim().replace(/\s+/g, ' ')
  const [firstName, ...rest] = normalized.split(' ')
  return {
    firstName: firstName || '',
    lastName: rest.join(' ') || '—',
  }
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(request: Request) {
  try {
    await assertSameOrigin()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_origin' }, { status: 403 })
  }

  const ipAddress = getIpAddress(request)
  const rateLimit = await checkRateLimit(`inquiry:${ipAddress}`)
  if (!rateLimit.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  const body = (await request.json().catch(() => null)) as InquiryPayload | null
  if (!body) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const name = String(body.name ?? '').trim()
  const email = String(body.workEmail ?? '')
    .trim()
    .toLowerCase()
  const organisation = String(body.organisation ?? '').trim()
  const role = String(body.role ?? '').trim()
  const topic = String(body.topic ?? '').trim()
  const message = String(body.message ?? '').trim()
  const consent = body.consent === true

  if (!name || !email || !organisation || !message || !consent || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_fields' }, { status: 400 })
  }

  const { firstName, lastName } = splitName(name)
  if (!firstName) {
    return NextResponse.json({ ok: false, error: 'invalid_name' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const source = 'site:work_with_us'
  const answers = {
    first_name: firstName,
    last_name: lastName,
    email,
    organisation,
    role,
    topic,
    message,
    consent,
  }

  const submissionResult = await createInterestSubmission(adminClient, {
    firstName,
    lastName,
    email,
    source,
    formKey: 'inquiry_work_with_us_v1',
    schemaVersion: 1,
    answers,
    rawPayload: answers,
    reviewStatus: 'pending_review',
    priority: 'normal',
    ipAddress,
    userAgent: request.headers.get('user-agent'),
  })

  if (!submissionResult.data?.id || submissionResult.error) {
    return NextResponse.json(
      { ok: false, error: submissionResult.error ?? 'submission_failed' },
      { status: 500 }
    )
  }

  const submissionId = submissionResult.data.id
  await createSubmissionEvent(adminClient, {
    submissionId,
    eventType: 'inquiry_received',
    eventData: { source, topic },
  })

  const contactResult = await upsertContactByEmail(adminClient, {
    firstName,
    lastName,
    email,
    source,
  })

  if (contactResult.data?.id) {
    const contactId = contactResult.data.id
    await linkSubmissionToContact(adminClient, submissionId, contactId)
    await createContactEvent(adminClient, {
      contactId,
      eventType: 'inquiry_received',
      eventData: { submission_id: submissionId, topic, source },
    })
  }

  const variables = {
    first_name: firstName,
    last_name: lastName,
    email,
    organisation,
    role: role || '—',
    topic: topic || 'General inquiry',
    message,
    source,
  }

  await enqueueTemplatedEmailJob(adminClient, {
    to: email,
    templateKey: 'inquiry_user_confirmation',
    variables,
  })

  const internalTo = process.env.RESEND_NOTIFICATION_TO?.trim().toLowerCase()
  if (internalTo && isValidEmail(internalTo)) {
    await enqueueTemplatedEmailJob(adminClient, {
      to: internalTo,
      templateKey: 'inquiry_internal_notification',
      variables,
    })
  }

  return NextResponse.json({ ok: true, submissionId })
}
