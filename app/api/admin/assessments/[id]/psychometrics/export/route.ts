import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { loadAssessmentPsychometricStructure } from '@/utils/assessments/psychometric-structure'
import { getAdminAssessmentAnalytics } from '@/utils/services/admin-assessment-analytics'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const { adminClient } = auth

  const [assessmentResult, structure, analyticsResult] = await Promise.all([
    adminClient
      .from('assessments')
      .select('id, name, key, scoring_config, validation_stage, status')
      .eq('id', assessmentId)
      .maybeSingle(),
    loadAssessmentPsychometricStructure(adminClient, assessmentId),
    getAdminAssessmentAnalytics({ adminClient, assessmentId }),
  ])

  if (!assessmentResult.data) {
    return NextResponse.json({ error: 'assessment_not_found' }, { status: 404 })
  }

  const assessment = assessmentResult.data

  // Approved analysis run
  const { data: approvedRun } = await adminClient
    .from('psychometric_analysis_runs')
    .select('id, analysis_type, status, sample_n, summary, warnings, completed_at, approved_at')
    .eq('assessment_id', assessmentId)
    .eq('status', 'approved')
    .order('approved_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let approvedRunDetail = null
  if (approvedRun?.id) {
    const [scaleDiagnostics, itemDiagnostics, factorModels] = await Promise.all([
      adminClient.from('psychometric_scale_diagnostics').select('*').eq('analysis_run_id', approvedRun.id),
      adminClient.from('psychometric_item_diagnostics').select('*').eq('analysis_run_id', approvedRun.id),
      adminClient.from('psychometric_factor_models').select('*').eq('analysis_run_id', approvedRun.id),
    ])
    approvedRunDetail = {
      ...approvedRun,
      scaleDiagnostics: scaleDiagnostics.data ?? [],
      itemDiagnostics: itemDiagnostics.data ?? [],
      factorModels: factorModels.data ?? [],
    }
  }

  // Norm groups
  const { data: normGroups } = await adminClient
    .from('norm_groups')
    .select('id, name, is_global, n, filters, band_thresholds')
    .eq('assessment_id', assessmentId)

  const normGroupIds = (normGroups ?? []).map((g) => g.id as string)
  const { data: normStats } = normGroupIds.length > 0
    ? await adminClient.from('norm_stats').select('*').in('norm_group_id', normGroupIds)
    : { data: [] }

  // Interpretation rules
  const { data: interpretationRules } = await adminClient
    .from('interpretation_rules')
    .select('*')
    .eq('assessment_id', assessmentId)

  const scoringConfig = assessment.scoring_config as Record<string, unknown> | null
  const scalePoints = (scoringConfig?.scale_config as Record<string, unknown> | null)?.points ?? 5

  const exportPayload = {
    generated_at: new Date().toISOString(),
    assessment: {
      id: assessment.id,
      name: assessment.name,
      key: assessment.key,
      scale_points: scalePoints,
      validation_stage: assessment.validation_stage ?? 'pilot',
      status: assessment.status,
    },
    structure: {
      dimensions: Array.from(
        new Map(
          structure.traitScales
            .filter((s) => s.dimensionId)
            .map((s) => [s.dimensionId!, { id: s.dimensionId, code: s.dimensionCode, label: s.label }])
        ).values()
      ),
      traits: structure.traitScales.map((scale) => ({
        key: scale.key,
        label: scale.label,
        dimension_id: scale.dimensionId,
        items: scale.items.map((item) => ({
          question_key: item.questionKey,
          text: item.text,
          weight: item.weight,
          reverse_scored: item.reverseScored,
        })),
      })),
      warnings: structure.warnings,
    },
    item_analytics: analyticsResult.data.itemAnalytics,
    dimension_reliability: analyticsResult.data.dimensionReliability,
    reference_groups: (normGroups ?? []).map((group) => ({
      ...group,
      norm_stats: (normStats ?? []).filter((stat) => stat.norm_group_id === group.id),
    })),
    interpretation_rules: interpretationRules ?? [],
    approved_analysis_run: approvedRunDetail,
  }

  const assessmentKey = String(assessment.key ?? assessment.id)
  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${assessmentKey}-technical-manual.json"`,
    },
  })
}
