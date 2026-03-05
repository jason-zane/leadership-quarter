import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { normalizeReportConfig, normalizeRunnerConfig } from '@/utils/assessments/experience-config'

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() <= Date.now()
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const { token } = await params

  const { data: invitation, error: invitationError } = await adminClient
    .from('assessment_invitations')
    .select(`
      id, token, status, expires_at, first_name, last_name, organisation, role,
      assessments(id, key, name, description, status, version, runner_config, report_config)
    `)
    .eq('token', token)
    .maybeSingle()

  if (invitationError || !invitation) {
    return NextResponse.json({ ok: false, error: 'invitation_not_found' }, { status: 404 })
  }

  if (invitation.status === 'completed') {
    return NextResponse.json({ ok: false, error: 'invitation_completed' }, { status: 410 })
  }

  if (isExpired(invitation.expires_at)) {
    await adminClient
      .from('assessment_invitations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', invitation.id)
    return NextResponse.json({ ok: false, error: 'invitation_expired' }, { status: 410 })
  }

  const assessmentRel = invitation.assessments as unknown
  const assessment = (Array.isArray(assessmentRel) ? assessmentRel[0] : assessmentRel) as
    | {
        id: string
        key: string
        name: string
        description: string | null
        status: string
        version: number
        runner_config: unknown
        report_config: unknown
      }
    | null

  if (!assessment || assessment.status !== 'active') {
    return NextResponse.json({ ok: false, error: 'assessment_not_active' }, { status: 410 })
  }

  const { data: questions, error: questionError } = await adminClient
    .from('assessment_questions')
    .select('id, question_key, text, dimension, is_reverse_coded, sort_order')
    .eq('assessment_id', assessment.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (questionError) {
    return NextResponse.json({ ok: false, error: 'questions_load_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    context: 'invitation',
    assessment: {
      id: assessment.id,
      key: assessment.key,
      name: assessment.name,
      description: assessment.description,
      version: assessment.version,
    },
    invitation: {
      firstName: invitation.first_name,
      lastName: invitation.last_name,
      organisation: invitation.organisation,
      role: invitation.role,
    },
    questions: questions ?? [],
    runnerConfig: normalizeRunnerConfig(assessment.runner_config),
    reportConfig: normalizeReportConfig(assessment.report_config),
  })
}
