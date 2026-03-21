import { createAdminClient } from '@/utils/supabase/admin'
import { getAssessmentRuntime } from '@/utils/services/assessment-runtime'
import type {
  RuntimeAssessmentPayload,
  RuntimeAssessmentPresentation,
  RuntimeAssessmentQuestion,
} from '@/utils/services/assessment-runtime-content'
import type { AssessmentExperienceConfig } from '@/utils/assessments/assessment-experience-config'

export type GetRuntimePublicAssessmentResult =
  | {
      ok: true
      data: {
        context: 'public'
        assessment: RuntimeAssessmentPayload
        questions: RuntimeAssessmentQuestion[]
        runnerConfig: RuntimeAssessmentPresentation['runnerConfig']
        reportConfig: RuntimeAssessmentPresentation['reportConfig']
        v2ExperienceConfig?: AssessmentExperienceConfig
        scale: RuntimeAssessmentPresentation['scale']
      }
    }
  | {
      ok: false
      error: 'missing_service_role' | 'assessment_not_found' | 'questions_load_failed'
    }

export async function getRuntimePublicAssessment(input: {
  assessmentKey: string
}): Promise<GetRuntimePublicAssessmentResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return { ok: false, error: 'missing_service_role' }
  }

  const { data: assessmentRow, error: assessmentError } = await adminClient
    .from('assessments')
    .select('id, key, name:external_name, description, status, is_public, version, runner_config, report_config')
    .eq('key', input.assessmentKey)
    .eq('status', 'active')
    .eq('is_public', true)
    .maybeSingle()

  if (assessmentError || !assessmentRow) {
    return { ok: false, error: 'assessment_not_found' }
  }

  const v2Runtime = await getAssessmentRuntime({
    adminClient,
    assessmentKey: input.assessmentKey,
  })
  if (!v2Runtime.ok) {
    return { ok: false, error: v2Runtime.error }
  }

  return {
    ok: true,
    data: {
      context: 'public',
      assessment: v2Runtime.data.assessment,
      questions: v2Runtime.data.questions,
      runnerConfig: v2Runtime.data.runnerConfig,
      reportConfig: v2Runtime.data.reportConfig,
      v2ExperienceConfig: v2Runtime.data.v2ExperienceConfig,
      scale: v2Runtime.data.scale,
    },
  }
}
