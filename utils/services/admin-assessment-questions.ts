import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import { normalizeScoringConfig } from '@/utils/assessments/scoring-config'
import { setAssessmentDefaultScoringModelConfig } from '@/utils/services/admin-scoring-models'
import type { ScoringConfig } from '@/utils/assessments/types'

type AdminClient = RouteAuthSuccess['adminClient']
type NormalizedScoringConfig = ReturnType<typeof normalizeScoringConfig>

export type AdminAssessmentQuestionInput = {
  questionKey?: string
  text?: string
  dimension?: string
  isReverseCoded?: boolean
  sortOrder?: number
  isActive?: boolean
}

type QuestionRecord = {
  id: string
  assessment_id: string
  question_key: string
  text: string
  dimension: string
  is_reverse_coded: boolean
  sort_order: number
  is_active: boolean
}

type QuestionsResult =
  | {
      ok: true
      data: {
        questions: QuestionRecord[]
      }
    }
  | {
      ok: false
      error: 'questions_list_failed'
    }

type QuestionMutationResult =
  | {
      ok: true
      data: {
        question?: QuestionRecord
        questions?: QuestionRecord[]
      }
    }
  | {
      ok: false
      error:
        | 'invalid_fields'
        | 'question_create_failed'
        | 'question_update_failed'
        | 'question_delete_failed'
        | 'scoring_config_sync_failed'
      message?: string
    }

type DeleteQuestionResult =
  | {
      ok: true
    }
  | {
      ok: false
      error: 'question_delete_failed' | 'scoring_config_sync_failed'
      message?: string
    }

async function loadAssessmentScoringConfig(adminClient: AdminClient, assessmentId: string) {
  const { data: assessment } = await adminClient
    .from('assessments')
    .select('scoring_config')
    .eq('id', assessmentId)
    .single()

  if (!assessment) {
    return { ok: false as const, error: 'assessment_not_found' }
  }

  return {
    ok: true as const,
    config: normalizeScoringConfig(assessment.scoring_config as ScoringConfig),
  }
}

async function persistScoringConfigDimensions(input: {
  adminClient: AdminClient
  assessmentId: string
  config: NormalizedScoringConfig
  dimensions: NormalizedScoringConfig['dimensions']
}) {
  try {
    await setAssessmentDefaultScoringModelConfig({
      adminClient: input.adminClient,
      assessmentId: input.assessmentId,
      config: { ...input.config, dimensions: input.dimensions },
    })
    return null
  } catch (error) {
    return error instanceof Error ? error.message : 'Could not sync default scoring model.'
  }
}

async function syncAddedQuestions(
  adminClient: AdminClient,
  assessmentId: string,
  added: Array<{ question_key: string; dimension: string }>
) {
  if (added.length === 0) return null

  const configResult = await loadAssessmentScoringConfig(adminClient, assessmentId)
  if (!configResult.ok) {
    return configResult.error
  }

  const updatedDimensions = configResult.config.dimensions.map((dimension) => {
    const newKeys = added
      .filter((question) => question.dimension === dimension.key)
      .map((question) => question.question_key)
      .filter((key) => !dimension.question_keys.includes(key))

    if (newKeys.length === 0) {
      return dimension
    }

    return {
      ...dimension,
      question_keys: [...dimension.question_keys, ...newKeys],
    }
  })

  return persistScoringConfigDimensions({
    adminClient,
    assessmentId,
    config: configResult.config,
    dimensions: updatedDimensions,
  })
}

async function syncQuestionKeyChange(input: {
  adminClient: AdminClient
  assessmentId: string
  questionKey: string
  fromDimension: string | null
  toDimension: string | null
}) {
  if (!input.fromDimension && !input.toDimension) return null

  const configResult = await loadAssessmentScoringConfig(input.adminClient, input.assessmentId)
  if (!configResult.ok) {
    return configResult.error
  }

  const updatedDimensions = configResult.config.dimensions.map((dimension) => {
    let keys = [...dimension.question_keys]

    if (dimension.key === input.fromDimension) {
      keys = keys.filter((key) => key !== input.questionKey)
    }

    if (dimension.key === input.toDimension && !keys.includes(input.questionKey)) {
      keys = [...keys, input.questionKey]
    }

    return { ...dimension, question_keys: keys }
  })

  return persistScoringConfigDimensions({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
    config: configResult.config,
    dimensions: updatedDimensions,
  })
}

export async function listAdminAssessmentQuestions(input: {
  adminClient: AdminClient
  assessmentId: string
}): Promise<QuestionsResult> {
  const { data, error } = await input.adminClient
    .from('assessment_questions')
    .select(
      'id, assessment_id, question_key, text, dimension, is_reverse_coded, sort_order, is_active, created_at, updated_at'
    )
    .eq('assessment_id', input.assessmentId)
    .order('sort_order', { ascending: true })

  if (error) {
    return { ok: false, error: 'questions_list_failed' }
  }

  return {
    ok: true,
    data: {
      questions: (data ?? []) as QuestionRecord[],
    },
  }
}

export async function createAdminAssessmentQuestions(input: {
  adminClient: AdminClient
  assessmentId: string
  payload: unknown
}): Promise<QuestionMutationResult> {
  const rawItems = Array.isArray(input.payload) ? input.payload : [input.payload]
  const items = rawItems as Array<AdminAssessmentQuestionInput | null>

  for (const item of items) {
    const questionKey = String(item?.questionKey ?? '').trim()
    const text = String(item?.text ?? '').trim()
    const dimension = String(item?.dimension ?? '').trim()

    if (!questionKey || !text || !dimension) {
      return { ok: false, error: 'invalid_fields' }
    }
  }

  const { data: maxRow } = await input.adminClient
    .from('assessment_questions')
    .select('sort_order')
    .eq('assessment_id', input.assessmentId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  let nextSortOrder = Number(maxRow?.sort_order ?? 0) + 10
  const nowIso = new Date().toISOString()
  const rows = items.map((item) => {
    const sortOrder =
      typeof item?.sortOrder === 'number' && Number.isFinite(item.sortOrder) ? item.sortOrder : nextSortOrder
    nextSortOrder += 10

    return {
      assessment_id: input.assessmentId,
      question_key: String(item?.questionKey ?? '').trim(),
      text: String(item?.text ?? '').trim(),
      dimension: String(item?.dimension ?? '').trim(),
      is_reverse_coded: item?.isReverseCoded ?? false,
      sort_order: sortOrder,
      is_active: item?.isActive ?? true,
      updated_at: nowIso,
    }
  })

  if (rows.length === 1) {
    const { data, error } = await input.adminClient
      .from('assessment_questions')
      .insert(rows[0])
      .select('id, assessment_id, question_key, text, dimension, is_reverse_coded, sort_order, is_active')
      .single()

    if (error || !data) {
      return {
        ok: false,
        error: 'question_create_failed',
        message: error?.message,
      }
    }

    const syncError = await syncAddedQuestions(input.adminClient, input.assessmentId, [
      { question_key: data.question_key, dimension: data.dimension },
    ])
    if (syncError) {
      return {
        ok: false,
        error: 'scoring_config_sync_failed',
        message: syncError,
      }
    }

    return {
      ok: true,
      data: {
        question: data as QuestionRecord,
      },
    }
  }

  const { data, error } = await input.adminClient
    .from('assessment_questions')
    .insert(rows)
    .select('id, assessment_id, question_key, text, dimension, is_reverse_coded, sort_order, is_active')

  if (error || !data) {
    return {
      ok: false,
      error: 'question_create_failed',
      message: error?.message,
    }
  }

  const syncError = await syncAddedQuestions(
    input.adminClient,
    input.assessmentId,
    data.map((question) => ({
      question_key: question.question_key,
      dimension: question.dimension,
    }))
  )
  if (syncError) {
    return {
      ok: false,
      error: 'scoring_config_sync_failed',
      message: syncError,
    }
  }

  return {
    ok: true,
    data: {
      questions: data as QuestionRecord[],
    },
  }
}

export async function updateAdminAssessmentQuestion(input: {
  adminClient: AdminClient
  assessmentId: string
  questionId: string
  payload: AdminAssessmentQuestionInput | null
}): Promise<QuestionMutationResult> {
  const { data: existing } = await input.adminClient
    .from('assessment_questions')
    .select('question_key, dimension')
    .eq('assessment_id', input.assessmentId)
    .eq('id', input.questionId)
    .single()

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof input.payload?.questionKey === 'string') updates.question_key = input.payload.questionKey.trim()
  if (typeof input.payload?.text === 'string') updates.text = input.payload.text.trim()
  if (typeof input.payload?.dimension === 'string') updates.dimension = input.payload.dimension.trim()
  if (typeof input.payload?.isReverseCoded === 'boolean') {
    updates.is_reverse_coded = input.payload.isReverseCoded
  }
  if (typeof input.payload?.sortOrder === 'number' && Number.isFinite(input.payload.sortOrder)) {
    updates.sort_order = input.payload.sortOrder
  }
  if (typeof input.payload?.isActive === 'boolean') updates.is_active = input.payload.isActive

  const { data, error } = await input.adminClient
    .from('assessment_questions')
    .update(updates)
    .eq('assessment_id', input.assessmentId)
    .eq('id', input.questionId)
    .select('id, assessment_id, question_key, text, dimension, is_reverse_coded, sort_order, is_active')
    .single()

  if (error || !data) {
    return { ok: false, error: 'question_update_failed' }
  }

  if (existing) {
    const oldKey = existing.question_key
    const newKey = data.question_key
    const oldDimension = existing.dimension
    const newDimension = data.dimension

    if (oldKey !== newKey || oldDimension !== newDimension) {
      const syncError =
        (await syncQuestionKeyChange({
          adminClient: input.adminClient,
          assessmentId: input.assessmentId,
          questionKey: oldKey,
          fromDimension: oldDimension,
          toDimension: null,
        })) ??
        (await syncQuestionKeyChange({
          adminClient: input.adminClient,
          assessmentId: input.assessmentId,
          questionKey: newKey,
          fromDimension: null,
          toDimension: newDimension,
        }))

      if (syncError) {
        return {
          ok: false,
          error: 'scoring_config_sync_failed',
          message: syncError,
        }
      }
    }
  }

  return {
    ok: true,
    data: {
      question: data as QuestionRecord,
    },
  }
}

export async function deleteAdminAssessmentQuestion(input: {
  adminClient: AdminClient
  assessmentId: string
  questionId: string
}): Promise<DeleteQuestionResult> {
  const { data: existing } = await input.adminClient
    .from('assessment_questions')
    .select('question_key, dimension')
    .eq('assessment_id', input.assessmentId)
    .eq('id', input.questionId)
    .single()

  const { error } = await input.adminClient
    .from('assessment_questions')
    .delete()
    .eq('assessment_id', input.assessmentId)
    .eq('id', input.questionId)

  if (error) {
    return { ok: false, error: 'question_delete_failed' }
  }

  if (existing) {
    const syncError = await syncQuestionKeyChange({
      adminClient: input.adminClient,
      assessmentId: input.assessmentId,
      questionKey: existing.question_key,
      fromDimension: existing.dimension,
      toDimension: null,
    })

    if (syncError) {
      return {
        ok: false,
        error: 'scoring_config_sync_failed',
        message: syncError,
      }
    }
  }

  return { ok: true }
}
