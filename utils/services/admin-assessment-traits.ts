import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'

type AdminClient = RouteAuthSuccess['adminClient']

export type TraitPayload = {
  dimensionId?: string | null
  code?: string
  name?: string
  externalName?: string | null
  description?: string | null
  scoreMethod?: 'mean' | 'sum'
}

export type TraitQuestionMappingItem = {
  questionId: string
  weight?: number
  reverseScored?: boolean
}

export async function listAdminAssessmentTraits(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const { data: traits, error } = await input.adminClient
    .from('assessment_traits')
    .select(`
      id, assessment_id, dimension_id, code, name, external_name, description, score_method,
      assessment_dimensions(id, code, name, external_name, position),
      trait_question_mappings(id, trait_id, question_id, weight, reverse_scored, assessment_questions(id, question_key, text, sort_order))
    `)
    .eq('assessment_id', input.assessmentId)
    .order('code')

  if (error) {
    return { ok: false as const, error: 'traits_fetch_failed' as const }
  }

  return { ok: true as const, data: { traits: traits ?? [] } }
}

export async function createAdminAssessmentTrait(input: {
  adminClient: AdminClient
  assessmentId: string
  payload: TraitPayload | null
}) {
  const code = String(input.payload?.code ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
  const name = String(input.payload?.name ?? '').trim()

  if (!code || !name) {
    return { ok: false as const, error: 'invalid_fields' as const }
  }

  const { data, error } = await input.adminClient
    .from('assessment_traits')
    .insert({
      assessment_id: input.assessmentId,
      dimension_id: input.payload?.dimensionId ?? null,
      code,
      name,
      external_name: input.payload?.externalName ?? null,
      description: input.payload?.description ?? null,
      score_method: input.payload?.scoreMethod ?? 'mean',
    })
    .select('id, assessment_id, dimension_id, code, name, external_name, description, score_method')
    .single()

  if (error || !data) {
    return { ok: false as const, error: 'trait_create_failed' as const, message: error?.message }
  }

  return { ok: true as const, data: { trait: data } }
}

export async function updateAdminAssessmentTrait(input: {
  adminClient: AdminClient
  assessmentId: string
  traitId: string
  payload: TraitPayload | null
}) {
  const updates: Record<string, unknown> = {}

  if (typeof input.payload?.code === 'string') {
    updates.code = input.payload.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
  }
  if (typeof input.payload?.name === 'string') updates.name = input.payload.name.trim()
  if ('externalName' in (input.payload ?? {})) updates.external_name = input.payload?.externalName ?? null
  if ('description' in (input.payload ?? {})) updates.description = input.payload?.description ?? null
  if ('dimensionId' in (input.payload ?? {})) updates.dimension_id = input.payload?.dimensionId ?? null
  if (input.payload?.scoreMethod) updates.score_method = input.payload.scoreMethod

  if (Object.keys(updates).length === 0) {
    return { ok: false as const, error: 'no_updates' as const }
  }

  const { data, error } = await input.adminClient
    .from('assessment_traits')
    .update(updates)
    .eq('id', input.traitId)
    .eq('assessment_id', input.assessmentId)
    .select('id, assessment_id, dimension_id, code, name, external_name, description, score_method')
    .single()

  if (error || !data) {
    return { ok: false as const, error: 'trait_update_failed' as const }
  }

  return { ok: true as const, data: { trait: data } }
}

export async function deleteAdminAssessmentTrait(input: {
  adminClient: AdminClient
  assessmentId: string
  traitId: string
}) {
  const { error } = await input.adminClient
    .from('assessment_traits')
    .delete()
    .eq('id', input.traitId)
    .eq('assessment_id', input.assessmentId)

  if (error) {
    return { ok: false as const, error: 'trait_delete_failed' as const }
  }

  return { ok: true as const }
}

export async function getTraitQuestionMappings(input: {
  adminClient: AdminClient
  traitId: string
}) {
  const { data, error } = await input.adminClient
    .from('trait_question_mappings')
    .select('id, trait_id, question_id, weight, reverse_scored, assessment_questions(id, question_key, text, sort_order)')
    .eq('trait_id', input.traitId)

  if (error) {
    return { ok: false as const, error: 'mappings_fetch_failed' as const }
  }

  return { ok: true as const, data: { mappings: data ?? [] } }
}

export async function replaceTraitQuestionMappings(input: {
  adminClient: AdminClient
  assessmentId: string
  traitId: string
  mappings: TraitQuestionMappingItem[]
}) {
  // Verify trait belongs to assessment
  const { data: trait, error: traitError } = await input.adminClient
    .from('assessment_traits')
    .select('id')
    .eq('id', input.traitId)
    .eq('assessment_id', input.assessmentId)
    .maybeSingle()

  if (traitError || !trait) {
    return { ok: false as const, error: 'trait_not_found' as const }
  }

  // Delete existing mappings
  const { error: deleteError } = await input.adminClient
    .from('trait_question_mappings')
    .delete()
    .eq('trait_id', input.traitId)

  if (deleteError) {
    return { ok: false as const, error: 'mappings_delete_failed' as const }
  }

  if (input.mappings.length === 0) {
    return { ok: true as const, data: { mappings: [] } }
  }

  const rows = input.mappings.map((m) => ({
    trait_id: input.traitId,
    question_id: m.questionId,
    weight: m.weight ?? 1,
    reverse_scored: m.reverseScored ?? false,
  }))

  const { data, error } = await input.adminClient
    .from('trait_question_mappings')
    .insert(rows)
    .select('id, trait_id, question_id, weight, reverse_scored')

  if (error) {
    return { ok: false as const, error: 'mappings_insert_failed' as const, message: error.message }
  }

  return { ok: true as const, data: { mappings: data ?? [] } }
}
