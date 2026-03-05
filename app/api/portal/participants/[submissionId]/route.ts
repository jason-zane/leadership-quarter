import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { submissionId } = await params

  const { data: submission, error: submissionError } = await auth.adminClient
    .from('assessment_submissions')
    .select(
      'id, campaign_id, assessment_id, created_at, scores, bands, classification, recommendations, demographics, assessments(id, key, name), assessment_invitations(first_name, last_name, email, organisation, role, status, completed_at)'
    )
    .eq('id', submissionId)
    .maybeSingle()

  if (submissionError || !submission) {
    return NextResponse.json(
      { ok: false, error: 'not_found', message: 'Participant result was not found.' },
      { status: 404 }
    )
  }

  const { data: campaign } = await auth.adminClient
    .from('campaigns')
    .select('id, name, slug')
    .eq('id', submission.campaign_id)
    .eq('organisation_id', auth.context.organisationId)
    .maybeSingle()

  if (!campaign) {
    return NextResponse.json(
      { ok: false, error: 'not_found', message: 'Participant result was not found.' },
      { status: 404 }
    )
  }

  const invitationRel = submission.assessment_invitations as unknown
  const invitation = (Array.isArray(invitationRel) ? invitationRel[0] : invitationRel) as
    | {
        first_name: string | null
        last_name: string | null
        email: string | null
        organisation: string | null
        role: string | null
        status: string | null
        completed_at: string | null
      }
    | null

  const assessmentRel = submission.assessments as unknown
  const assessment = (Array.isArray(assessmentRel) ? assessmentRel[0] : assessmentRel) as
    | { id: string; key: string; name: string }
    | null

  const classificationObj = (submission.classification as { key?: string; label?: string } | null) ?? null

  return NextResponse.json({
    ok: true,
    result: {
      id: submission.id,
      campaign,
      assessment,
      participant: {
        first_name: invitation?.first_name ?? null,
        last_name: invitation?.last_name ?? null,
        email: invitation?.email ?? null,
        organisation: invitation?.organisation ?? null,
        role: invitation?.role ?? null,
      },
      status: invitation?.status ?? null,
      completed_at: invitation?.completed_at ?? null,
      created_at: submission.created_at,
      scores: (submission.scores as Record<string, number> | null) ?? {},
      bands: (submission.bands as Record<string, string> | null) ?? {},
      classification: {
        key: classificationObj?.key ?? null,
        label: classificationObj?.label ?? null,
      },
      recommendations: Array.isArray(submission.recommendations) ? submission.recommendations : [],
      demographics: (submission.demographics as Record<string, string> | null) ?? null,
    },
  })
}
