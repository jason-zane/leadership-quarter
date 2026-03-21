import { buildRuntimeQuestions, getRuntimeScale } from '@/utils/assessments/assessment-runtime-model'
import type { AssessmentDefinition, DefinitionValidation } from '@/utils/assessments/assessment-definition-model'
import {
  normalizeAssessmentRuntimePresentation,
  type RuntimeAssessmentPayload,
  type RuntimeAssessmentPresentation,
  type RuntimeAssessmentQuestion,
} from '@/utils/services/assessment-runtime-content'
import {
  getAssessmentDefinitionBundle,
  getAssessmentReadinessData,
  type AssessmentReadiness,
} from '@/utils/services/assessment-definition-bundle'
import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export type AssessmentRuntimeData = {
  assessment: RuntimeAssessmentPayload
  questions: RuntimeAssessmentQuestion[]
  runnerConfig: RuntimeAssessmentPresentation['runnerConfig']
  reportConfig: RuntimeAssessmentPresentation['reportConfig']
  v2ExperienceConfig: RuntimeAssessmentPresentation['v2ExperienceConfig']
  scale: RuntimeAssessmentPresentation['scale']
  definition: AssessmentDefinition
  validation: DefinitionValidation
  runtimeMeta: {
    runtimeVersion: 'v2'
    runtimeSchemaVersion: number
    assessmentVersion: number
  }
}

export async function getAssessmentRuntimeData(input: {
  adminClient: AdminClient
  assessmentId?: string
  assessmentKey?: string
}): Promise<
  | {
      ok: true
      data: AssessmentRuntimeData
    }
  | {
      ok: false
      error: 'assessment_not_found' | 'questions_load_failed'
    }
> {
  const bundle = await getAssessmentDefinitionBundle({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
    assessmentKey: input.assessmentKey,
  })
  if (!bundle.ok) {
    return { ok: false, error: bundle.error }
  }

  const { definition, validation } = bundle.data
  const presentation = normalizeAssessmentRuntimePresentation({
    ...definition.assessment,
    runner_config: definition.assessment.runnerConfigSource,
    report_config: definition.assessment.reportConfig,
  })
  const questions = buildRuntimeQuestions(definition.questionBank)
  if (questions.length === 0) {
    return { ok: false, error: 'questions_load_failed' }
  }

  return {
    ok: true,
    data: {
      assessment: presentation.assessment,
      questions,
      runnerConfig: presentation.runnerConfig,
      reportConfig: presentation.reportConfig,
      v2ExperienceConfig: presentation.v2ExperienceConfig,
      scale: getRuntimeScale(definition.questionBank),
      definition,
      validation,
      runtimeMeta: {
        runtimeVersion: 'v2',
        runtimeSchemaVersion: 1,
        assessmentVersion: definition.assessment.version,
      },
    },
  }
}

export { getAssessmentReadinessData }
export type { AssessmentReadiness }
