import { NextResponse } from 'next/server'
import { sendSurveyInvitationEmail } from '@/utils/assessments/email'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { getPortalBaseUrl } from '@/utils/hosts'

type InviteInput = {
  assessment_id?: string
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function normalizeBody(body: unknown): {
  sendNow: boolean
  expiresAt: string | null
  invitations: InviteInput[]
} {
  if (!body || typeof body !== 'object') return { sendNow: false, expiresAt: null, invitations: [] }
  const input = body as Record<string, unknown>
  const invites = Array.isArray(input.invitations) ? (input.invitations as InviteInput[]) : []
  return {
    sendNow: input.send_now === true || input.sendNow === true || input.send === true,
    expiresAt: typeof input.expires_at === 'string' ? input.expires_at : typeof input.expiresAt === 'string' ? input.expiresAt : null,
    invitations: invites,
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { id: campaignId } = await params

  const { data: campaign } = await auth.adminClient
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .eq('organisation_id', auth.context.organisationId)
    .maybeSingle()

  if (!campaign) {
    return NextResponse.json({ ok: false, error: 'not_found', message: 'Campaign was not found.' }, { status: 404 })
  }

  const { data, error } = await auth.adminClient
    .from('assessment_invitations')
    .select('id, campaign_id, assessment_id, email, first_name, last_name, organisation, role, status, sent_at, opened_at, started_at, completed_at, expires_at, token, created_at, updated_at, assessments(id, key, name)')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to load invitations.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, invitations: data ?? [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalApiAuth({
    allowedRoles: ['org_owner', 'org_admin', 'campaign_manager'],
  })
  if (!auth.ok) return auth.response

  const { id: campaignId } = await params
  const body = normalizeBody((await request.json().catch(() => null)) as unknown)

  if (body.invitations.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'validation_error', message: 'At least one invitation is required.' },
      { status: 400 }
    )
  }

  const { data: campaignData } = await auth.adminClient
    .from('campaigns')
    .select('id, name, campaign_assessments(id, assessment_id, sort_order, is_active, assessments(id, name, status))')
    .eq('id', campaignId)
    .eq('organisation_id', auth.context.organisationId)
    .maybeSingle()

  if (!campaignData) {
    return NextResponse.json(
      { ok: false, error: 'not_found', message: 'Campaign was not found.' },
      { status: 404 }
    )
  }

  const campaignAssessmentRows = (campaignData.campaign_assessments ?? []) as Array<{
    assessment_id: string
    sort_order: number
    is_active: boolean
    assessments: unknown
  }>

  const activeRows = campaignAssessmentRows.filter((row) => row.is_active).sort((a, b) => a.sort_order - b.sort_order)

  const defaultAssessment = activeRows[0]
  const defaultAssessmentRel = defaultAssessment?.assessments as unknown
  const defaultAssessmentData = (Array.isArray(defaultAssessmentRel)
    ? defaultAssessmentRel[0]
    : defaultAssessmentRel) as { id: string; name: string; status: string } | null

  if (!defaultAssessmentData || defaultAssessmentData.status !== 'active') {
    return NextResponse.json(
      { ok: false, error: 'validation_error', message: 'Campaign has no active assessment to invite against.' },
      { status: 400 }
    )
  }

  const allowedAssessmentIds = new Set(activeRows.map((row) => row.assessment_id))

  const invalidRows: Array<{ row_index: number; code: string; message: string }> = []
  const rows = body.invitations
    .map((item, idx) => {
      const email = String(item.email ?? '').trim().toLowerCase()
      const assessmentId = String(item.assessment_id ?? defaultAssessmentData.id).trim()

      if (!isValidEmail(email)) {
        invalidRows.push({ row_index: idx, code: 'invalid_email', message: 'Invalid email address.' })
        return null
      }
      if (!allowedAssessmentIds.has(assessmentId)) {
        invalidRows.push({ row_index: idx, code: 'invalid_assessment', message: 'Assessment is not active for this campaign.' })
        return null
      }

      return {
        assessment_id: assessmentId,
        campaign_id: campaignId,
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
    return NextResponse.json(
      { ok: false, error: 'validation_error', message: 'No valid invitations were provided.', errors: invalidRows },
      { status: 400 }
    )
  }

  const { data: insertedRows, error: insertError } = await auth.adminClient
    .from('assessment_invitations')
    .insert(rows)
    .select('id, token, email, first_name, last_name, status, assessment_id, created_at')

  if (insertError || !insertedRows) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to create invitations.' },
      { status: 500 }
    )
  }

  if (body.sendNow) {
    const baseUrl = getBaseUrl()
    await Promise.all(
      insertedRows.map((row) =>
        sendSurveyInvitationEmail({
          to: row.email,
          firstName: row.first_name,
          surveyName: defaultAssessmentData.name,
          invitationUrl: `${baseUrl}/assess/i/${row.token}`,
        })
      )
    )
  }

  return NextResponse.json(
    { ok: true, invitations: insertedRows, errors: invalidRows.length > 0 ? invalidRows : undefined },
    { status: 201 }
  )
}
