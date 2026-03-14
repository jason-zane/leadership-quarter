import type { SupabaseClient } from '@supabase/supabase-js'
import {
  DEFAULT_CAMPAIGN_CONFIG,
  type CampaignConfig,
} from '@/utils/assessments/campaign-types'

type CreatePortalCampaignPayload = {
  name?: string
  slug?: string
  config?: Partial<CampaignConfig>
  assessment_ids?: string[]
}

type PortalCampaignsFilters = {
  includeArchived: boolean
  page: number
  pageSize: number
}

export type PortalCampaignsResult =
  | {
      ok: true
      data: {
        campaigns: unknown[]
        includeArchived: boolean
        pagination: {
          page: number
          pageSize: number
          total: number
          totalPages: number
        }
      }
    }
  | {
      ok: false
      error: 'internal_error'
      message: string
    }

export type CreatePortalCampaignResult =
  | {
      ok: true
      data: {
        campaign: unknown
      }
    }
  | {
      ok: false
      error: 'validation_error' | 'forbidden' | 'conflict' | 'internal_error'
      message: string
    }

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toPositiveInt(input: string | null, fallback: number) {
  const parsed = Number(input)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export function parsePortalCampaignsQuery(searchParams: URLSearchParams): PortalCampaignsFilters {
  return {
    includeArchived: searchParams.get('includeArchived') === 'true',
    page: toPositiveInt(searchParams.get('page'), 1),
    pageSize: Math.min(toPositiveInt(searchParams.get('pageSize'), 25), 100),
  }
}

export async function listPortalCampaigns(input: {
  adminClient: SupabaseClient
  organisationId: string
  filters: PortalCampaignsFilters
}): Promise<PortalCampaignsResult> {
  const { includeArchived, page, pageSize } = input.filters
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = input.adminClient
    .from('campaigns')
    .select(
      'id, organisation_id, name:external_name, slug, status, config, created_at, updated_at, campaign_assessments(id, assessment_id, sort_order, is_active)',
      { count: 'exact' }
    )
    .eq('organisation_id', input.organisationId)
    .order('created_at', { ascending: false })

  if (!includeArchived) {
    query = query.neq('status', 'archived')
  }

  const { data, error, count } = await query.range(from, to)
  if (error) {
    return {
      ok: false,
      error: 'internal_error',
      message: 'Failed to load campaigns.',
    }
  }

  return {
    ok: true,
    data: {
      campaigns: data ?? [],
      includeArchived,
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
      },
    },
  }
}

export async function createPortalCampaign(input: {
  adminClient: SupabaseClient
  organisationId: string
  userId: string
  payload: CreatePortalCampaignPayload | null
}): Promise<CreatePortalCampaignResult> {
  const name = String(input.payload?.name ?? '').trim()
  if (!name) {
    return {
      ok: false,
      error: 'validation_error',
      message: 'Campaign name is required.',
    }
  }

  const slug = String(input.payload?.slug ?? '').trim() || slugify(name)
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && !/^[a-z0-9]$/.test(slug)) {
    return {
      ok: false,
      error: 'validation_error',
      message: 'Campaign slug format is invalid.',
    }
  }

  const assessmentIds = (input.payload?.assessment_ids ?? [])
    .map((value) => String(value).trim())
    .filter(Boolean)
  if (assessmentIds.length === 0) {
    return {
      ok: false,
      error: 'validation_error',
      message: 'At least one assessment is required.',
    }
  }

  const { data: allowedRows, error: allowedError } = await input.adminClient
    .from('organisation_assessment_access')
    .select('assessment_id')
    .eq('organisation_id', input.organisationId)
    .eq('enabled', true)
    .in('assessment_id', assessmentIds)

  if (allowedError) {
    return {
      ok: false,
      error: 'internal_error',
      message: 'Failed to validate assessment access.',
    }
  }

  const allowedSet = new Set((allowedRows ?? []).map((row) => row.assessment_id))
  const disallowed = assessmentIds.filter((id) => !allowedSet.has(id))
  if (disallowed.length > 0) {
    return {
      ok: false,
      error: 'forbidden',
      message: 'One or more assessments are not assigned to your organisation.',
    }
  }

  const config: CampaignConfig = {
    ...DEFAULT_CAMPAIGN_CONFIG,
    ...(input.payload?.config ?? {}),
  }

  const { data: campaign, error: createError } = await input.adminClient
    .from('campaigns')
    .insert({
      organisation_id: input.organisationId,
      name,
      external_name: name,
      slug,
      config,
      created_by: input.userId,
    })
    .select('id, organisation_id, name:external_name, slug, status, config, created_at, updated_at')
    .single()

  if (createError || !campaign) {
    if (createError?.code === '23505') {
      return {
        ok: false,
        error: 'conflict',
        message: 'Campaign slug is already in use for this client.',
      }
    }

    return {
      ok: false,
      error: 'internal_error',
      message: 'Failed to create campaign.',
    }
  }

  const assessmentRows = assessmentIds.map((assessmentId, idx) => ({
    campaign_id: campaign.id,
    assessment_id: assessmentId,
    sort_order: idx,
  }))
  const { error: linkError } = await input.adminClient
    .from('campaign_assessments')
    .insert(assessmentRows)

  if (linkError) {
    return {
      ok: false,
      error: 'internal_error',
      message: 'Campaign created but failed to assign assessments.',
    }
  }

  return {
    ok: true,
    data: {
      campaign,
    },
  }
}
