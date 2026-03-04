import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { sendSurveyInvitationEmail } from '@/utils/assessments/email'
import { getPortalBaseUrl } from '@/utils/hosts'

function getBaseUrl() {
  return getPortalBaseUrl()
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params

  const { data, error } = await auth.adminClient
    .from('assessment_invitations')
    .select('id, assessment_id, cohort_id, token, email, first_name, last_name, organisation, role, status, sent_at, opened_at, started_at, completed_at, expires_at, created_at, updated_at')
    .eq('assessment_id', id)
    .is('cohort_id', null)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: 'invitations_list_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, invitations: data ?? [] })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = (await request.json().catch(() => null)) as {
    email?: string
    firstName?: string
    lastName?: string
    organisation?: string
    role?: string
    sendNow?: boolean
  } | null

  const email = String(body?.email ?? '').trim().toLowerCase()
  const firstName = String(body?.firstName ?? '').trim() || null
  const lastName = String(body?.lastName ?? '').trim() || null
  const organisation = String(body?.organisation ?? '').trim() || null
  const role = String(body?.role ?? '').trim() || null
  const sendNow = body?.sendNow === true

  if (!email || !firstName) {
    return NextResponse.json({ ok: false, error: 'email_and_first_name_required' }, { status: 400 })
  }

  const { data: inserted, error: insertError } = await auth.adminClient
    .from('assessment_invitations')
    .insert({
      assessment_id: id,
      email,
      first_name: firstName,
      last_name: lastName,
      organisation,
      role,
      status: sendNow ? 'sent' : 'pending',
      sent_at: sendNow ? new Date().toISOString() : null,
      created_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .select('id, token, email, first_name, status')
    .single()

  if (insertError || !inserted) {
    return NextResponse.json({ ok: false, error: 'invitation_create_failed', message: insertError?.message }, { status: 500 })
  }

  if (sendNow) {
    const { data: assessmentRow } = await auth.adminClient
      .from('assessments')
      .select('name')
      .eq('id', id)
      .maybeSingle()

    const surveyName = assessmentRow?.name ?? 'Assessment'
    await sendSurveyInvitationEmail({
      to: inserted.email,
      firstName: inserted.first_name,
      surveyName,
      invitationUrl: `${getBaseUrl()}/survey/${inserted.token}`,
    })
  }

  return NextResponse.json({ ok: true, invitation: inserted }, { status: 201 })
}
