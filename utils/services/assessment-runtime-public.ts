import { createAdminClient } from '@/utils/supabase/admin'
import {
  loadAssessmentRuntimeQuestions,
  normalizeAssessmentRuntimePresentation,
  type RuntimeAssessmentPayload,
  type RuntimeAssessmentPresentation,
  type RuntimeAssessmentQuestion,
  type RuntimeRenderableAssessment,
} from '@/utils/services/assessment-runtime-content'

type PublicRuntimeAssessmentRow = RuntimeRenderableAssessment & {
  status: string
  is_public: boolean
}

export type GetRuntimePublicAssessmentResult =
  | {
      ok: true
      data: {
        context: 'public'
        assessment: RuntimeAssessmentPayload
        questions: RuntimeAssessmentQuestion[]
        runnerConfig: RuntimeAssessmentPresentation['runnerConfig']
        reportConfig: RuntimeAssessmentPresentation['reportConfig']
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

  const assessment = assessmentRow as PublicRuntimeAssessmentRow
  const questionResult = await loadAssessmentRuntimeQuestions(adminClient, assessment.id)
  if (!questionResult.ok) {
    return questionResult
  }

  const presentation = normalizeAssessmentRuntimePresentation(assessment)

  return {
    ok: true,
    data: {
      context: 'public',
      assessment: presentation.assessment,
      questions: questionResult.questions,
      runnerConfig: presentation.runnerConfig,
      reportConfig: presentation.reportConfig,
    },
  }
}
