import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import {
  createAiReadinessV2ExperienceConfig,
  createAiReadinessV2QuestionBank,
  createAiReadinessV2ReportTemplate,
  createAiReadinessV2ScoringConfig,
} from '@/utils/assessments/ai-readiness-v2-blueprint'
import {
  normalizeReportConfig,
  normalizeRunnerConfig,
} from '@/utils/assessments/experience-config'
import { withAssessmentV2ExperienceConfig } from '@/utils/assessments/v2-experience-config'

type AdminClient = RouteAuthSuccess['adminClient']

function supportsAiReadinessSeed(assessmentKey: string | null) {
  if (!assessmentKey) return false
  return assessmentKey.includes('ai')
}

export async function seedAdminAssessmentV2AiReadiness(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const assessment = await input.adminClient
    .from('assessments')
    .select('id, key, runner_config, report_config')
    .eq('id', input.assessmentId)
    .maybeSingle()

  if (assessment.error || !assessment.data) {
    return { ok: false as const, error: 'assessment_not_found' as const }
  }

  if (!supportsAiReadinessSeed(assessment.data.key ?? null)) {
    return { ok: false as const, error: 'assessment_not_supported' as const }
  }

  const runnerConfig = normalizeRunnerConfig(assessment.data.runner_config)
  const reportConfig = normalizeReportConfig(assessment.data.report_config)
  const nextRunnerConfig = withAssessmentV2ExperienceConfig(
    assessment.data.runner_config,
    runnerConfig,
    createAiReadinessV2ExperienceConfig()
  )

  const update = await input.adminClient
    .from('assessments')
    .update({
      runner_config: nextRunnerConfig,
      report_config: {
        ...reportConfig,
        v2_runtime_enabled: true,
      },
      v2_question_bank: createAiReadinessV2QuestionBank(),
      v2_scoring_config: createAiReadinessV2ScoringConfig(),
      v2_report_template: createAiReadinessV2ReportTemplate(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.assessmentId)
    .select('id')
    .maybeSingle()

  if (update.error || !update.data) {
    return { ok: false as const, error: 'seed_failed' as const }
  }

  return {
    ok: true as const,
    data: {
      assessmentId: input.assessmentId,
    },
  }
}
