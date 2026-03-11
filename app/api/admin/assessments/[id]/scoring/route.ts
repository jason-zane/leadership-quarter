import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { analyzeScoringConfig, normalizeScoringConfig } from '@/utils/assessments/scoring-config'
import {
  getAssessmentScoringModel,
  listAdminScoringModels,
  updateAdminScoringModel,
} from '@/utils/services/admin-scoring-models'
import type { ScoringConfig } from '@/utils/assessments/types'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const searchParams = new URL(request.url).searchParams
  const scoringModelId = searchParams.get('modelId')
  const model = await getAssessmentScoringModel({
    adminClient: auth.adminClient,
    assessmentId: id,
    scoringModelId,
  })
  const modelsResult = await listAdminScoringModels({
    adminClient: auth.adminClient,
    assessmentId: id,
  })

  if (!model || !modelsResult.ok) {
    return NextResponse.json({ ok: false, error: 'scoring_not_found' }, { status: 404 })
  }

  const normalized = normalizeScoringConfig(model.config)
  const { data: questions } = await auth.adminClient
    .from('assessment_questions')
    .select('dimension, is_active')
    .eq('assessment_id', id)

  const analysis = analyzeScoringConfig(normalized, questions ?? [])

  return NextResponse.json({
    ok: true,
    scoringConfig: analysis.config,
    analysis,
    assessment: modelsResult.data.assessment,
    scoringModels: modelsResult.data.models,
    selectedScoringModel: model,
    selectedScoringModelId: model.id,
    // Backward compatibility alias.
    survey: modelsResult.data.assessment,
  })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = (await request.json().catch(() => null)) as {
    scoringConfig?: unknown
    scoringModelId?: string | null
  } | null

  if (!body?.scoringConfig || typeof body.scoringConfig !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_scoring_config' }, { status: 400 })
  }

  const normalizedConfig = normalizeScoringConfig(body.scoringConfig)
  const targetModel = await getAssessmentScoringModel({
    adminClient: auth.adminClient,
    assessmentId: id,
    scoringModelId: body.scoringModelId,
  })
  if (!targetModel) {
    return NextResponse.json({ ok: false, error: 'scoring_model_not_found' }, { status: 404 })
  }

  const updateResult = await updateAdminScoringModel({
    adminClient: auth.adminClient,
    assessmentId: id,
    scoringModelId: targetModel.id,
    payload: {
      config: normalizedConfig,
      mode: targetModel.mode,
      isDefault: targetModel.is_default,
      status: targetModel.status,
    },
  })

  if (!updateResult.ok) {
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
    scoringModel: updateResult.data.scoringModel,
    // Backward compatibility alias.
    survey: updateResult.data.scoringModel,
  })
}
