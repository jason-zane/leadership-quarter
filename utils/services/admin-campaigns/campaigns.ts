import {
  DEFAULT_CAMPAIGN_CONFIG,
  type CampaignConfig,
} from '@/utils/assessments/campaign-types'
import {
  isValidSlug,
  normalizeSlug,
  slugify,
} from '@/utils/services/admin-campaigns/shared'
import type {
  AdminCampaignCreatePayload,
  AdminCampaignUpdatePayload,
  AdminClient,
} from '@/utils/services/admin-campaigns/types'

function mergeCampaignConfig(
  currentConfig: unknown,
  patch: Partial<CampaignConfig>
): CampaignConfig {
  const mergedConfig = {
    ...DEFAULT_CAMPAIGN_CONFIG,
    ...((currentConfig as CampaignConfig | null) ?? {}),
    ...patch,
  } as CampaignConfig

  if (!mergedConfig.demographics_enabled) {
    mergedConfig.demographics_fields = []
  }

  return mergedConfig
}

export async function listAdminCampaigns(input: {
  adminClient: AdminClient
}): Promise<
  | {
      ok: true
      data: {
        campaigns: unknown[]
      }
    }
  | {
      ok: false
      error: 'campaigns_list_failed'
    }
> {
  const { data, error } = await input.adminClient
    .from('campaigns')
    .select(
      `
      id, organisation_id, name, external_name, description, slug, status, config, runner_overrides, created_at,
      organisations(id, name, slug),
      campaign_assessments(id, assessment_id, sort_order, is_active)
    `
    )
    .order('created_at', { ascending: false })

  if (error) {
    return { ok: false, error: 'campaigns_list_failed' }
  }

  return {
    ok: true,
    data: {
      campaigns: data ?? [],
    },
  }
}

export async function createAdminCampaign(input: {
  adminClient: AdminClient
  userId: string
  payload: AdminCampaignCreatePayload | null
}): Promise<
  | {
      ok: true
      data: {
        campaign: unknown
      }
    }
  | {
      ok: false
      error: 'name_required' | 'invalid_slug' | 'slug_taken' | 'create_failed' | 'assessments_link_failed'
      detail?: string
      code?: string
      message?: string
    }
> {
  const name = String(input.payload?.name ?? '').trim()
  const externalName = String(input.payload?.external_name ?? '').trim()
  if (!name || !externalName) {
    return { ok: false, error: 'name_required' }
  }

  const slug = String(input.payload?.slug ?? '').trim() || slugify(externalName)
  if (!isValidSlug(slug)) {
    return { ok: false, error: 'invalid_slug' }
  }

  const config: CampaignConfig = {
    ...DEFAULT_CAMPAIGN_CONFIG,
    ...(input.payload?.config ?? {}),
  }

  const { data: campaign, error: campaignError } = await input.adminClient
    .from('campaigns')
    .insert({
      organisation_id: input.payload?.organisation_id ?? null,
      name,
      external_name: externalName,
      description: input.payload?.description ?? null,
      slug,
      config,
      runner_overrides: input.payload?.runner_overrides ?? {},
      created_by: input.userId,
    })
    .select('id, organisation_id, name, external_name, description, slug, status, config, created_at')
    .single()

  if (campaignError) {
    if (campaignError.code === '23505') {
      return { ok: false, error: 'slug_taken' }
    }

    return {
      ok: false,
      error: 'create_failed',
      detail: campaignError.message,
      code: campaignError.code,
    }
  }

  const assessmentIds = input.payload?.assessment_ids ?? input.payload?.survey_ids ?? []
  if (assessmentIds.length > 0) {
    const assessmentRows = assessmentIds.map((assessmentId, index) => ({
      campaign_id: (campaign as { id: string }).id,
      assessment_id: assessmentId,
      sort_order: index,
    }))

    const { error } = await input.adminClient
      .from('campaign_assessments')
      .insert(assessmentRows)

    if (error) {
      return {
        ok: false,
        error: 'assessments_link_failed',
        message: error.message,
      }
    }
  }

  return {
    ok: true,
    data: {
      campaign,
    },
  }
}

export async function getAdminCampaign(input: {
  adminClient: AdminClient
  campaignId: string
}): Promise<
  | {
      ok: true
      data: {
        campaign: unknown
      }
    }
  | {
      ok: false
      error: 'campaign_not_found'
    }
> {
  const { data, error } = await input.adminClient
    .from('campaigns')
    .select(
      `
      id, organisation_id, name, external_name, description, slug, status, config, created_at, updated_at,
      runner_overrides,
      organisations(id, name, slug),
      campaign_assessments(id, assessment_id, sort_order, is_active, report_overrides, created_at, assessments(id, key, name, external_name, description, status, runner_config, report_config, scoring_config))
    `
    )
    .eq('id', input.campaignId)
    .maybeSingle()

  if (error || !data) {
    return { ok: false, error: 'campaign_not_found' }
  }

  return {
    ok: true,
    data: {
      campaign: data,
    },
  }
}

export async function updateAdminCampaign(input: {
  adminClient: AdminClient
  campaignId: string
  payload: AdminCampaignUpdatePayload | null
}): Promise<
  | {
      ok: true
      data: {
        campaign: unknown
      }
    }
  | {
      ok: false
      error: 'invalid_payload' | 'invalid_slug' | 'slug_taken' | 'update_failed'
    }
> {
  if (!input.payload) {
    return { ok: false, error: 'invalid_payload' }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.payload.name !== undefined) {
    updates.name = String(input.payload.name).trim()
  }
  if (input.payload.external_name !== undefined) {
    updates.external_name = String(input.payload.external_name).trim()
  }
  if ('description' in input.payload) {
    updates.description = input.payload.description ?? null
  }

  if (input.payload.slug !== undefined) {
    const slug = normalizeSlug(input.payload.slug)
    if (!isValidSlug(slug)) {
      return { ok: false, error: 'invalid_slug' }
    }
    updates.slug = slug
  }

  if (input.payload.status !== undefined) updates.status = input.payload.status
  if (input.payload.organisation_id !== undefined) {
    updates.organisation_id = input.payload.organisation_id
  }
  if (input.payload.runner_overrides !== undefined) {
    updates.runner_overrides = input.payload.runner_overrides
  }

  if (input.payload.config !== undefined) {
    const { data: existing } = await input.adminClient
      .from('campaigns')
      .select('config')
      .eq('id', input.campaignId)
      .maybeSingle()

    updates.config = mergeCampaignConfig(existing?.config, input.payload.config)
  }

  const { data, error } = await input.adminClient
    .from('campaigns')
    .update(updates)
    .eq('id', input.campaignId)
    .select('id, organisation_id, name, external_name, description, slug, status, config, runner_overrides, updated_at')
    .maybeSingle()

  if (error || !data) {
    if (error?.code === '23505') {
      return { ok: false, error: 'slug_taken' }
    }

    return { ok: false, error: 'update_failed' }
  }

  return {
    ok: true,
    data: {
      campaign: data,
    },
  }
}

export async function deleteAdminCampaign(input: {
  adminClient: AdminClient
  campaignId: string
}): Promise<
  | { ok: true }
  | {
      ok: false
      error: 'delete_failed'
    }
> {
  const { error } = await input.adminClient
    .from('campaigns')
    .delete()
    .eq('id', input.campaignId)

  if (error) {
    return { ok: false, error: 'delete_failed' }
  }

  return { ok: true }
}
