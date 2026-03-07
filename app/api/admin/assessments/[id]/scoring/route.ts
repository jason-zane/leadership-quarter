import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { analyzeScoringConfig, normalizeScoringConfig } from '@/utils/assessments/scoring-config'
import type { ScoringConfig } from '@/utils/assessments/types'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const { data, error } = await auth.adminClient
    .from('assessments')
    .select('id, key, name, scoring_config, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'scoring_not_found' }, { status: 404 })
  }

  const normalized = normalizeScoringConfig(data.scoring_config)
  const { data: questions } = await auth.adminClient
    .from('assessment_questions')
    .select('dimension, is_active')
    .eq('assessment_id', id)

  const analysis = analyzeScoringConfig(normalized, questions ?? [])

  return NextResponse.json({
    ok: true,
    scoringConfig: analysis.config,
    analysis,
    assessment: data,
    // Backward compatibility alias.
    survey: data,
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = (await request.json().catch(() => null)) as { scoringConfig?: unknown } | null

  if (!body?.scoringConfig || typeof body.scoringConfig !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_scoring_config' }, { status: 400 })
  }

  const normalizedConfig = normalizeScoringConfig(body.scoringConfig)

  const { data, error } = await auth.adminClient
    .from('assessments')
    .update({
      scoring_config: normalizedConfig,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, scoring_config, updated_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'scoring_update_failed' }, { status: 500 })
  }

  const { data: questions } = await auth.adminClient
    .from('assessment_questions')
    .select('dimension, is_active')
    .eq('assessment_id', id)

  const analysis = analyzeScoringConfig(normalizedConfig as ScoringConfig, questions ?? [])

  return NextResponse.json({
    ok: true,
    scoringConfig: analysis.config,
    analysis,
    assessment: data,
    // Backward compatibility alias.
    survey: data,
  })
}
