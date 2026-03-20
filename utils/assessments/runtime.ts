import type { ScoringConfig, ScoringEngineType } from '@/utils/assessments/types'
import { normalizeReportConfig } from '@/utils/assessments/experience-config'
import { normalizeScoringConfig } from '@/utils/assessments/scoring-config'
import type { V2QuestionBank } from '@/utils/assessments/v2-question-bank'
import type { V2ScoringConfig } from '@/utils/assessments/v2-scoring'
import { getAssessmentRuntime } from '@/utils/services/assessment-runtime'
import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export type RuntimeQuestion = {
  id: string
  questionKey: string
  isReverseCoded: boolean
}

export type AssessmentRuntime = {
  id: string
  key: string
  name: string
  version?: number
  status: string
  runtimeVersion?: 'v2'
  reportConfig?: ReturnType<typeof normalizeReportConfig>
  questions: RuntimeQuestion[]
  scoringConfig: ScoringConfig
  scoringEngine: ScoringEngineType
  v2QuestionBank?: V2QuestionBank
  v2ScoringConfig?: V2ScoringConfig
  v2ScalePoints?: number
  v2ScaleOrder?: 'ascending' | 'descending'
}

type AssessmentWithOptionalEngine = {
  id: string
  key: string
  name: string
  status: string
  scoring_config: unknown
  report_config?: unknown
  scoring_engine?: string | null
}

export async function resolveAssessmentRuntime(
  adminClient: AdminClient,
  input: { assessmentId?: string; assessmentKey?: string }
): Promise<{ ok: true; runtime: AssessmentRuntime } | { ok: false; error: string }> {
  const selector = input.assessmentId ? { column: 'id', value: input.assessmentId } : { column: 'key', value: input.assessmentKey }
  if (!selector.value) {
    return { ok: false, error: 'assessment_selector_required' }
  }

  // Compatible with environments where scoring_engine may not exist yet.
  const primarySelect =
    'id, key, name:external_name, status, scoring_config, report_config, scoring_engine'
  const fallbackSelect =
    'id, key, name:external_name, status, scoring_config, report_config'

  const primaryQuery = adminClient
    .from('assessments')
    .select(primarySelect)
    .eq(selector.column, selector.value)
    .maybeSingle()
  const primaryResult = await primaryQuery

  let assessmentRow: AssessmentWithOptionalEngine | null = null
  if (!primaryResult.error && primaryResult.data) {
    assessmentRow = primaryResult.data as AssessmentWithOptionalEngine
  } else {
    const fallbackQuery = adminClient
      .from('assessments')
      .select(fallbackSelect)
      .eq(selector.column, selector.value)
      .maybeSingle()
    const fallbackResult = await fallbackQuery
    if (fallbackResult.error || !fallbackResult.data) {
      return { ok: false, error: 'assessment_not_found' }
    }
    assessmentRow = fallbackResult.data as AssessmentWithOptionalEngine
  }

  if (!assessmentRow) {
    return { ok: false, error: 'assessment_not_found' }
  }

  const v2Runtime = await getAssessmentRuntime({
    adminClient,
    assessmentId: input.assessmentId,
    assessmentKey: input.assessmentKey,
  })
  if (!v2Runtime.ok) {
    return { ok: false, error: v2Runtime.error }
  }

  return {
    ok: true,
    runtime: {
      id: v2Runtime.data.assessment.id,
      key: v2Runtime.data.assessment.key,
      name: v2Runtime.data.assessment.name,
      version: v2Runtime.data.assessment.version,
      status: assessmentRow.status,
      runtimeVersion: 'v2',
      reportConfig: v2Runtime.data.reportConfig,
      scoringConfig: normalizeScoringConfig({}),
      scoringEngine: 'rule_based',
      questions: v2Runtime.data.questions.map((question) => ({
        id: question.id,
        questionKey: question.question_key,
        isReverseCoded: question.is_reverse_coded,
      })),
      v2QuestionBank: v2Runtime.data.definition.questionBank,
      v2ScoringConfig: v2Runtime.data.definition.scoringConfig,
      v2ScalePoints: v2Runtime.data.scale.points,
      v2ScaleOrder: v2Runtime.data.definition.questionBank.scale.order,
    },
  }
}
