import { NextResponse } from 'next/server'
import { sendSurveyInvitationEmail } from '@/utils/assessments/email'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import { getPortalBaseUrl } from '@/utils/hosts'

type InviteInput = {
  assessment_id?: string
  email: string
  firstName?: string
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
    return NextResponse.json(
      { ok: false, error: 'not_found', message: 'Campaign was not found.' },
      { status: 404 }
    )
  }

  const { data, error } = await auth.adminClient
    .from('assessment_invitations')
    .select(
      'id, campaign_id, assessment_id, email, first_name, last_name, organisation, role, status, sent_at, opened_at, started_at, completed_at, expires_at, token, created_at, updated_at, assessments(id, key, name)'
    )
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

  const body = (await request.json().catch(() => null)) as
    | {
        invitations?: InviteInput[]
        send?: boolean
        expiresAt?: string | null
      }
    | null

  const invitations = body?.invitations ?? []
  if (!Array.isArray(invitations) || invitations.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'validation_error', message: 'At least one invitation is required.' },
      { status: 400 }
    )
  }

  const { data: campaignData } = await auth.adminClient
    .from('campaigns')
    .select(
      'id, name, campaign_assessments(id, assessment_id, sort_order, is_active, assessments(id, name, status))'
    )
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

  const activeRows = campaignAssessmentRows
    .filter((row) => row.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)

  const defaultAssessment = activeRows[0]
  const defaultAssessmentRel = defaultAssessment?.assessments as unknown
  const defaultAssessmentData = (Array.isArray(defaultAssessmentRel)
    ? defaultAssessmentRel[0]
    : defaultAssessmentRel) as { id: string; name: string; status: string } | null

  if (!defaultAssessmentData || defaultAssessmentData.status !== 'active') {
    return NextResponse.json(
      {
        ok: false,
        error: 'validation_error',
        message: 'Campaign has no active assessment to invite against.',
      },
      { status: 400 }
    )
  }

  const allowedAssessmentIds = new Set(activeRows.map((row) => row.assessment_id))

  const rows = invitations
    .map((item) => {
      const email = String(item.email ?? '').trim().toLowerCase()
      const assessmentId = String(item.assessment_id ?? defaultAssessmentData.id).trim()

      if (!isValidEmail(email) || !allowedAssessmentIds.has(assessmentId)) {
        return null
      }

      return {
        assessment_id: assessmentId,
        campaign_id: campaignId,
        email,
        first_name: item.firstName?.trim() || null,
        last_name: item.lastName?.trim() || null,
        organisation: item.organisation?.trim() || null,
        role: item.role?.trim() || null,
        status: body?.send ? 'sent' : 'pending',
        expires_at: body?.expiresAt ?? null,
        sent_at: body?.send ? new Date().toISOString() : null,
        created_by: auth.user.id,
        updated_at: new Date().toISOString(),
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'validation_error', message: 'No valid invitations were provided.' },
      { status: 400 }
    )
  }

  const { data: insertedRows, error: insertError } = await auth.adminClient
    .from('assessment_invitations')
    .insert(rows)
    .select('id, token, email, first_name, last_name, status, assessment_id')

  if (insertError || !insertedRows) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to create invitations.' },
      { status: 500 }
    )
  }

  if (body?.send) {
    const baseUrl = getBaseUrl()
    await Promise.all(
      insertedRows.map((row) =>
        sendSurveyInvitationEmail({
          to: row.email,
          firstName: row.first_name,
          surveyName: defaultAssessmentData.name,
          invitationUrl: `${baseUrl}/survey/${row.token}`,
        })
      )
    )
  }

  return NextResponse.json({ ok: true, invitations: insertedRows }, { status: 201 })
}
