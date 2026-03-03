import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() <= Date.now()
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json(
      { ok: false, error: 'missing_service_role', message: 'Supabase admin credentials are not configured.' },
      { status: 500 }
    )
  }

  const { token } = await params

  const { data: invitationRow, error } = await adminClient
    .from('survey_invitations')
    .select('id, survey_id, token, first_name, last_name, organisation, role, status, opened_at, completed_at, expires_at, surveys(id, key, name, description, version, status)')
    .eq('token', token)
    .maybeSingle()

  if (error || !invitationRow) {
    return NextResponse.json({ ok: false, error: 'invitation_not_found' }, { status: 404 })
  }

  const surveyRelation = invitationRow.surveys as unknown
  const survey = (Array.isArray(surveyRelation) ? surveyRelation[0] : surveyRelation) as
    | {
    id: string
    key: string
    name: string
    description: string | null
    version: number
    status: string
      }
    | null

  if (!survey || survey.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'survey_not_active' }, { status: 410 })
  }

  if (invitationRow.status === 'completed' || invitationRow.completed_at) {
    return NextResponse.json({ ok: false, error: 'invitation_completed' }, { status: 410 })
  }

  if (isExpired(invitationRow.expires_at)) {
    await adminClient
      .from('survey_invitations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', invitationRow.id)

    return NextResponse.json({ ok: false, error: 'invitation_expired' }, { status: 410 })
  }

  const { data: questionRows, error: questionError } = await adminClient
    .from('survey_questions')
    .select('id, question_key, text, dimension, is_reverse_coded, sort_order')
    .eq('survey_id', survey.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (questionError) {
    return NextResponse.json({ ok: false, error: 'questions_load_failed' }, { status: 500 })
  }

  if (!invitationRow.opened_at) {
    await adminClient
      .from('survey_invitations')
      .update({
        opened_at: new Date().toISOString(),
        status: invitationRow.status === 'pending' || invitationRow.status === 'sent' ? 'opened' : invitationRow.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationRow.id)
  }

  return NextResponse.json({
    ok: true,
    survey: {
      id: survey.id,
      key: survey.key,
      name: survey.name,
      description: survey.description,
      version: survey.version,
    },
    questions: questionRows ?? [],
    invitation: {
      firstName: invitationRow.first_name,
      lastName: invitationRow.last_name,
      organisation: invitationRow.organisation,
      role: invitationRow.role,
    },
  })
}
