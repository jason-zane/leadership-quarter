import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { sendSurveyInvitationEmail } from '@/utils/assessments/email'
import { getPortalBaseUrl } from '@/utils/hosts'

type InviteInput = {
  email?: string
  first_name?: string
  firstName?: string
  last_name?: string
  lastName?: string
  organisation?: string
  role?: string
}

function getBaseUrl() {
  return getPortalBaseUrl()
}

function normalizeBody(body: unknown): { invitations: InviteInput[]; sendNow: boolean; expiresAt: string | null } {
  if (!body || typeof body !== 'object') return { invitations: [], sendNow: false, expiresAt: null }
  const input = body as Record<string, unknown>
  return {
    invitations: Array.isArray(input.invitations) ? (input.invitations as InviteInput[]) : [],
    sendNow: input.send_now === true || input.sendNow === true || input.send === true,
    expiresAt: typeof input.expires_at === 'string' ? input.expires_at : typeof input.expiresAt === 'string' ? input.expiresAt : null,
  }
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
  const body = normalizeBody((await request.json().catch(() => null)) as unknown)

  if (body.invitations.length === 0) {
    return NextResponse.json({ ok: false, error: 'invalid_invitations' }, { status: 400 })
  }

  const invalidRows: Array<{ row_index: number; code: string; message: string }> = []
  const rows = body.invitations
    .map((item, idx) => {
      const email = String(item.email ?? '').trim().toLowerCase()
      if (!email) {
        invalidRows.push({ row_index: idx, code: 'missing_email', message: 'Email is required.' })
        return null
      }
      return {
        assessment_id: id,
        cohort_id: cohortId,
        email,
        first_name: String(item.first_name ?? item.firstName ?? '').trim() || null,
        last_name: String(item.last_name ?? item.lastName ?? '').trim() || null,
        organisation: item.organisation?.trim() || null,
        role: item.role?.trim() || null,
        status: body.sendNow ? 'sent' : 'pending',
        expires_at: body.expiresAt,
        sent_at: body.sendNow ? new Date().toISOString() : null,
        created_by: auth.user.id,
        updated_at: new Date().toISOString(),
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: 'invalid_invitations', errors: invalidRows }, { status: 400 })
  }

  const { data: insertedRows, error: insertError } = await auth.adminClient
    .from('assessment_invitations')
    .insert(rows)
    .select('id, token, email, first_name, last_name, status, assessment_id, created_at')

  if (insertError || !insertedRows) {
    return NextResponse.json({ ok: false, error: 'invitations_create_failed', message: insertError?.message }, { status: 500 })
  }

  if (body.sendNow) {
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

  return NextResponse.json({ ok: true, invitations: insertedRows, errors: invalidRows.length ? invalidRows : undefined }, { status: 201 })
}
