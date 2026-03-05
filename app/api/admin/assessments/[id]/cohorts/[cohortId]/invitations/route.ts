import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { sendSurveyInvitationEmail } from '@/utils/assessments/email'
import { getPortalBaseUrl } from '@/utils/hosts'

type InviteInput = {
  email: string
  firstName?: string
  lastName?: string
  organisation?: string
  role?: string
}

function getBaseUrl() {
  return getPortalBaseUrl()
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; cohortId: string }> }
) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id, cohortId } = await params

  const { data, error } = await auth.adminClient
    .from('assessment_invitations')
    .select('id, assessment_id, cohort_id, email, first_name, last_name, organisation, role, status, sent_at, opened_at, started_at, completed_at, expires_at, token, created_at, updated_at')
    .eq('assessment_id', id)
    .eq('cohort_id', cohortId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: 'invitations_list_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, invitations: data ?? [] })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; cohortId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id, cohortId } = await params
  const body = (await request.json().catch(() => null)) as
    | {
        invitations?: InviteInput[]
        send?: boolean
        expiresAt?: string | null
      }
    | null

  const invitations = body?.invitations ?? []
  if (!Array.isArray(invitations) || invitations.length === 0) {
    return NextResponse.json({ ok: false, error: 'invalid_invitations' }, { status: 400 })
  }

  const rows = invitations
    .map((item) => ({
      assessment_id: id,
      cohort_id: cohortId,
      email: item.email.trim().toLowerCase(),
      first_name: item.firstName?.trim() || null,
      last_name: item.lastName?.trim() || null,
      organisation: item.organisation?.trim() || null,
      role: item.role?.trim() || null,
      status: body?.send ? 'sent' : 'pending',
      expires_at: body?.expiresAt ?? null,
      sent_at: body?.send ? new Date().toISOString() : null,
      created_by: auth.user.id,
      updated_at: new Date().toISOString(),
    }))
    .filter((row) => row.email.length > 0)

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: 'invalid_invitations' }, { status: 400 })
  }

  const { data: insertedRows, error: insertError } = await auth.adminClient
    .from('assessment_invitations')
    .insert(rows)
    .select('id, token, email, first_name, status')

  if (insertError || !insertedRows) {
    return NextResponse.json({ ok: false, error: 'invitations_create_failed', message: insertError?.message }, { status: 500 })
  }

  if (body?.send) {
    const { data: assessmentRow } = await auth.adminClient
      .from('assessments')
      .select('name')
      .eq('id', id)
      .maybeSingle()

    const surveyName = assessmentRow?.name ?? 'Assessment'
    await Promise.all(
      insertedRows.map((row) =>
        sendSurveyInvitationEmail({
          to: row.email,
          firstName: row.first_name,
          surveyName,
          invitationUrl: `${getBaseUrl()}/assess/i/${row.token}`,
        })
      )
    )
  }

  return NextResponse.json({ ok: true, invitations: insertedRows }, { status: 201 })
}
