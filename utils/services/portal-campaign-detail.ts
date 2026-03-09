import type { SupabaseClient } from '@supabase/supabase-js'
import type { CampaignConfig, CampaignStatus } from '@/utils/assessments/campaign-types'

const allowedStatusTransitions: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['active', 'archived'],
  active: ['closed', 'archived'],
  closed: ['archived'],
  archived: [],
}

export type UpdatePortalCampaignPayload = {
  name?: string
  status?: CampaignStatus
  config?: Partial<CampaignConfig>
}

export type PortalCampaignDetailResult =
  | {
      ok: true
      data: {
        campaign: unknown
      }
    }
  | {
      ok: false
      error: 'not_found'
      message: string
    }

export type UpdatePortalCampaignResult =
  | {
      ok: true
      data: {
        campaign: unknown
      }
    }
  | {
      ok: false
      error: 'validation_error' | 'not_found' | 'internal_error'
      message: string
    }

export async function getPortalCampaignDetail(input: {
  adminClient: SupabaseClient
  organisationId: string
  campaignId: string
}): Promise<PortalCampaignDetailResult> {
  const { data, error } = await input.adminClient
    .from('campaigns')
    .select(
      'id, organisation_id, name:external_name, slug, status, config, created_at, updated_at, campaign_assessments(id, assessment_id, sort_order, is_active, created_at, assessments(id, key, name:external_name, status))'
    )
    .eq('id', input.campaignId)
    .eq('organisation_id', input.organisationId)
    .maybeSingle()

  if (error || !data) {
    return {
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    }
  }

  return {
    ok: true,
    data: {
      campaign: data,
    },
  }
}

export async function updatePortalCampaign(input: {
  adminClient: SupabaseClient
  organisationId: string
  campaignId: string
  payload: UpdatePortalCampaignPayload | null
}): Promise<UpdatePortalCampaignResult> {
  if (!input.payload) {
    return {
      ok: false,
      error: 'validation_error',
      message: 'Invalid payload.',
    }
  }

  const { data: existing, error: existingError } = await input.adminClient
    .from('campaigns')
    .select('status, config')
    .eq('id', input.campaignId)
    .eq('organisation_id', input.organisationId)
    .maybeSingle()

  if (existingError || !existing) {
    return {
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    }
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (input.payload.name !== undefined) {
    const name = String(input.payload.name).trim()
    if (!name) {
      return {
        ok: false,
        error: 'validation_error',
        message: 'Campaign name cannot be empty.',
      }
    }
    updates.name = name
    updates.external_name = name
  }

  if (input.payload.status !== undefined) {
    const currentStatus = existing.status as CampaignStatus
    const nextStatus = input.payload.status
    if (!allowedStatusTransitions[currentStatus]?.includes(nextStatus)) {
      return {
        ok: false,
        error: 'validation_error',
        message: `Cannot transition campaign from ${currentStatus} to ${nextStatus}.`,
      }
    }
    updates.status = nextStatus
  }

  if (input.payload.config !== undefined) {
    updates.config = {
      ...((existing.config as CampaignConfig | null) ?? {}),
      ...input.payload.config,
    }
  }

  const { data, error } = await input.adminClient
    .from('campaigns')
    .update(updates)
    .eq('id', input.campaignId)
    .eq('organisation_id', input.organisationId)
    .select('id, organisation_id, name:external_name, slug, status, config, updated_at')
    .maybeSingle()

  if (error || !data) {
    return {
      ok: false,
      error: 'internal_error',
      message: 'Failed to update campaign.',
    }
  }

  return {
    ok: true,
    data: {
      campaign: data,
    },
  }
}
