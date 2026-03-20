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
        'id, assessment_id, invitation_id, contact_id, first_name, last_name, email, organisation, role, consent, responses, normalized_responses, scores, bands, classification, recommendations, excluded_from_analysis, excluded_from_analysis_at, excluded_from_analysis_reason, created_at, updated_at'
      )
      .eq('assessment_id', id)
      .eq('is_preview_sample', false)
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id, submissionId } = await params

  let body: {
    excludedFromAnalysis?: unknown
    reason?: unknown
  }

  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  if (typeof body.excludedFromAnalysis !== 'boolean') {
    return NextResponse.json({ ok: false, error: 'invalid_exclusion_value' }, { status: 400 })
  }

  const reason =
    typeof body.reason === 'string' && body.reason.trim().length > 0
      ? body.reason.trim().slice(0, 500)
      : null

  const excludedFromAnalysis = body.excludedFromAnalysis
  const patch = excludedFromAnalysis
    ? {
        excluded_from_analysis: true,
        excluded_from_analysis_at: new Date().toISOString(),
        excluded_from_analysis_reason: reason,
      }
    : {
        excluded_from_analysis: false,
        excluded_from_analysis_at: null,
        excluded_from_analysis_reason: null,
      }

  const { data, error } = await auth.adminClient
    .from('assessment_submissions')
    .update(patch)
    .eq('assessment_id', id)
    .eq('is_preview_sample', false)
    .eq('id', submissionId)
    .select('id, excluded_from_analysis, excluded_from_analysis_at, excluded_from_analysis_reason')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ ok: false, error: 'response_update_failed' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: 'response_not_found' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    submission: data,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; submissionId: string }> }
) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id, submissionId } = await params

  const { data, error } = await auth.adminClient
    .from('assessment_submissions')
    .delete()
    .eq('assessment_id', id)
    .eq('is_preview_sample', false)
    .eq('id', submissionId)
    .select('id')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ ok: false, error: 'response_delete_failed' }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ ok: false, error: 'response_not_found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, deletedId: data.id })
}
