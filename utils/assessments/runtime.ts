import type { ScoringConfig, ScoringEngineType } from '@/utils/assessments/types'
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
  status: string
  scoringConfig: ScoringConfig
  scoringEngine: ScoringEngineType
  questions: RuntimeQuestion[]
}

type AssessmentWithOptionalEngine = {
  id: string
  key: string
  name: string
  status: string
  scoring_config: unknown
  scoring_engine?: string | null
}

function isScoringConfig(value: unknown): value is ScoringConfig {
  if (!value || typeof value !== 'object') return false
  const cfg = value as { dimensions?: unknown; classifications?: unknown }
  return Array.isArray(cfg.dimensions) && Array.isArray(cfg.classifications)
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
  input: { assessmentId?: string; assessmentKey?: string }
): Promise<{ ok: true; runtime: AssessmentRuntime } | { ok: false; error: string }> {
  const selector = input.assessmentId ? { column: 'id', value: input.assessmentId } : { column: 'key', value: input.assessmentKey }
  if (!selector.value) {
    return { ok: false, error: 'assessment_selector_required' }
  }

  // Compatible with environments where scoring_engine may not exist yet.
  const primarySelect =
    'id, key, name, status, scoring_config, scoring_engine'
  const fallbackSelect =
    'id, key, name, status, scoring_config'

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

  const scoringConfig = isScoringConfig(assessmentRow.scoring_config)
    ? assessmentRow.scoring_config
    : { dimensions: [], classifications: [] }

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
      status: assessmentRow.status,
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
