import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { upsertContactByEmail } from '@/utils/services/contacts'
import { sendSurveyInvitationEmail } from '@/utils/surveys/email'
import type { CampaignConfig } from '@/utils/surveys/campaign-types'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function getBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (appUrl) return appUrl.replace(/\/$/, '')
  return 'http://localhost:3000'
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
  const demographics = body.demographics ?? {}

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
    .select('id, survey_id, name, status, config, surveys(id, key, name, status)')
    .eq('slug', slug)
    .maybeSingle()

  if (campaignError || !campaignRow) {
    return NextResponse.json({ ok: false, error: 'campaign_not_found' }, { status: 404 })
  }

  if (campaignRow.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'campaign_not_active' }, { status: 410 })
  }

  const surveyRelation = campaignRow.surveys as unknown
  const survey = (Array.isArray(surveyRelation) ? surveyRelation[0] : surveyRelation) as
    | { id: string; key: string; name: string; status: string }
    | null

  if (!survey || survey.status !== 'active') {
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
    .from('survey_invitations')
    .insert({
      survey_id: survey.id,
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
    const invitationUrl = `${baseUrl}/survey/${invitationRow.token}`
    await sendSurveyInvitationEmail({
      to: email,
      firstName,
      surveyName: survey.name,
      invitationUrl,
    })

    await adminClient
      .from('survey_invitations')
      .update({ status: 'sent', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', invitationRow.id)
  }

  return NextResponse.json({
    ok: true,
    token: invitationRow.token,
    surveyPath: `/survey/${invitationRow.token}`,
  })
}
