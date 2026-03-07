import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { sendSurveyInvitationEmail } from '@/utils/assessments/email'
import { getPortalBaseUrl } from '@/utils/hosts'

type InvitationInput = {
  email?: string
  first_name?: string
  last_name?: string
  organisation?: string
  role?: string
}

function getBaseUrl() {
  return getPortalBaseUrl()
}

function normalizeRequest(body: unknown): { sendNow: boolean; invitations: InvitationInput[] } {
  if (!body || typeof body !== 'object') return { sendNow: false, invitations: [] }
  const input = body as Record<string, unknown>

  const sendNow = input.send_now === true || input.sendNow === true

  const inviteArray = Array.isArray(input.invitations)
    ? (input.invitations as Array<Record<string, unknown>>).map((row) => ({
        email: String(row.email ?? '').trim().toLowerCase(),
        first_name: String(row.first_name ?? row.firstName ?? '').trim() || undefined,
        last_name: String(row.last_name ?? row.lastName ?? '').trim() || undefined,
        organisation: String(row.organisation ?? '').trim() || undefined,
        role: String(row.role ?? '').trim() || undefined,
      }))
    : []

  if (inviteArray.length > 0) {
    return { sendNow, invitations: inviteArray }
  }

  const email = String(input.email ?? '').trim().toLowerCase()
  const first = String(input.first_name ?? input.firstName ?? '').trim()
  const last = String(input.last_name ?? input.lastName ?? '').trim()
  const organisation = String(input.organisation ?? '').trim()
  const role = String(input.role ?? '').trim()

  return {
    sendNow,
    invitations: email
      ? [
          {
            email,
            first_name: first || undefined,
            last_name: last || undefined,
            organisation: organisation || undefined,
            role: role || undefined,
          },
        ]
      : [],
  }
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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = (await request.json().catch(() => null)) as unknown

  const normalized = normalizeRequest(body)

  if (normalized.invitations.length === 0) {
    return NextResponse.json({ ok: false, error: 'invalid_invitations' }, { status: 400 })
  }

  const invalidRows: number[] = []
  const rows = normalized.invitations
    .map((item, idx) => {
      const email = String(item.email ?? '').trim().toLowerCase()
      const firstName = String(item.first_name ?? '').trim() || null
      if (!email) {
        invalidRows.push(idx)
        return null
      }
      return {
        assessment_id: id,
        email,
        first_name: firstName,
        last_name: String(item.last_name ?? '').trim() || null,
        organisation: String(item.organisation ?? '').trim() || null,
        role: String(item.role ?? '').trim() || null,
        status: normalized.sendNow ? 'sent' : 'pending',
        sent_at: normalized.sendNow ? new Date().toISOString() : null,
        created_by: auth.user.id,
        updated_at: new Date().toISOString(),
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: 'invalid_invitations',
        errors: invalidRows.map((rowIndex) => ({ row_index: rowIndex, code: 'missing_required', message: 'email is required' })),
      },
      { status: 400 }
    )
  }

  const { data: insertedRows, error: insertError } = await auth.adminClient
    .from('assessment_invitations')
    .insert(rows)
    .select('id, token, email, first_name, last_name, status, assessment_id, created_at')

  if (insertError || !insertedRows) {
    return NextResponse.json(
      { ok: false, error: 'invitation_create_failed', message: insertError?.message },
      { status: 500 }
    )
  }

  if (normalized.sendNow) {
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

  return NextResponse.json(
    {
      ok: true,
      invitations: insertedRows,
      invitation: insertedRows[0] ?? null,
      errors: invalidRows.map((rowIndex) => ({ row_index: rowIndex, code: 'missing_required', message: 'email is required' })),
    },
    { status: 201 }
  )
}
