import {
  normalizeCampaignEntryLimit,
  normalizeCampaignConfig,
  type CampaignConfig,
} from '@/utils/assessments/campaign-types'
import { LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG } from '@/utils/campaign-url'
import { createAdminClient } from '@/utils/supabase/admin'

type CampaignOrganisationRelation = {
  name: string
  slug: string
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
  error: 'missing_service_role' | 'campaign_not_found' | 'campaign_not_active' | 'campaign_limit_reached'
}

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

export type PublicCampaignContextSuccess = {
  ok: true
  adminClient: AdminClient
  campaign: PublicCampaignRow
  organisationName: string | null
  organisationSlug: string
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
  organisationSlug: string
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

export function getCampaignOrganisationSlug(campaign: PublicCampaignRow) {
  return pickRelation(campaign.organisations)?.slug ?? LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG
}

async function resolveCampaignOrganisationScope(input: {
  adminClient: AdminClient
  organisationSlug: string
}) {
  if (input.organisationSlug === LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG) {
    return {
      ok: true as const,
      organisationId: null,
      organisationName: null,
      organisationSlug: LEADERSHIP_QUARTER_CAMPAIGN_ORG_SLUG,
    }
  }

  const { data: organisation, error } = await input.adminClient
    .from('organisations')
    .select('id, name, slug')
    .eq('slug', input.organisationSlug)
    .eq('status', 'active')
    .maybeSingle()

  if (error || !organisation) {
    return { ok: false as const }
  }

  return {
    ok: true as const,
    organisationId: organisation.id as string,
    organisationName: organisation.name as string,
    organisationSlug: organisation.slug as string,
  }
}

async function hasCampaignCapacity(input: {
  adminClient: AdminClient
  campaignId: string
  config: CampaignConfig
}) {
  const entryLimit = normalizeCampaignEntryLimit(input.config.entry_limit)
  if (entryLimit === null) {
    return true
  }

  const [invitationCountResult, directSubmissionCountResult] = await Promise.all([
    input.adminClient
      .from('assessment_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', input.campaignId),
    input.adminClient
      .from('assessment_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', input.campaignId)
      .is('invitation_id', null),
  ])

  const invitationCount = invitationCountResult.count ?? 0
  const directSubmissionCount = directSubmissionCountResult.count ?? 0

  return invitationCount + directSubmissionCount < entryLimit
}

export async function loadPublicCampaignContext(input: {
  organisationSlug: string
  campaignSlug: string
}): Promise<PublicCampaignContextResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      ok: false,
      error: 'missing_service_role',
    }
  }

  const scope = await resolveCampaignOrganisationScope({
    adminClient,
    organisationSlug: input.organisationSlug,
  })

  if (!scope.ok) {
    return {
      ok: false,
      error: 'campaign_not_found',
    }
  }

  let campaignQuery = adminClient
    .from('campaigns')
    .select(`
      id, name:external_name, slug, status, config,
      organisations(name, slug),
      campaign_assessments(id, assessment_id, sort_order, is_active, assessments(id, key, name:external_name, description, status))
    `)
    .eq('slug', input.campaignSlug)

  campaignQuery = scope.organisationId
    ? campaignQuery.eq('organisation_id', scope.organisationId)
    : campaignQuery.is('organisation_id', null)

  const { data: campaignRow, error: campaignError } = await campaignQuery.maybeSingle()

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

  if (!(await hasCampaignCapacity({ adminClient, campaignId: campaign.id, config: campaign.config }))) {
    return {
      ok: false,
      error: 'campaign_limit_reached',
    }
  }

  return {
    ok: true,
    adminClient,
    campaign,
    organisationName: getCampaignOrganisationName(campaign) ?? scope.organisationName,
    organisationSlug: getCampaignOrganisationSlug(campaign),
    primaryAssessment: getPrimaryCampaignAssessment(campaign),
  }
}

export async function loadPublicCampaignRuntimeContext(
  input: {
    organisationSlug: string
    campaignSlug: string
  }
): Promise<PublicCampaignRuntimeContextResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      ok: false,
      error: 'missing_service_role',
    }
  }

  const scope = await resolveCampaignOrganisationScope({
    adminClient,
    organisationSlug: input.organisationSlug,
  })

  if (!scope.ok) {
    return {
      ok: false,
      error: 'campaign_not_found',
    }
  }

  let campaignQuery = adminClient
    .from('campaigns')
    .select(`
      id, name:external_name, slug, status, config, runner_overrides,
      organisations(name, slug),
      campaign_assessments(id, assessment_id, sort_order, is_active, assessments(id, key, name:external_name, description, status, version, runner_config, report_config))
    `)
    .eq('slug', input.campaignSlug)

  campaignQuery = scope.organisationId
    ? campaignQuery.eq('organisation_id', scope.organisationId)
    : campaignQuery.is('organisation_id', null)

  const { data: campaignRow, error: campaignError } = await campaignQuery.maybeSingle()

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

  if (!(await hasCampaignCapacity({ adminClient, campaignId: campaign.id, config: campaign.config }))) {
    return {
      ok: false,
      error: 'campaign_limit_reached',
    }
  }

  return {
    ok: true,
    adminClient,
    campaign,
    organisationName: getCampaignOrganisationName(campaign) ?? scope.organisationName,
    organisationSlug: getCampaignOrganisationSlug(campaign),
    primaryAssessment: getPrimaryRuntimeCampaignAssessment(campaign),
  }
}
