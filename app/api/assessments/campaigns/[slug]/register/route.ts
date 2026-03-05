import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { upsertContactByEmail } from '@/utils/services/contacts'
import { sendSurveyInvitationEmail } from '@/utils/assessments/email'
import type { CampaignConfig } from '@/utils/assessments/campaign-types'
import { getPortalBaseUrl } from '@/utils/hosts'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getBaseUrl() {
  return getPortalBaseUrl()
}

type RegisterPayload = {
  firstName?: string
  lastName?: string
  email?: string
  organisation?: string
  role?: string
  demographics?: Record<string, string>
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params

  const body = (await request.json().catch(() => null)) as RegisterPayload | null
  if (!body) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const firstName = String(body.firstName ?? '').trim()
  const lastName = String(body.lastName ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const organisation = String(body.organisation ?? '').trim()
  const role = String(body.role ?? '').trim()

  if (!firstName || !lastName || !isValidEmail(email)) {
    return NextResponse.json({ ok: false, error: 'invalid_fields' }, { status: 400 })
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  // Load campaign
  const { data: campaignRow, error: campaignError } = await adminClient
    .from('campaigns')
    .select(`
      id, name, status, config,
      campaign_assessments(id, assessment_id, sort_order, is_active, assessments(id, key, name, status))
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (campaignError || !campaignRow) {
    return NextResponse.json({ ok: false, error: 'campaign_not_found' }, { status: 404 })
  }

  if (campaignRow.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'campaign_not_active' }, { status: 410 })
  }

  // Pick first active assessment
  type AssessmentRelation = { id: string; key: string; name: string; status: string } | null
  type AssessmentRow = { id: string; assessment_id: string; sort_order: number; is_active: boolean; assessments: unknown }

  const rawAssessments = (campaignRow.campaign_assessments ?? []) as AssessmentRow[]
  const firstAssessment = rawAssessments
    .filter((a) => a.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)[0]

  const assessmentRel = firstAssessment?.assessments as unknown
  const assessment = (Array.isArray(assessmentRel) ? assessmentRel[0] : assessmentRel) as AssessmentRelation

  if (!assessment || assessment.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'survey_not_active' }, { status: 410 })
  }

  const config = campaignRow.config as CampaignConfig

  // Upsert contact
  const contactResult = await upsertContactByEmail(adminClient, {
    firstName,
    lastName,
    email,
    source: `campaign:${slug}`,
  })
  const contactId = contactResult.data?.id ?? null

  // Create invitation
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: invitationRow, error: invitationError } = await adminClient
    .from('assessment_invitations')
    .insert({
      assessment_id: assessment.id,
      campaign_id: campaignRow.id,
      contact_id: contactId,
      email,
      first_name: firstName,
      last_name: lastName,
      organisation: organisation || null,
      role: role || null,
      status: 'pending',
      expires_at: expiresAt,
    })
    .select('id, token')
    .single()

  if (invitationError || !invitationRow) {
    return NextResponse.json({ ok: false, error: 'invitation_create_failed' }, { status: 500 })
  }

  // Send invitation email if registration is before the survey
  if (config.registration_position === 'before') {
    const baseUrl = getBaseUrl()
    const invitationUrl = `${baseUrl}/assess/i/${invitationRow.token}`
    await sendSurveyInvitationEmail({
      to: email,
      firstName,
      surveyName: assessment.name,
      invitationUrl,
    })

    await adminClient
      .from('assessment_invitations')
      .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', invitationRow.id)
  }

  return NextResponse.json({
    ok: true,
    token: invitationRow.token,
    surveyPath: `/assess/i/${invitationRow.token}`,
  })
}
