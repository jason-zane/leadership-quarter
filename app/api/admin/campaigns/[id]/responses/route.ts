import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

type ScoreMap = Record<string, unknown>

function getSummaryScore(scores: ScoreMap | null): number | null {
  if (!scores) return null
  const values = Object.values(scores)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
  if (values.length === 0) return null
  const avg = values.reduce((acc, value) => acc + value, 0) / values.length
  return Math.round(avg * 10) / 10
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id: campaignId } = await params

  const { data, error } = await auth.adminClient
    .from('assessment_submissions')
    .select(`
      id, assessment_id, created_at, demographics, scores,
      assessments(id, name, key),
      assessment_invitations!survey_submissions_invitation_id_fkey(status, completed_at, first_name, last_name, email, organisation, role)
    `)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: 'responses_list_failed' }, { status: 500 })
  }

  const responses = (data ?? []).map((row) => {
    const invitationRelation = row.assessment_invitations as unknown
    const invitation = (Array.isArray(invitationRelation) ? invitationRelation[0] : invitationRelation) as
      | {
          status: string | null
          completed_at: string | null
          first_name: string | null
          last_name: string | null
          email: string | null
          organisation: string | null
          role: string | null
        }
      | null

    return {
      id: row.id,
      assessment_id: row.assessment_id,
      status: invitation?.status ?? 'completed',
      score: getSummaryScore((row.scores as ScoreMap | null) ?? null),
      created_at: row.created_at,
      completed_at: invitation?.completed_at ?? null,
      demographics: (row.demographics as Record<string, string> | null) ?? null,
      assessments: row.assessments,
      assessment_invitations: invitation
        ? {
            first_name: invitation.first_name ?? '',
            last_name: invitation.last_name ?? '',
            email: invitation.email ?? '',
            organisation: invitation.organisation,
            role: invitation.role,
          }
        : null,
    }
  })

  return NextResponse.json({ ok: true, responses })
}
