import {
  DEMOGRAPHIC_FIELD_CATALOG,
  DEMOGRAPHIC_FIELD_SECTIONS,
  getDemographicFieldDefinition,
  getEnabledDemographicFields,
  normalizeCampaignDemographicFieldKeys,
  sanitizeDemographicsRecord,
  type CampaignDemographics,
  type CampaignDemographicValue,
  type DemographicFieldDefinition,
  type DemographicFieldKey,
  type DemographicFieldOption,
  type DemographicFieldSectionKey,
} from '@/utils/assessments/campaign-demographics'

export type OrganisationStatus = 'active' | 'archived'

export type Organisation = {
  id: string
  name: string
  slug: string
  website: string | null
  status: OrganisationStatus
  created_at: string
  updated_at: string
}

export type CampaignStatus = 'draft' | 'active' | 'closed' | 'archived'

export type RegistrationPosition = 'before' | 'after' | 'none'

export type DemographicsPosition = 'before' | 'after'

export type ReportAccess = 'none' | 'immediate' | 'gated'

export type CampaignConfig = {
  registration_position: RegistrationPosition
  report_access: ReportAccess
  demographics_enabled: boolean
  demographics_position: DemographicsPosition
  demographics_fields: DemographicFieldKey[]
  entry_limit: number | null
}

export const DEFAULT_CAMPAIGN_CONFIG: CampaignConfig = {
  registration_position: 'before',
  report_access: 'immediate',
  demographics_enabled: false,
  demographics_position: 'after',
  demographics_fields: [],
  entry_limit: null,
}

export function normalizeCampaignEntryLimit(value: unknown): number | null {
  const parsed = typeof value === 'string' && value.trim() ? Number(value) : Number(value)
  if (!Number.isFinite(parsed)) return null

  const normalized = Math.floor(parsed)
  return normalized >= 1 ? normalized : null
}

export function normalizeCampaignConfig(config: unknown): CampaignConfig {
  const rawConfig = ((config as Partial<CampaignConfig> | null) ?? {})
  const nextConfig = {
    ...DEFAULT_CAMPAIGN_CONFIG,
    ...rawConfig,
  } as CampaignConfig

  const rawDemographicsPosition = rawConfig.demographics_position
  nextConfig.demographics_position =
    rawDemographicsPosition === 'before' || rawDemographicsPosition === 'after'
      ? rawDemographicsPosition
      : nextConfig.registration_position === 'before'
        ? 'before'
        : 'after'

  nextConfig.demographics_fields = nextConfig.demographics_enabled
    ? normalizeCampaignDemographicFieldKeys(nextConfig.demographics_fields)
    : []

  nextConfig.entry_limit = normalizeCampaignEntryLimit(rawConfig.entry_limit)

  return nextConfig
}

export type Campaign = {
  id: string
  organisation_id: string | null
  name: string
  external_name: string
  slug: string
  status: CampaignStatus
  config: CampaignConfig
  created_by: string | null
  created_at: string
  updated_at: string
}

export type CampaignAssessment = {
  id: string
  campaign_id: string
  assessment_id: string
  sort_order: number
  is_active: boolean
  created_at: string
  assessments?: Pick<{ id: string; key: string; name: string; status: string }, 'id' | 'key' | 'name' | 'status'>
}

export type CampaignWithOrganisation = Campaign & {
  organisations: Pick<Organisation, 'id' | 'name' | 'slug'> | null
}

export type CampaignWithAssessments = CampaignWithOrganisation & {
  campaign_assessments: CampaignAssessment[]
}

export {
  DEMOGRAPHIC_FIELD_CATALOG,
  DEMOGRAPHIC_FIELD_SECTIONS,
  getDemographicFieldDefinition,
  getEnabledDemographicFields,
  normalizeCampaignDemographicFieldKeys,
  sanitizeDemographicsRecord,
}

export type {
  CampaignDemographics,
  CampaignDemographicValue,
  DemographicFieldDefinition,
  DemographicFieldKey,
  DemographicFieldOption,
  DemographicFieldSectionKey,
}
