import { NextResponse } from 'next/server'
import { classifyResult, computeScores, getBands } from '@/utils/assessments/scoring-engine'
import type { ScoringConfig } from '@/utils/assessments/types'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id, submissionId } = await params

  const [{ data: assessmentRow }, { data: submissionRow, error: submissionError }] = await Promise.all([
    auth.adminClient.from('assessments').select('id, key, name, scoring_config').eq('id', id).maybeSingle(),
    auth.adminClient
      .from('assessment_submissions')
      .select(
        'id, assessment_id, invitation_id, contact_id, first_name, last_name, email, organisation, role, consent, responses, normalized_responses, scores, bands, classification, recommendations, created_at, updated_at'
      )
      .eq('assessment_id', id)
      .eq('id', submissionId)
      .maybeSingle(),
  ])

  if (!assessmentRow || submissionError || !submissionRow) {
    return NextResponse.json({ ok: false, error: 'response_not_found' }, { status: 404 })
  }

  const scoringConfig = assessmentRow.scoring_config as ScoringConfig
  const normalizedResponses =
    (submissionRow.normalized_responses as Record<string, number> | null) ??
    ((submissionRow.responses as Record<string, number> | null) ?? {})

  const scores = computeScores(normalizedResponses, scoringConfig)
  const bands = getBands(scores, scoringConfig)
  const classification = classifyResult(scores, scoringConfig)

  return NextResponse.json({
    ok: true,
    assessment: assessmentRow,
    // Backward compatibility alias.
    survey: assessmentRow,
    submission: submissionRow,
    computedReport: {
      scores,
      bands,
      classification,
      recommendations: classification?.recommendations ?? [],
    },
  })
}
