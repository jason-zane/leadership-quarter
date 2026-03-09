import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'

type AdminClient = RouteAuthSuccess['adminClient']

export type NormGroupPayload = {
  name?: string
  description?: string | null
  filters?: Record<string, unknown> | null
  isGlobal?: boolean
}

export async function listAdminNormGroups(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const { data, error } = await input.adminClient
    .from('norm_groups')
    .select('id, assessment_id, name, description, filters, n, is_global, created_at, updated_at')
    .eq('assessment_id', input.assessmentId)
    .order('created_at')

  if (error) {
    return { ok: false as const, error: 'norm_groups_fetch_failed' as const }
  }

  // Also fetch norm_stats for each group
  const groupIds = (data ?? []).map((g) => g.id)
  let normStats: Array<{
    id: string
    norm_group_id: string
    trait_id: string
    mean: number
    sd: number
    p10: number | null
    p25: number | null
    p50: number | null
    p75: number | null
    p90: number | null
    min: number | null
    max: number | null
    computed_at: string
    assessment_traits: { code: string; name: string } | { code: string; name: string }[] | null
  }> = []

  if (groupIds.length > 0) {
    const { data: statsData } = await input.adminClient
      .from('norm_stats')
      .select('id, norm_group_id, trait_id, mean, sd, p10, p25, p50, p75, p90, min, max, computed_at, assessment_traits(code, name)')
      .in('norm_group_id', groupIds)

    normStats = statsData ?? []
  }

  const statsByGroup = new Map<string, typeof normStats>()
  for (const stat of normStats) {
    const list = statsByGroup.get(stat.norm_group_id) ?? []
    list.push(stat)
    statsByGroup.set(stat.norm_group_id, list)
  }

  const groups = (data ?? []).map((g) => ({
    ...g,
    norm_stats: statsByGroup.get(g.id) ?? [],
  }))

  return { ok: true as const, data: { normGroups: groups } }
}

export async function createAdminNormGroup(input: {
  adminClient: AdminClient
  assessmentId: string
  payload: NormGroupPayload | null
}) {
  const name = String(input.payload?.name ?? '').trim()
  if (!name) {
    return { ok: false as const, error: 'invalid_fields' as const }
  }

  const { data, error } = await input.adminClient
    .from('norm_groups')
    .insert({
      assessment_id: input.assessmentId,
      name,
      description: input.payload?.description ?? null,
      filters: input.payload?.filters ?? null,
      n: 0,
      is_global: input.payload?.isGlobal ?? false,
      updated_at: new Date().toISOString(),
    })
    .select('id, assessment_id, name, description, filters, n, is_global, created_at, updated_at')
    .single()

  if (error || !data) {
    return { ok: false as const, error: 'norm_group_create_failed' as const, message: error?.message }
  }

  return { ok: true as const, data: { normGroup: data } }
}

export async function updateAdminNormGroup(input: {
  adminClient: AdminClient
  assessmentId: string
  normGroupId: string
  payload: NormGroupPayload | null
}) {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof input.payload?.name === 'string') updates.name = input.payload.name.trim()
  if ('description' in (input.payload ?? {})) updates.description = input.payload?.description ?? null
  if ('filters' in (input.payload ?? {})) updates.filters = input.payload?.filters ?? null
  if (typeof input.payload?.isGlobal === 'boolean') updates.is_global = input.payload.isGlobal

  const { data, error } = await input.adminClient
    .from('norm_groups')
    .update(updates)
    .eq('id', input.normGroupId)
    .eq('assessment_id', input.assessmentId)
    .select('id, assessment_id, name, description, filters, n, is_global, created_at, updated_at')
    .single()

  if (error || !data) {
    return { ok: false as const, error: 'norm_group_update_failed' as const }
  }

  return { ok: true as const, data: { normGroup: data } }
}

export async function deleteAdminNormGroup(input: {
  adminClient: AdminClient
  assessmentId: string
  normGroupId: string
}) {
  const { error } = await input.adminClient
    .from('norm_groups')
    .delete()
    .eq('id', input.normGroupId)
    .eq('assessment_id', input.assessmentId)

  if (error) {
    return { ok: false as const, error: 'norm_group_delete_failed' as const }
  }

  return { ok: true as const }
}
