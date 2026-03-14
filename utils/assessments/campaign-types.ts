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
export type CampaignFlowStepType = 'assessment' | 'screen'
export type CampaignScreenVisualStyle = 'standard' | 'transition'

export type CampaignConfig = {
  registration_position: RegistrationPosition
  report_access: ReportAccess
  demographics_enabled: boolean
  demographics_position: DemographicsPosition
  demographics_fields: DemographicFieldKey[]
  entry_limit: number | null
}

export type CampaignScreenStepConfig = {
  title: string
  body_markdown: string
  cta_label: string
  visual_style: CampaignScreenVisualStyle
}

export type CampaignFlowStep = {
  id: string
  campaign_id: string
  step_type: CampaignFlowStepType
  sort_order: number
  is_active: boolean
  campaign_assessment_id: string | null
  screen_config: CampaignScreenStepConfig
  created_at: string
  updated_at: string
}

export const DEFAULT_CAMPAIGN_CONFIG: CampaignConfig = {
  registration_position: 'before',
  report_access: 'immediate',
  demographics_enabled: false,
  demographics_position: 'after',
  demographics_fields: [],
  entry_limit: null,
}

export const DEFAULT_CAMPAIGN_SCREEN_STEP_CONFIG: CampaignScreenStepConfig = {
  title: 'Next assessment',
  body_markdown: 'Continue to the next step in this campaign.',
  cta_label: 'Continue',
  visual_style: 'standard',
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

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

export function normalizeCampaignScreenStepConfig(input: unknown): CampaignScreenStepConfig {
  const raw = asRecord(input)

  return {
    title:
      typeof raw.title === 'string' && raw.title.trim().length > 0
        ? raw.title.trim()
        : DEFAULT_CAMPAIGN_SCREEN_STEP_CONFIG.title,
    body_markdown:
      typeof raw.body_markdown === 'string'
        ? raw.body_markdown
        : DEFAULT_CAMPAIGN_SCREEN_STEP_CONFIG.body_markdown,
    cta_label:
      typeof raw.cta_label === 'string' && raw.cta_label.trim().length > 0
        ? raw.cta_label.trim()
        : DEFAULT_CAMPAIGN_SCREEN_STEP_CONFIG.cta_label,
    visual_style:
      raw.visual_style === 'transition' || raw.visual_style === 'standard'
        ? raw.visual_style
        : DEFAULT_CAMPAIGN_SCREEN_STEP_CONFIG.visual_style,
  }
}

export function normalizeCampaignFlowStep(input: unknown): CampaignFlowStep {
  const raw = asRecord(input)
  const stepType = raw.step_type === 'screen' ? 'screen' : 'assessment'

  return {
    id: typeof raw.id === 'string' ? raw.id : '',
    campaign_id: typeof raw.campaign_id === 'string' ? raw.campaign_id : '',
    step_type: stepType,
    sort_order:
      typeof raw.sort_order === 'number' && Number.isFinite(raw.sort_order)
        ? raw.sort_order
        : 0,
    is_active: raw.is_active === undefined ? true : raw.is_active === true,
    campaign_assessment_id:
      typeof raw.campaign_assessment_id === 'string' && raw.campaign_assessment_id.trim().length > 0
        ? raw.campaign_assessment_id
        : null,
    screen_config: normalizeCampaignScreenStepConfig(raw.screen_config),
    created_at: typeof raw.created_at === 'string' ? raw.created_at : '',
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : '',
  }
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
