import { NextResponse } from 'next/server'
import {
  createReportAccessToken,
  hasReportAccessTokenSecret,
  verifyGateAccessToken,
} from '@/utils/security/report-access'
import { createContactEvent, upsertContactByEmail } from '@/utils/services/contacts'
import { createAdminClient } from '@/utils/supabase/admin'

type UnlockPayload = {
  firstName?: string
  lastName?: string
  workEmail?: string
  organisation?: string
  role?: string
  consent?: boolean
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  if (process.env.NODE_ENV !== 'development' && !hasReportAccessTokenSecret()) {
    return NextResponse.json({ ok: false, error: 'missing_report_secret' }, { status: 500 })
  }

  const { token } = await params
  const payload = verifyGateAccessToken(token)
  if (!payload) {
    return NextResponse.json({ ok: false, error: 'gate_expired' }, { status: 410 })
  }

  const body = (await request.json().catch(() => null)) as UnlockPayload | null
  const firstName = String(body?.firstName ?? '').trim()
  const lastName = String(body?.lastName ?? '').trim()
  const email = String(body?.workEmail ?? '').trim().toLowerCase()
  const organisation = String(body?.organisation ?? '').trim()
  const role = String(body?.role ?? '').trim()
  const consent = body?.consent === true

  if (!firstName || !lastName || !organisation || !role || !consent || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_fields' }, { status: 400 })
  }

  const { data: submission, error: submissionError } = await adminClient
    .from('assessment_submissions')
    .select('id, campaign_id, assessment_id')
    .eq('id', payload.submissionId)
    .maybeSingle()

  if (submissionError || !submission) {
    return NextResponse.json({ ok: false, error: 'submission_not_found' }, { status: 404 })
  }

  if (submission.campaign_id !== payload.campaignId || submission.assessment_id !== payload.assessmentId) {
    return NextResponse.json({ ok: false, error: 'gate_invalid' }, { status: 410 })
  }

  const source = `campaign:${payload.campaignId}:contact_gate`
  const contactResult = await upsertContactByEmail(adminClient, {
    firstName,
    lastName,
    email,
    source,
  })

  if (!contactResult.data?.id) {
    return NextResponse.json({ ok: false, error: contactResult.error ?? 'contact_upsert_failed' }, { status: 500 })
  }

  const nowIso = new Date().toISOString()
  const { error: updateError } = await adminClient
    .from('assessment_submissions')
    .update({
      contact_id: contactResult.data.id,
      first_name: firstName,
      last_name: lastName,
      email,
      organisation,
      role,
      consent: true,
      updated_at: nowIso,
    })
    .eq('id', submission.id)

  if (updateError) {
    return NextResponse.json({ ok: false, error: 'submission_update_failed' }, { status: 500 })
  }

  await createContactEvent(adminClient, {
    contactId: contactResult.data.id,
    eventType: 'assessment_contact_gate_completed',
    eventData: {
      submission_id: submission.id,
      campaign_id: payload.campaignId,
      assessment_id: payload.assessmentId,
    },
  })

  const reportAccessToken = createReportAccessToken({
    report: 'assessment',
    submissionId: submission.id,
    expiresInSeconds: 7 * 24 * 60 * 60,
  })

  if (!reportAccessToken) {
    return NextResponse.json({ ok: false, error: 'missing_report_secret' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    reportPath: '/assess/r/assessment',
    reportAccessToken,
  })
}
