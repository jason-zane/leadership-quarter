import { createAdminClient } from '@/utils/supabase/admin'
import {
  loadAssessmentRuntimeQuestions,
  toRuntimeAssessmentPayload,
  type AssessmentPayloadSource,
  type RuntimeAssessmentQuestion,
} from '@/utils/services/assessment-runtime-content'

type PublicAssessmentRow = AssessmentPayloadSource & {
  status: string
  is_public: boolean
}

export type GetPublicAssessmentResult =
  | {
      ok: true
      data: {
        assessment: ReturnType<typeof toRuntimeAssessmentPayload>
        survey: ReturnType<typeof toRuntimeAssessmentPayload>
        questions: RuntimeAssessmentQuestion[]
      }
    }
  | {
      ok: false
      error: 'missing_service_role' | 'survey_not_found' | 'questions_load_failed'
      message?: string
    }

export async function getPublicAssessment(input: {
  assessmentKey: string
}): Promise<GetPublicAssessmentResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      ok: false,
      error: 'missing_service_role',
      message: 'Supabase admin credentials are not configured.',
    }
  }

  const { data: assessmentRow } = await adminClient
    .from('assessments')
    .select('id, key, name:external_name, description, version, status, is_public')
    .eq('key', input.assessmentKey)
    .eq('status', 'active')
    .eq('is_public', true)
    .maybeSingle()

  if (!assessmentRow) {
    return { ok: false, error: 'survey_not_found' }
  }

  const assessment = assessmentRow as PublicAssessmentRow
  const questionResult = await loadAssessmentRuntimeQuestions(adminClient, assessment.id)
  if (!questionResult.ok) {
    return questionResult
  }

  const assessmentPayload = toRuntimeAssessmentPayload(assessment)

  return {
    ok: true,
    data: {
      assessment: assessmentPayload,
      survey: assessmentPayload,
      questions: questionResult.questions,
    },
  }
}
