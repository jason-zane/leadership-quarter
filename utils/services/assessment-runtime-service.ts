import { buildV2RuntimeQuestions, getV2RuntimeScale } from '@/utils/assessments/assessment-runtime-model'
import type { V2AssessmentDefinition, V2DefinitionValidation } from '@/utils/assessments/assessment-definition-model'
import {
  normalizeAssessmentRuntimePresentation,
  type RuntimeAssessmentPayload,
  type RuntimeAssessmentPresentation,
  type RuntimeAssessmentQuestion,
} from '@/utils/services/assessment-runtime-content'
import {
  getAssessmentV2DefinitionBundle,
  getAssessmentV2Readiness,
  type AssessmentV2Readiness,
} from '@/utils/services/assessment-definition-bundle'
import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export type AssessmentV2RuntimeData = {
  assessment: RuntimeAssessmentPayload
  questions: RuntimeAssessmentQuestion[]
  runnerConfig: RuntimeAssessmentPresentation['runnerConfig']
  reportConfig: RuntimeAssessmentPresentation['reportConfig']
  v2ExperienceConfig: RuntimeAssessmentPresentation['v2ExperienceConfig']
  scale: RuntimeAssessmentPresentation['scale']
  definition: V2AssessmentDefinition
  validation: V2DefinitionValidation
  runtimeMeta: {
    runtimeVersion: 'v2'
    runtimeSchemaVersion: number
    assessmentVersion: number
  }
}

export async function getAssessmentV2Runtime(input: {
  adminClient: AdminClient
  assessmentId?: string
  assessmentKey?: string
}): Promise<
  | {
      ok: true
      data: AssessmentV2RuntimeData
    }
  | {
      ok: false
      error: 'assessment_not_found' | 'questions_load_failed'
    }
> {
  const bundle = await getAssessmentV2DefinitionBundle({
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
  const questions = buildV2RuntimeQuestions(definition.questionBank)
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
      scale: getV2RuntimeScale(definition.questionBank),
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

export { getAssessmentV2Readiness }
export type { AssessmentV2Readiness }
