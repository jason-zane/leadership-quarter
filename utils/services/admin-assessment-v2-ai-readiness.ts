import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import { createAiReadinessV2ExperienceConfig, createAiReadinessV2QuestionBank, createAiReadinessV2ReportTemplate, createAiReadinessV2ScoringConfig } from '@/utils/assessments/ai-readiness-v2-blueprint'
import { normalizeReportConfig, normalizeRunnerConfig } from '@/utils/assessments/experience-config'
import { withAssessmentV2ExperienceConfig } from '@/utils/assessments/v2-experience-config'
import { saveAdminAssessmentV2QuestionBank } from '@/utils/services/admin-assessment-v2-question-bank'
import { saveAdminAssessmentV2ScoringConfig } from '@/utils/services/admin-assessment-v2-scoring'

type AdminClient = RouteAuthSuccess['adminClient']

function isSchemaError(error: { message?: string; details?: string | null; hint?: string | null } | null | undefined) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase()
  return text.includes('column') || text.includes('schema') || text.includes('does not exist')
}

export async function seedAdminAssessmentV2AiReadiness(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const assessmentResult = await input.adminClient
    .from('assessments')
    .select('id, key, runner_config, report_config')
    .eq('id', input.assessmentId)
    .maybeSingle()

  if (assessmentResult.error || !assessmentResult.data) {
    return { ok: false as const, error: 'assessment_not_found' as const }
  }

  if (assessmentResult.data.key !== 'ai_readiness_orientation_v1') {
    return { ok: false as const, error: 'assessment_not_supported' as const }
  }

  const questionBankResult = await saveAdminAssessmentV2QuestionBank({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
    questionBank: createAiReadinessV2QuestionBank(),
  })
  if (!questionBankResult.ok) {
    return { ok: false as const, error: 'question_bank_seed_failed' as const }
  }

  const scoringResult = await saveAdminAssessmentV2ScoringConfig({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
    scoringConfig: createAiReadinessV2ScoringConfig(),
  })
  if (!scoringResult.ok) {
    return { ok: false as const, error: 'scoring_seed_failed' as const }
  }

  const runnerConfig = normalizeRunnerConfig(assessmentResult.data.runner_config)
  const reportConfig = normalizeReportConfig(assessmentResult.data.report_config)
  const nextRunnerConfig = withAssessmentV2ExperienceConfig(
    assessmentResult.data.runner_config ?? {},
    {
      ...runnerConfig,
      intro: 'AI readiness assessment',
      title: 'AI Readiness Orientation',
      subtitle: 'Answer each question based on how you currently work with AI so the profile reflects your practical readiness, judgement, and capability.',
      estimated_minutes: 6,
      start_cta_label: 'Start assessment',
      completion_screen_title: 'Assessment complete',
      completion_screen_body: 'Your responses are in. Your AI readiness profile is ready.',
      completion_screen_cta_label: 'View profile',
      completion_screen_cta_href: '/framework/lq-ai-readiness',
    },
    createAiReadinessV2ExperienceConfig()
  )

  const assessmentUpdate = await input.adminClient
    .from('assessments')
    .update({
      runner_config: nextRunnerConfig,
      report_config: {
        ...reportConfig,
        title: 'AI Readiness Profile',
        subtitle: 'Your current profile across openness, risk posture, and capability, with practical next steps.',
        next_steps_cta_label: 'Explore AI readiness',
        next_steps_cta_href: '/framework/lq-ai-readiness',
        v2_runtime_enabled: true,
        v2_cutover_status: 'shadow_ready',
      },
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.assessmentId)

  if (assessmentUpdate.error) {
    return { ok: false as const, error: 'experience_seed_failed' as const }
  }

  const reportsResult = await input.adminClient
    .from('v2_assessment_reports')
    .select('id')
    .eq('assessment_id', input.assessmentId)

  if (!reportsResult.error) {
    if ((reportsResult.data ?? []).length === 0) {
      await input.adminClient.from('v2_assessment_reports').insert({
        assessment_id: input.assessmentId,
        name: 'AI Readiness Candidate Report',
        report_kind: 'audience',
        audience_role: 'candidate',
        base_report_id: null,
        override_definition: {},
        status: 'published',
        is_default: true,
        sort_order: 0,
        template_definition: createAiReadinessV2ReportTemplate(),
        updated_at: new Date().toISOString(),
      })
    }
  } else if (!isSchemaError(reportsResult.error)) {
    return { ok: false as const, error: 'report_seed_failed' as const }
  }

  return {
    ok: true as const,
    data: {
      questionBank: questionBankResult.data.questionBank,
      scoringConfig: scoringResult.data.scoringConfig,
    },
  }
}
