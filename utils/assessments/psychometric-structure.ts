import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export type PsychometricQuestion = {
  id: string
  questionKey: string
  text: string
  legacyDimension: string | null
  isReverseCoded: boolean
  sortOrder: number
}

export type PsychometricScaleSource = 'trait_mapped' | 'legacy_dimension'

export type PsychometricScaleItem = {
  questionId: string
  questionKey: string
  text: string
  weight: number
  reverseScored: boolean
  legacyDimension: string | null
  sortOrder: number
}

export type PsychometricScale = {
  key: string
  label: string
  source: PsychometricScaleSource
  traitId: string | null
  dimensionId: string | null
  dimensionCode: string | null
  legacyDimension: string | null
  items: PsychometricScaleItem[]
}

export type PsychometricStructureWarning = {
  code:
    | 'legacy_question_unmapped'
    | 'question_mapped_to_multiple_traits'
    | 'trait_has_too_few_items'
    | 'mapping_question_missing'
  message: string
  questionId?: string
  questionKey?: string
  scaleKey?: string
}

export type PsychometricStructure = {
  questions: PsychometricQuestion[]
  primaryScales: PsychometricScale[]
  traitScales: PsychometricScale[]
  legacyScales: PsychometricScale[]
  warnings: PsychometricStructureWarning[]
  hasTraitScales: boolean
  scalePoints: number
}

type TraitRow = {
  id: string
  code: string
  name: string
  dimension_id: string | null
  assessment_dimensions:
    | { id: string; code: string; name: string }
    | Array<{ id: string; code: string; name: string }>
    | null
  trait_question_mappings: Array<{
    question_id: string
    weight: number
    reverse_scored: boolean
  }>
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function reverseLikert(value: number, scalePoints: number) {
  return (scalePoints + 1) - value
}

export function resolveKeyedItemValue(
  item: Pick<PsychometricScaleItem, 'questionKey' | 'reverseScored'>,
  responses: Record<string, number>,
  scalePoints = 5
): number | null {
  const raw = responses[item.questionKey]
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  return item.reverseScored ? reverseLikert(raw, scalePoints) : raw
}

export function buildScaleMatrix(
  scale: Pick<PsychometricScale, 'items'>,
  responseMaps: Array<Record<string, number>>
): number[][] | null {
  if (scale.items.length === 0) return null

  const matrix: number[][] = scale.items.map(() => [])
  for (const resp of responseMaps) {
    const row = scale.items.map((item) => resolveKeyedItemValue(item, resp))
    if (row.some((value) => value === null)) continue
    row.forEach((value, index) => {
      matrix[index]!.push(value as number)
    })
  }

  const n = matrix[0]?.length ?? 0
  return n >= 2 ? matrix : null
}

export function buildScaleItemValueMap(
  scale: Pick<PsychometricScale, 'items'>,
  responseMaps: Array<Record<string, number>>
): Map<string, number[]> {
  const valuesByQuestion = new Map<string, number[]>()

  for (const item of scale.items) {
    valuesByQuestion.set(item.questionKey, [])
  }

  for (const resp of responseMaps) {
    for (const item of scale.items) {
      const keyed = resolveKeyedItemValue(item, resp)
      if (keyed === null) continue
      valuesByQuestion.get(item.questionKey)!.push(keyed)
    }
  }

  return valuesByQuestion
}

export function countScaleItemMissing(
  scale: Pick<PsychometricScale, 'items'>,
  responseMaps: Array<Record<string, number>>
): Map<string, number> {
  const missingByQuestion = new Map<string, number>()

  for (const item of scale.items) {
    missingByQuestion.set(item.questionKey, 0)
  }

  for (const resp of responseMaps) {
    for (const item of scale.items) {
      const raw = resp[item.questionKey]
      if (typeof raw !== 'number' || !Number.isFinite(raw)) {
        missingByQuestion.set(item.questionKey, (missingByQuestion.get(item.questionKey) ?? 0) + 1)
      }
    }
  }

  return missingByQuestion
}

export async function loadAssessmentPsychometricStructure(
  adminClient: AdminClient,
  assessmentId: string
): Promise<PsychometricStructure> {
  const [questionsResult, traitsResult, assessmentResult] = await Promise.all([
    adminClient
      .from('assessment_questions')
      .select('id, question_key, text, dimension, is_reverse_coded, sort_order')
      .eq('assessment_id', assessmentId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    adminClient
      .from('assessment_traits')
      .select(`
        id, code, name, dimension_id,
        assessment_dimensions(id, code, name),
        trait_question_mappings(question_id, weight, reverse_scored)
      `)
      .eq('assessment_id', assessmentId)
      .order('code', { ascending: true }),
    adminClient.from('assessments').select('scoring_config').eq('id', assessmentId).maybeSingle(),
  ])
  const scoringConfig = assessmentResult.data?.scoring_config as Record<string, unknown> | null
  const scalePoints: number = (scoringConfig?.scale_config as Record<string, unknown> | null)?.points as number ?? 5

  const questions = (questionsResult.data ?? []).map((row) => ({
    id: row.id as string,
    questionKey: row.question_key as string,
    text: row.text as string,
    legacyDimension: (row.dimension as string | null) ?? null,
    isReverseCoded: Boolean(row.is_reverse_coded),
    sortOrder: Number(row.sort_order ?? 0),
  }))

  const questionById = new Map(questions.map((question) => [question.id, question]))
  const warnings: PsychometricStructureWarning[] = []
  const questionTraitCount = new Map<string, number>()

  const traitScales = ((traitsResult.data ?? []) as unknown as TraitRow[])
    .map((trait) => {
      const dimension = pickOne(trait.assessment_dimensions)
      const items = (trait.trait_question_mappings ?? [])
        .map((mapping) => {
          const question = questionById.get(mapping.question_id)
          if (!question) {
            warnings.push({
              code: 'mapping_question_missing',
              message: `Trait ${trait.name} references a question that is no longer active.`,
              scaleKey: trait.code,
            })
            return null
          }

          questionTraitCount.set(question.id, (questionTraitCount.get(question.id) ?? 0) + 1)

          return {
            questionId: question.id,
            questionKey: question.questionKey,
            text: question.text,
            weight: Number(mapping.weight ?? 1),
            reverseScored: question.isReverseCoded,
            legacyDimension: question.legacyDimension,
            sortOrder: question.sortOrder,
          } satisfies PsychometricScaleItem
        })
        .filter((item): item is PsychometricScaleItem => item !== null)
        .sort((a, b) => a.sortOrder - b.sortOrder)

      if (items.length > 0 && items.length < 2) {
        warnings.push({
          code: 'trait_has_too_few_items',
          message: `Trait ${trait.name} has fewer than two mapped items, so reliability and factor diagnostics will be weak.`,
          scaleKey: trait.code,
        })
      }

      return {
        key: trait.code,
        label: trait.name,
        source: 'trait_mapped',
        traitId: trait.id,
        dimensionId: trait.dimension_id,
        dimensionCode: dimension?.code ?? null,
        legacyDimension:
          items.length > 0 && items.every((item) => item.legacyDimension === items[0]?.legacyDimension)
            ? (items[0]?.legacyDimension ?? null)
            : null,
        items,
      } satisfies PsychometricScale
    })
    .filter((scale) => scale.items.length > 0)

  const legacyScales = Array.from(
    questions.reduce((acc, question) => {
      const key = question.legacyDimension?.trim()
      if (!key) return acc
      const existing = acc.get(key)
      const item = {
        questionId: question.id,
        questionKey: question.questionKey,
        text: question.text,
        weight: 1,
        reverseScored: question.isReverseCoded,
        legacyDimension: question.legacyDimension,
        sortOrder: question.sortOrder,
      } satisfies PsychometricScaleItem
      if (existing) {
        existing.items.push(item)
      } else {
        acc.set(key, {
          key,
          label: key,
          source: 'legacy_dimension',
          traitId: null,
          dimensionId: null,
          dimensionCode: key,
          legacyDimension: key,
          items: [item],
        } satisfies PsychometricScale)
      }
      return acc
    }, new Map<string, PsychometricScale>())
      .values()
  )
    .map((scale) => ({
      ...scale,
      items: [...scale.items].sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .sort((a, b) => a.key.localeCompare(b.key))

  if (traitScales.length > 0) {
    for (const question of questions) {
      if (!question.legacyDimension) continue

      const mappedCount = questionTraitCount.get(question.id) ?? 0
      if (mappedCount === 0) {
        warnings.push({
          code: 'legacy_question_unmapped',
          message: `Question ${question.questionKey} is still assigned to legacy dimension ${question.legacyDimension} but is not mapped to a trait.`,
          questionId: question.id,
          questionKey: question.questionKey,
        })
      } else if (mappedCount > 1) {
        warnings.push({
          code: 'question_mapped_to_multiple_traits',
          message: `Question ${question.questionKey} is mapped to multiple traits and needs review.`,
          questionId: question.id,
          questionKey: question.questionKey,
        })
      }
    }
  }

  const hasTraitScales = traitScales.length > 0

  return {
    questions,
    primaryScales: hasTraitScales ? traitScales : legacyScales,
    traitScales,
    legacyScales,
    warnings,
    hasTraitScales,
    scalePoints,
  }
}
