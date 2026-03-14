import {
  normalizeReportConfig,
  normalizeRunnerConfig,
} from '@/utils/assessments/experience-config'
import {
  getAssessmentV2ExperienceConfig,
  type AssessmentV2ExperienceConfig,
} from '@/utils/assessments/v2-experience-config'
import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export type RuntimeAssessmentQuestion = {
  id: string
  question_key: string
  text: string
  dimension: string
  is_reverse_coded: boolean
  sort_order: number
}

export type RuntimeAssessmentScale = {
  points: number
  labels: string[]
}

export type AssessmentPayloadSource = {
  id: string
  key: string
  name: string
  description?: string | null
  version: number
}

export type RuntimeRenderableAssessment = AssessmentPayloadSource & {
  runner_config: unknown
  report_config: unknown
}

export type RuntimeAssessmentPayload = {
  id: string
  key: string
  name: string
  description: string | null
  version: number
}

export type RuntimeAssessmentPresentation = {
  assessment: RuntimeAssessmentPayload
  runnerConfig: ReturnType<typeof normalizeRunnerConfig>
  reportConfig: ReturnType<typeof normalizeReportConfig>
  v2ExperienceConfig: AssessmentV2ExperienceConfig
  scale: RuntimeAssessmentScale
}

export function toRuntimeAssessmentPayload(
  assessment: AssessmentPayloadSource
): RuntimeAssessmentPayload {
  return {
    id: assessment.id,
    key: assessment.key,
    name: assessment.name,
    description: assessment.description ?? null,
    version: assessment.version,
  }
}

export function normalizeAssessmentRuntimePresentation(
  assessment: RuntimeRenderableAssessment
): RuntimeAssessmentPresentation {
  return {
    assessment: toRuntimeAssessmentPayload(assessment),
    runnerConfig: normalizeRunnerConfig(assessment.runner_config),
    reportConfig: normalizeReportConfig(assessment.report_config),
    v2ExperienceConfig: getAssessmentV2ExperienceConfig(assessment.runner_config),
    scale: {
      points: 5,
      labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'],
    },
  }
}

export async function loadAssessmentRuntimeQuestions(
  adminClient: AdminClient,
  assessmentId: string
):
  Promise<
    | {
        ok: true
        questions: RuntimeAssessmentQuestion[]
      }
    | {
        ok: false
        error: 'questions_load_failed'
      }
  > {
  const { data: questions, error: questionError } = await adminClient
    .from('assessment_questions')
    .select('id, question_key, text, dimension, is_reverse_coded, sort_order')
    .eq('assessment_id', assessmentId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (questionError) {
    return { ok: false, error: 'questions_load_failed' }
  }

  return {
    ok: true,
    questions: (questions ?? []) as RuntimeAssessmentQuestion[],
  }
}
