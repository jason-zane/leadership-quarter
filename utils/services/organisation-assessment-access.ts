import type { SupabaseClient } from '@supabase/supabase-js'

type AssessmentAccessPayload = {
  assessment_id?: string
  enabled?: boolean
  config_override?: Record<string, unknown>
  assessment_quota?: number | null
}

async function logAdminAction(input: {
  adminClient: SupabaseClient
  actorUserId: string
  action: string
  details?: Record<string, string | number | boolean | null>
}) {
  await input.adminClient.from('admin_audit_logs').insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    details: input.details ?? {},
  })
}

export async function listOrganisationAssessmentAccess(input: {
  adminClient: SupabaseClient
  organisationId: string
}): Promise<
  | { ok: true; data: { access: unknown[] } }
  | { ok: false; error: 'access_list_failed' }
> {
  const { data, error } = await input.adminClient
    .from('organisation_assessment_access')
    .select(
      'id, organisation_id, assessment_id, enabled, assessment_quota, config_override, created_at, updated_at, assessments(id, key, name, status)'
    )
    .eq('organisation_id', input.organisationId)
    .order('created_at', { ascending: false })

  if (error) {
    return { ok: false, error: 'access_list_failed' }
  }

  return {
    ok: true,
    data: {
      access: data ?? [],
    },
  }
}

export async function upsertOrganisationAssessmentAccess(input: {
  adminClient: SupabaseClient
  actorUserId: string
  organisationId: string
  payload: AssessmentAccessPayload | null
}): Promise<
  | { ok: true; data: { access: unknown } }
  | { ok: false; error: 'assessment_id_required' | 'access_upsert_failed'; message?: string }
> {
  const assessmentId = String(input.payload?.assessment_id ?? '').trim()
  if (!assessmentId) {
    return { ok: false, error: 'assessment_id_required' }
  }

  const { data, error } = await input.adminClient
    .from('organisation_assessment_access')
    .upsert(
      {
        organisation_id: input.organisationId,
        assessment_id: assessmentId,
        enabled: input.payload?.enabled ?? true,
        config_override: input.payload?.config_override ?? {},
        created_by: input.actorUserId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organisation_id,assessment_id' }
    )
    .select('id, organisation_id, assessment_id, enabled, config_override, created_at, updated_at')
    .single()

  if (error || !data) {
    return { ok: false, error: 'access_upsert_failed', message: error?.message }
  }

  await logAdminAction({
    adminClient: input.adminClient,
    actorUserId: input.actorUserId,
    action: 'organisation_assessment_access_granted',
    details: {
      organisation_id: input.organisationId,
      access_id: data.id,
      assessment_id: data.assessment_id,
      enabled: data.enabled,
    },
  })

  return {
    ok: true,
    data: {
      access: data,
    },
  }
}

export async function updateOrganisationAssessmentAccess(input: {
  adminClient: SupabaseClient
  actorUserId: string
  organisationId: string
  accessId: string
  payload: {
    enabled?: boolean
    config_override?: Record<string, unknown>
    assessment_quota?: number | null
  } | null
}): Promise<
  | { ok: true; data: { access: unknown } }
  | { ok: false; error: 'invalid_payload' | 'access_update_failed' }
> {
  if (
    !input.payload ||
    (input.payload.enabled === undefined &&
      input.payload.config_override === undefined &&
      !('assessment_quota' in input.payload))
  ) {
    return { ok: false, error: 'invalid_payload' }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.payload.enabled !== undefined) updates.enabled = input.payload.enabled
  if (input.payload.config_override !== undefined) updates.config_override = input.payload.config_override
  if ('assessment_quota' in input.payload) updates.assessment_quota = input.payload.assessment_quota

  const { data, error } = await input.adminClient
    .from('organisation_assessment_access')
    .update(updates)
    .eq('id', input.accessId)
    .eq('organisation_id', input.organisationId)
    .select('id, organisation_id, assessment_id, enabled, config_override, created_at, updated_at')
    .maybeSingle()

  if (error || !data) {
    return { ok: false, error: 'access_update_failed' }
  }

  await logAdminAction({
    adminClient: input.adminClient,
    actorUserId: input.actorUserId,
    action: 'organisation_assessment_access_updated',
    details: {
      organisation_id: input.organisationId,
      access_id: input.accessId,
      assessment_id: data.assessment_id,
      enabled: data.enabled,
    },
  })

  return {
    ok: true,
    data: {
      access: data,
    },
  }
}

export async function deleteOrganisationAssessmentAccess(input: {
  adminClient: SupabaseClient
  actorUserId: string
  organisationId: string
  accessId: string
}): Promise<
  | { ok: true }
  | { ok: false; error: 'access_delete_failed' }
> {
  const { data: existing } = await input.adminClient
    .from('organisation_assessment_access')
    .select('id, assessment_id, enabled')
    .eq('id', input.accessId)
    .eq('organisation_id', input.organisationId)
    .maybeSingle()

  const { error } = await input.adminClient
    .from('organisation_assessment_access')
    .delete()
    .eq('id', input.accessId)
    .eq('organisation_id', input.organisationId)

  if (error) {
    return { ok: false, error: 'access_delete_failed' }
  }

  await logAdminAction({
    adminClient: input.adminClient,
    actorUserId: input.actorUserId,
    action: 'organisation_assessment_access_removed',
    details: {
      organisation_id: input.organisationId,
      access_id: input.accessId,
      assessment_id: existing?.assessment_id ?? null,
      enabled: existing?.enabled ?? null,
    },
  })

  return { ok: true }
}
