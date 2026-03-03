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
import { createReportAccessToken } from '@/utils/security/report-access'

type ReportPayload = {
  firstName?: string
  lastName?: string
  workEmail?: string
  organisation?: string
  role?: string
  consent?: boolean
}

function getIpAddress(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  return forwardedFor?.split(',')[0]?.trim() || 'unknown'
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const REPORT_BUCKET = process.env.LQ8_REPORT_BUCKET?.trim() || 'reports'
const REPORT_PATH = process.env.LQ8_REPORT_PATH?.trim() || 'lq8/lq8-framework-report.pdf'

export async function POST(request: Request) {
  try {
    await assertSameOrigin()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_origin' }, { status: 403 })
  }

  const ipAddress = getIpAddress(request)
  const rateLimit = await checkRateLimit(`lq8-report:${ipAddress}`)
  if (!rateLimit.ok) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  const body = (await request.json().catch(() => null)) as ReportPayload | null
  if (!body) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()
  const email = String(body.workEmail ?? '')
    .trim()
    .toLowerCase()
  const organisation = String(body.organisation ?? '').trim()
  const role = String(body.role ?? '').trim()
  const consent = body.consent === true

  if (!firstName || !lastName || !organisation || !role || !consent || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_fields' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const source = 'site:lq8_report_download'
  const answers = {
    first_name: firstName,
    last_name: lastName,
    email,
    organisation,
    role,
    consent,
  }

  const submissionResult = await createInterestSubmission(adminClient, {
    firstName,
    lastName,
    email,
    source,
    formKey: 'report_download_lq8_v1',
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
    eventType: 'lq8_report_requested',
    eventData: { source },
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
      eventType: 'lq8_report_requested',
      eventData: { submission_id: submissionId, source },
    })
  }

  const { data: signed, error: signError } = await adminClient.storage
    .from(REPORT_BUCKET)
    .createSignedUrl(REPORT_PATH, 60 * 10)

  if (signError || !signed?.signedUrl) {
    return NextResponse.json({ ok: false, error: 'report_unavailable' }, { status: 500 })
  }

  const variables = {
    first_name: firstName,
    last_name: lastName,
    email,
    organisation,
    role,
    source,
    download_url: signed.signedUrl,
  }

  await enqueueTemplatedEmailJob(adminClient, {
    to: email,
    templateKey: 'lq8_report_user_confirmation',
    variables,
  })

  const internalTo = process.env.RESEND_NOTIFICATION_TO?.trim().toLowerCase()
  if (internalTo && isValidEmail(internalTo)) {
    await enqueueTemplatedEmailJob(adminClient, {
      to: internalTo,
      templateKey: 'lq8_report_internal_notification',
      variables,
    })
  }

  const reportAccessToken = createReportAccessToken({
    report: 'lq8',
    submissionId,
  })
  if (!reportAccessToken) {
    return NextResponse.json({ ok: false, error: 'missing_report_secret' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    submissionId,
    downloadUrl: signed.signedUrl,
    reportPath: '/framework/lq8/report',
    reportAccessToken,
  })
}
