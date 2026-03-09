import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'

type AdminClient = RouteAuthSuccess['adminClient']

export type DimensionPayload = {
  code?: string
  name?: string
  externalName?: string | null
  position?: number
}

export async function listAdminAssessmentDimensions(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const { data, error } = await input.adminClient
    .from('assessment_dimensions')
    .select('id, assessment_id, code, name, external_name, position')
    .eq('assessment_id', input.assessmentId)
    .order('position')

  if (error) {
    return { ok: false as const, error: 'dimensions_fetch_failed' as const }
  }

  return { ok: true as const, data: { dimensions: data ?? [] } }
}

export async function createAdminAssessmentDimension(input: {
  adminClient: AdminClient
  assessmentId: string
  payload: DimensionPayload | null
}) {
  const code = String(input.payload?.code ?? '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
  const name = String(input.payload?.name ?? '').trim()

  if (!code || !name) {
    return { ok: false as const, error: 'invalid_fields' as const }
  }

  const { data, error } = await input.adminClient
    .from('assessment_dimensions')
    .insert({
      assessment_id: input.assessmentId,
      code,
      name,
      external_name: input.payload?.externalName ?? null,
      position: input.payload?.position ?? 0,
    })
    .select('id, assessment_id, code, name, external_name, position')
    .single()

  if (error || !data) {
    return { ok: false as const, error: 'dimension_create_failed' as const, message: error?.message }
  }

  return { ok: true as const, data: { dimension: data } }
}

export async function updateAdminAssessmentDimension(input: {
  adminClient: AdminClient
  assessmentId: string
  dimensionId: string
  payload: DimensionPayload | null
}) {
  const updates: Record<string, unknown> = {}

  if (typeof input.payload?.code === 'string') {
    updates.code = input.payload.code.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
  }
  if (typeof input.payload?.name === 'string') updates.name = input.payload.name.trim()
  if ('externalName' in (input.payload ?? {})) updates.external_name = input.payload?.externalName ?? null
  if (typeof input.payload?.position === 'number') updates.position = input.payload.position

  if (Object.keys(updates).length === 0) {
    return { ok: false as const, error: 'no_updates' as const }
  }

  const { data, error } = await input.adminClient
    .from('assessment_dimensions')
    .update(updates)
    .eq('id', input.dimensionId)
    .eq('assessment_id', input.assessmentId)
    .select('id, assessment_id, code, name, external_name, position')
    .single()

  if (error || !data) {
    return { ok: false as const, error: 'dimension_update_failed' as const }
  }

  return { ok: true as const, data: { dimension: data } }
}

export async function deleteAdminAssessmentDimension(input: {
  adminClient: AdminClient
  assessmentId: string
  dimensionId: string
}) {
  const { error } = await input.adminClient
    .from('assessment_dimensions')
    .delete()
    .eq('id', input.dimensionId)
    .eq('assessment_id', input.assessmentId)

  if (error) {
    return { ok: false as const, error: 'dimension_delete_failed' as const }
  }

  return { ok: true as const }
}
