import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/surveys/api-auth'
import { sendSurveyInvitationEmail } from '@/utils/surveys/email'

type InviteInput = {
  email: string
  firstName?: string
  lastName?: string
  organisation?: string
  role?: string
}

function getBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (appUrl) return appUrl.replace(/\/$/, '')
  return 'http://localhost:3000'
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; cohortId: string }> }
) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id, cohortId } = await params

  const { data, error } = await auth.adminClient
    .from('survey_invitations')
    .select('id, survey_id, cohort_id, email, first_name, last_name, organisation, role, status, sent_at, opened_at, started_at, completed_at, expires_at, token, created_at, updated_at')
    .eq('survey_id', id)
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
      survey_id: id,
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
    .from('survey_invitations')
    .insert(rows)
    .select('id, token, email, first_name, status')

  if (insertError || !insertedRows) {
    return NextResponse.json({ ok: false, error: 'invitations_create_failed', message: insertError?.message }, { status: 500 })
  }

  if (body?.send) {
    const { data: surveyRow } = await auth.adminClient
      .from('surveys')
      .select('name')
      .eq('id', id)
      .maybeSingle()

    const surveyName = surveyRow?.name ?? 'Survey'
    await Promise.all(
      insertedRows.map((row) =>
        sendSurveyInvitationEmail({
          to: row.email,
          firstName: row.first_name,
          surveyName,
          invitationUrl: `${getBaseUrl()}/survey/${row.token}`,
        })
      )
    )
  }

  return NextResponse.json({ ok: true, invitations: insertedRows }, { status: 201 })
}
