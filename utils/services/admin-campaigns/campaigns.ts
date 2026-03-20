import {
  DEFAULT_CAMPAIGN_CONFIG,
  type CampaignConfig,
  normalizeCampaignConfig,
} from '@/utils/assessments/campaign-types'
import {
  isValidSlug,
  normalizeSlug,
  slugify,
} from '@/utils/services/admin-campaigns/shared'
import { resolveAdminCampaignJourney } from '@/utils/services/admin-campaigns/journey'
import type {
  AdminCampaignCreatePayload,
  AdminCampaignUpdatePayload,
  AdminClient,
} from '@/utils/services/admin-campaigns/types'

type AdminCampaignListScope = 'all' | 'lq' | 'client'

function mergeCampaignConfig(
  currentConfig: unknown,
  patch: Partial<CampaignConfig>
): CampaignConfig {
  return normalizeCampaignConfig({
    ...DEFAULT_CAMPAIGN_CONFIG,
    ...((currentConfig as CampaignConfig | null) ?? {}),
    ...patch,
  })
}

function normalizeListScope(value: string | undefined): AdminCampaignListScope {
  return value === 'lq' || value === 'client' ? value : 'all'
}

function isMissingFlowStepsTable(error: { message?: string; details?: string | null; hint?: string | null } | null | undefined) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase()
  return text.includes('campaign_flow_steps') && (text.includes('relation') || text.includes('table') || text.includes('schema'))
}

function matchesCampaignSearch(campaign: {
  name?: string | null
  external_name?: string | null
  slug?: string | null
  organisations?: { name?: string | null } | Array<{ name?: string | null }> | null
}, query: string) {
  if (!query) return true

  const relation = Array.isArray(campaign.organisations)
    ? (campaign.organisations[0] ?? null)
    : campaign.organisations

  const haystack = [
    campaign.name,
    campaign.external_name,
    campaign.slug,
    relation?.name,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

export async function listAdminCampaigns(input: {
  adminClient: AdminClient
  filters?: {
    q?: string
    scope?: string
  }
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
  const scope = normalizeListScope(input.filters?.scope)
  const searchQuery = String(input.filters?.q ?? '').trim().toLowerCase()

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

  const campaigns = (data ?? []).map((campaign) => ({
    ...campaign,
    config: normalizeCampaignConfig((campaign as { config?: unknown }).config),
  }))
    .filter((campaign) => {
      if (scope === 'lq') return !(campaign as { organisation_id?: string | null }).organisation_id
      if (scope === 'client') return Boolean((campaign as { organisation_id?: string | null }).organisation_id)
      return true
    })
    .filter((campaign) => matchesCampaignSearch(campaign as Parameters<typeof matchesCampaignSearch>[0], searchQuery))

  return {
    ok: true,
    data: {
      campaigns,
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

  const slug = slugify(externalName)
  if (!isValidSlug(slug)) {
    return { ok: false, error: 'invalid_slug' }
  }

  const config: CampaignConfig = {
    ...DEFAULT_CAMPAIGN_CONFIG,
    ...(input.payload?.config ?? {}),
  }
  const normalizedConfig = normalizeCampaignConfig(config)

  const insertRow: Record<string, unknown> = {
    organisation_id: input.payload?.organisation_id ?? null,
    name,
    external_name: externalName,
    description: input.payload?.description ?? null,
    slug,
    config: normalizedConfig,
    runner_overrides: input.payload?.runner_overrides ?? {},
    created_by: input.userId,
  }
  if (input.payload?.status) {
    insertRow.status = input.payload.status
  }

  const { data: campaign, error: campaignError } = await input.adminClient
    .from('campaigns')
    .insert(insertRow)
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

    const insertedAssessments = (await input.adminClient
      .from('campaign_assessments')
      .select('id, sort_order')
      .eq('campaign_id', (campaign as { id: string }).id)
      .order('sort_order', { ascending: true }))

    if (!insertedAssessments.error && insertedAssessments.data) {
      const flowInsert = await input.adminClient
        .from('campaign_flow_steps')
        .insert(
          insertedAssessments.data.map((row) => ({
            campaign_id: (campaign as { id: string }).id,
            step_type: 'assessment',
            sort_order: row.sort_order,
            campaign_assessment_id: row.id,
            screen_config: {},
          }))
        )

      if (flowInsert.error && !isMissingFlowStepsTable(flowInsert.error)) {
        return {
          ok: false,
          error: 'assessments_link_failed',
          message: flowInsert.error.message,
        }
      }
    }
  }

  return {
    ok: true,
    data: {
      campaign: {
        ...(campaign as Record<string, unknown>),
        config: normalizeCampaignConfig((campaign as { config?: unknown }).config),
      },
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
        flowSteps: unknown[]
        flowStepsBackedByTable: boolean
        resolvedJourney: unknown
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
      campaign_assessments(id, assessment_id, sort_order, is_active, report_overrides, report_delivery_config, created_at, assessments(id, key, name, external_name, description, status, runner_config, report_config, scoring_config))
    `
    )
    .eq('id', input.campaignId)
    .maybeSingle()

  if (error || !data) {
    return { ok: false, error: 'campaign_not_found' }
  }

  const campaign = {
    ...(data as Record<string, unknown>),
    config: normalizeCampaignConfig((data as { config?: unknown }).config),
  }
  const journeyResult = await resolveAdminCampaignJourney({
    adminClient: input.adminClient,
    campaignId: input.campaignId,
    campaign: campaign as Parameters<typeof resolveAdminCampaignJourney>[0]['campaign'],
  })

  return {
    ok: true,
    data: {
      campaign,
      flowSteps: journeyResult.ok ? journeyResult.data.flowSteps : [],
      flowStepsBackedByTable: journeyResult.ok ? journeyResult.data.flowStepsBackedByTable : false,
      resolvedJourney: journeyResult.ok ? journeyResult.data.resolvedJourney : null,
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
  let existingCampaign: { config?: unknown; external_name?: string | null } | null = null

  async function loadExistingCampaign() {
    if (existingCampaign) return existingCampaign

    const { data, error } = await input.adminClient
      .from('campaigns')
      .select('config, external_name')
      .eq('id', input.campaignId)
      .maybeSingle()

    if (error) return null

    existingCampaign = data ?? null
    return existingCampaign
  }

  if (input.payload.name !== undefined) {
    updates.name = String(input.payload.name).trim()
  }
  if (input.payload.external_name !== undefined) {
    const externalName = String(input.payload.external_name).trim()
    updates.external_name = externalName

    const currentCampaign = await loadExistingCampaign()
    const previousExternalName = String(currentCampaign?.external_name ?? '').trim()

    if (externalName !== previousExternalName) {
      const derivedSlug = slugify(externalName)
      if (!isValidSlug(derivedSlug)) {
        return { ok: false, error: 'invalid_slug' }
      }
      updates.slug = derivedSlug
    }
  }
  if ('description' in input.payload) {
    updates.description = input.payload.description ?? null
  }

  if (input.payload.slug !== undefined && input.payload.external_name === undefined) {
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
    const currentCampaign = await loadExistingCampaign()
    updates.config = mergeCampaignConfig(currentCampaign?.config, input.payload.config)
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
      error: 'campaign_has_activity' | 'delete_failed'
    }
> {
  const [invitationResult, submissionResult] = await Promise.all([
    input.adminClient
      .from('assessment_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', input.campaignId),
    input.adminClient
      .from('assessment_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', input.campaignId)
      .eq('is_preview_sample', false),
  ])

  if (invitationResult.error || submissionResult.error) {
    return { ok: false, error: 'delete_failed' }
  }

  if ((invitationResult.count ?? 0) > 0 || (submissionResult.count ?? 0) > 0) {
    return { ok: false, error: 'campaign_has_activity' }
  }

  const { error } = await input.adminClient.from('campaigns').delete().eq('id', input.campaignId)

  if (error) {
    return { ok: false, error: 'delete_failed' }
  }

  return { ok: true }
}

export async function uploadCampaignAsset(input: {
  adminClient: AdminClient
  campaignId: string
  file: File
}): Promise<{ ok: true; url: string } | { ok: false; error: 'upload_failed' | 'url_failed' }> {
  const ext = input.file.name.split('.').pop() ?? 'bin'
  const uuid = crypto.randomUUID()
  const path = `campaigns/${input.campaignId}/${uuid}.${ext}`

  const { error } = await input.adminClient.storage
    .from('org-assets')
    .upload(path, input.file, { contentType: input.file.type, upsert: false })

  if (error) {
    return { ok: false, error: 'upload_failed' }
  }

  const { data: urlData } = input.adminClient.storage.from('org-assets').getPublicUrl(path)
  if (!urlData?.publicUrl) {
    return { ok: false, error: 'url_failed' }
  }

  return { ok: true, url: urlData.publicUrl }
}
