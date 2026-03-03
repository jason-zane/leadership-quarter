import { NextResponse } from 'next/server'
import { classifyResult, computeScores, getBands } from '@/utils/surveys/scoring-engine'
import type { ScoringConfig } from '@/utils/surveys/types'
import { requireDashboardApiAuth } from '@/utils/surveys/api-auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id, submissionId } = await params

  const [{ data: surveyRow }, { data: submissionRow, error: submissionError }] = await Promise.all([
    auth.adminClient.from('surveys').select('id, key, name, scoring_config').eq('id', id).maybeSingle(),
    auth.adminClient
      .from('survey_submissions')
      .select(
        'id, survey_id, invitation_id, contact_id, first_name, last_name, email, organisation, role, consent, responses, normalized_responses, scores, bands, classification, recommendations, created_at, updated_at'
      )
      .eq('survey_id', id)
      .eq('id', submissionId)
      .maybeSingle(),
  ])

  if (!surveyRow || submissionError || !submissionRow) {
    return NextResponse.json({ ok: false, error: 'response_not_found' }, { status: 404 })
  }

  const scoringConfig = surveyRow.scoring_config as ScoringConfig
  const normalizedResponses =
    (submissionRow.normalized_responses as Record<string, number> | null) ??
    ((submissionRow.responses as Record<string, number> | null) ?? {})

  const scores = computeScores(normalizedResponses, scoringConfig)
  const bands = getBands(scores, scoringConfig)
  const classification = classifyResult(scores, scoringConfig)

  return NextResponse.json({
    ok: true,
    survey: surveyRow,
    submission: submissionRow,
    computedReport: {
      scores,
      bands,
      classification,
      recommendations: classification?.recommendations ?? [],
    },
  })
}
