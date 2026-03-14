import type { ScoringConfig, ScoringEngineType } from '@/utils/assessments/types'
import { normalizeReportConfig } from '@/utils/assessments/experience-config'
import { normalizeScoringConfig } from '@/utils/assessments/scoring-config'
import { shouldUseV2Runtime } from '@/utils/assessments/v2-runtime'
import type { V2QuestionBank } from '@/utils/assessments/v2-question-bank'
import type { V2ScoringConfig } from '@/utils/assessments/v2-scoring'
import { getAssessmentV2Runtime } from '@/utils/services/assessment-runtime-v2'
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
  runtimeVersion?: 'v1' | 'v2'
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

function parseScoringEngine(value: unknown): ScoringEngineType | null {
  if (value === 'rule_based' || value === 'psychometric' || value === 'hybrid') return value
  return null
}

async function hasTraitsConfigured(adminClient: AdminClient, assessmentId: string) {
  const { count, error } = await adminClient
    .from('assessment_traits')
    .select('id', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)

  if (error) return false
  return (count ?? 0) > 0
}

function inferEngineFromConfig(config: ScoringConfig, hasTraits: boolean): ScoringEngineType {
  const hasRuleConfig = config.dimensions.length > 0
  if (hasRuleConfig && hasTraits) return 'hybrid'
  if (hasTraits) return 'psychometric'
  return 'rule_based'
}

export async function resolveAssessmentRuntime(
  adminClient: AdminClient,
  input: { assessmentId?: string; assessmentKey?: string; forceV2?: boolean }
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

  if (shouldUseV2Runtime(assessmentRow.report_config, { forceV2: input.forceV2 })) {
    const v2Runtime = await getAssessmentV2Runtime({
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
        questions: v2Runtime.data.questions.map((question) => ({
          id: question.id,
          questionKey: question.question_key,
          isReverseCoded: question.is_reverse_coded,
        })),
        scoringConfig: normalizeScoringConfig({}),
        scoringEngine: 'rule_based',
        v2QuestionBank: v2Runtime.data.definition.questionBank,
        v2ScoringConfig: v2Runtime.data.definition.scoringConfig,
        v2ScalePoints: v2Runtime.data.scale.points,
        v2ScaleOrder: v2Runtime.data.definition.questionBank.scale.order,
      },
    }
  }

  const scoringConfig = normalizeScoringConfig(assessmentRow.scoring_config as ScoringConfig)

  const { data: questionRows, error: questionError } = await adminClient
    .from('assessment_questions')
    .select('id, question_key, is_reverse_coded')
    .eq('assessment_id', assessmentRow.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (questionError || !questionRows || questionRows.length === 0) {
    return { ok: false, error: 'questions_load_failed' }
  }

  const hasTraits = await hasTraitsConfigured(adminClient, assessmentRow.id)
  const configuredEngine = parseScoringEngine(assessmentRow.scoring_engine)
  const scoringEngine = configuredEngine ?? inferEngineFromConfig(scoringConfig, hasTraits)

  return {
    ok: true,
    runtime: {
      id: assessmentRow.id,
      key: assessmentRow.key,
      name: assessmentRow.name,
      version: undefined,
      status: assessmentRow.status,
      runtimeVersion: 'v1',
      reportConfig: normalizeReportConfig(assessmentRow.report_config),
      scoringConfig,
      scoringEngine,
      questions: questionRows.map((row) => ({
        id: row.id as string,
        questionKey: row.question_key as string,
        isReverseCoded: Boolean(row.is_reverse_coded),
      })),
    },
  }
}
