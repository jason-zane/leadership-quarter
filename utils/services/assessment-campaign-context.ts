import {
  normalizeCampaignConfig,
  type CampaignConfig,
} from '@/utils/assessments/campaign-types'
import { createAdminClient } from '@/utils/supabase/admin'

type CampaignOrganisationRelation = {
  name: string
}

type CampaignAssessmentRow<TAssessment> = {
  id: string
  assessment_id: string
  sort_order: number
  is_active: boolean
  assessments: TAssessment | TAssessment[] | null
}

export type PublicCampaignRow<TAssessment = PublicCampaignAssessment> = {
  id: string
  name: string
  slug?: string
  status: string
  config: CampaignConfig
  runner_overrides?: unknown
  organisations?: CampaignOrganisationRelation | CampaignOrganisationRelation[] | null
  campaign_assessments: CampaignAssessmentRow<TAssessment>[] | null
}

export type PublicCampaignAssessment = {
  id: string
  key: string
  name: string
  description?: string | null
  status: string
}

export type RuntimeCampaignAssessment = PublicCampaignAssessment & {
  version: number
  runner_config: unknown
  report_config: unknown
}

export type AccessibleCampaignAssessment = {
  id: string
  assessment: {
    id: string
    key: string
    name: string
    description: string | null
  }
  survey: {
    id: string
    key: string
    name: string
    description: string | null
  }
}

type PublicCampaignContextFailure = {
  ok: false
  error: 'missing_service_role' | 'campaign_not_found' | 'campaign_not_active'
}

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export type PublicCampaignContextSuccess = {
  ok: true
  adminClient: AdminClient
  campaign: PublicCampaignRow
  organisationName: string | null
  primaryAssessment: PublicCampaignAssessment | null
}

export type PublicCampaignContextResult =
  | PublicCampaignContextSuccess
  | PublicCampaignContextFailure

export type RuntimeCampaignRow = PublicCampaignRow<RuntimeCampaignAssessment> & {
  runner_overrides: unknown
}

export type PublicCampaignRuntimeContextSuccess = {
  ok: true
  adminClient: AdminClient
  campaign: RuntimeCampaignRow
  organisationName: string | null
  primaryAssessment: RuntimeCampaignAssessment | null
}

export type PublicCampaignRuntimeContextResult =
  | PublicCampaignRuntimeContextSuccess
  | PublicCampaignContextFailure

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function getOrderedCampaignAssessmentRows<TAssessment>(campaign: {
  campaign_assessments: CampaignAssessmentRow<TAssessment>[] | null
}) {
  return (campaign.campaign_assessments ?? [])
    .filter((assessment) => assessment.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)
}

export function getPrimaryCampaignAssessment(
  campaign: PublicCampaignRow
): PublicCampaignAssessment | null {
  return pickRelation(getOrderedCampaignAssessmentRows(campaign)[0]?.assessments ?? null)
}

export function getPrimaryRuntimeCampaignAssessment(
  campaign: RuntimeCampaignRow
): RuntimeCampaignAssessment | null {
  return pickRelation(getOrderedCampaignAssessmentRows(campaign)[0]?.assessments ?? null)
}

export function getAccessibleCampaignAssessments(
  campaign: PublicCampaignRow
): AccessibleCampaignAssessment[] {
  return getOrderedCampaignAssessmentRows(campaign)
    .map((assessmentRow) => {
      const assessment = pickRelation(assessmentRow.assessments)
      if (!assessment || assessment.status !== 'active') {
        return null
      }

      return {
        id: assessmentRow.id,
        assessment: {
          id: assessment.id,
          key: assessment.key,
          name: assessment.name,
          description: assessment.description ?? null,
        },
        survey: {
          id: assessment.id,
          key: assessment.key,
          name: assessment.name,
          description: assessment.description ?? null,
        },
      }
    })
    .filter(
      (assessment): assessment is AccessibleCampaignAssessment => assessment !== null
    )
}

export function getCampaignOrganisationName(campaign: PublicCampaignRow) {
  return pickRelation(campaign.organisations)?.name ?? null
}

export async function loadPublicCampaignContext(slug: string): Promise<PublicCampaignContextResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      ok: false,
      error: 'missing_service_role',
    }
  }

  const { data: campaignRow, error: campaignError } = await adminClient
    .from('campaigns')
    .select(`
      id, name:external_name, slug, status, config,
      organisations(name),
      campaign_assessments(id, assessment_id, sort_order, is_active, assessments(id, key, name:external_name, description, status))
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (campaignError || !campaignRow) {
    return {
      ok: false,
      error: 'campaign_not_found',
    }
  }

  const campaign = campaignRow as PublicCampaignRow
  campaign.config = normalizeCampaignConfig(campaign.config)

  if (campaign.status !== 'active') {
    return {
      ok: false,
      error: 'campaign_not_active',
    }
  }

  return {
    ok: true,
    adminClient,
    campaign,
    organisationName: getCampaignOrganisationName(campaign),
    primaryAssessment: getPrimaryCampaignAssessment(campaign),
  }
}

export async function loadPublicCampaignRuntimeContext(
  slug: string
): Promise<PublicCampaignRuntimeContextResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      ok: false,
      error: 'missing_service_role',
    }
  }

  const { data: campaignRow, error: campaignError } = await adminClient
    .from('campaigns')
    .select(`
      id, name:external_name, slug, status, config, runner_overrides,
      organisations(name),
      campaign_assessments(id, assessment_id, sort_order, is_active, assessments(id, key, name:external_name, description, status, version, runner_config, report_config))
    `)
    .eq('slug', slug)
    .maybeSingle()

  if (campaignError || !campaignRow) {
    return {
      ok: false,
      error: 'campaign_not_found',
    }
  }

  const campaign = campaignRow as RuntimeCampaignRow
  campaign.config = normalizeCampaignConfig(campaign.config)

  if (campaign.status !== 'active') {
    return {
      ok: false,
      error: 'campaign_not_active',
    }
  }

  return {
    ok: true,
    adminClient,
    campaign,
    organisationName: getCampaignOrganisationName(campaign),
    primaryAssessment: getPrimaryRuntimeCampaignAssessment(campaign),
  }
}
