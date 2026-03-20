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
import { validateHexColor } from '@/utils/brand/org-brand-utils'

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

export type CampaignBrandingMode = 'lq' | 'none' | 'custom'

export type RegistrationPosition = 'before' | 'after' | 'none'

export type DemographicsPosition = 'before' | 'after'

export type ReportAccess = 'none' | 'immediate' | 'gated'
export type CampaignFlowStepType = 'assessment' | 'screen'
export type CampaignScreenVisualStyle = 'standard' | 'transition'

export type CampaignScreenSectionCard = {
  id: string
  title: string
  body: string
}

export type CampaignScreenContentBlock =
  | {
      id: string
      type: 'paragraph'
      eyebrow: string
      title: string
      body: string
    }
  | {
      id: string
      type: 'card_list'
      eyebrow: string
      title: string
      cards: CampaignScreenSectionCard[]
    }

export type CampaignConfig = {
  registration_position: RegistrationPosition
  report_access: ReportAccess
  demographics_enabled: boolean
  demographics_position: DemographicsPosition
  demographics_fields: DemographicFieldKey[]
  entry_limit: number | null
  branding_mode: CampaignBrandingMode
  branding_logo_url: string | null
  branding_company_name: string | null
  branding_primary_color: string | null
  branding_secondary_color: string | null
}

export type CampaignScreenStepConfig = {
  eyebrow: string
  title: string
  body_markdown: string
  cta_label: string
  visual_style: CampaignScreenVisualStyle
  blocks: CampaignScreenContentBlock[]
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
  branding_mode: 'lq',
  branding_logo_url: null,
  branding_company_name: null,
  branding_primary_color: null,
  branding_secondary_color: null,
}

export const DEFAULT_CAMPAIGN_SCREEN_STEP_CONFIG: CampaignScreenStepConfig = {
  eyebrow: '',
  title: 'Next assessment',
  body_markdown: 'Continue to the next step in this campaign.',
  cta_label: 'Continue',
  visual_style: 'standard',
  blocks: [],
}

export const ENFORCE_MULTI_ASSESSMENT_REGISTRATION_BEFORE_COMPLETION = true

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

  const rawMode = (rawConfig as Partial<CampaignConfig> & { branding_mode?: unknown }).branding_mode
  nextConfig.branding_mode =
    rawMode === 'none' || rawMode === 'custom' ? rawMode : 'lq'
  const rawLogoUrl = (rawConfig as Partial<CampaignConfig> & { branding_logo_url?: unknown }).branding_logo_url
  nextConfig.branding_logo_url =
    typeof rawLogoUrl === 'string' ? rawLogoUrl : null
  const rawCompanyName = (rawConfig as Partial<CampaignConfig> & { branding_company_name?: unknown }).branding_company_name
  nextConfig.branding_company_name =
    typeof rawCompanyName === 'string' ? rawCompanyName : null
  const rawPrimaryColor = (rawConfig as Partial<CampaignConfig> & { branding_primary_color?: unknown }).branding_primary_color
  nextConfig.branding_primary_color =
    typeof rawPrimaryColor === 'string' && validateHexColor(rawPrimaryColor)
      ? rawPrimaryColor
      : null
  const rawSecondaryColor = (rawConfig as Partial<CampaignConfig> & { branding_secondary_color?: unknown }).branding_secondary_color
  nextConfig.branding_secondary_color =
    typeof rawSecondaryColor === 'string' && validateHexColor(rawSecondaryColor)
      ? rawSecondaryColor
      : null

  return nextConfig
}

export function applyCampaignRuntimeSafeguards(
  config: CampaignConfig,
  options?: {
    assessmentCount?: number
  }
): CampaignConfig {
  const assessmentCount = options?.assessmentCount ?? 0
  if (
    ENFORCE_MULTI_ASSESSMENT_REGISTRATION_BEFORE_COMPLETION &&
    assessmentCount > 1 &&
    config.registration_position === 'after'
  ) {
    return {
      ...config,
      registration_position: 'before',
    }
  }

  return config
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function normalizeText(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function normalizeScreenSectionCard(value: unknown, index: number): CampaignScreenSectionCard {
  const raw = asRecord(value)
  return {
    id:
      typeof raw.id === 'string' && raw.id.trim().length > 0
        ? raw.id.trim()
        : `card-${index + 1}`,
    title: normalizeText(raw.title, `Card ${index + 1}`),
    body: normalizeText(raw.body),
  }
}

function normalizeScreenContentBlock(value: unknown, index: number): CampaignScreenContentBlock {
  const raw = asRecord(value)
  const id =
    typeof raw.id === 'string' && raw.id.trim().length > 0
      ? raw.id.trim()
      : `block-${index + 1}`

  if (raw.type === 'card_list') {
    const cards = Array.isArray(raw.cards)
      ? raw.cards.slice(0, 8).map((card, cardIndex) => normalizeScreenSectionCard(card, cardIndex))
      : []

    return {
      id,
      type: 'card_list',
      eyebrow: normalizeText(raw.eyebrow),
      title: normalizeText(raw.title, 'Section'),
      cards,
    }
  }

  return {
    id,
    type: 'paragraph',
    eyebrow: normalizeText(raw.eyebrow),
    title: normalizeText(raw.title, 'Section'),
    body: normalizeText(raw.body),
  }
}

export function normalizeCampaignScreenStepConfig(input: unknown): CampaignScreenStepConfig {
  const raw = asRecord(input)

  return {
    eyebrow:
      typeof raw.eyebrow === 'string'
        ? raw.eyebrow
        : DEFAULT_CAMPAIGN_SCREEN_STEP_CONFIG.eyebrow,
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
    blocks:
      Array.isArray(raw.blocks)
        ? raw.blocks.slice(0, 8).map((block, index) => normalizeScreenContentBlock(block, index))
        : DEFAULT_CAMPAIGN_SCREEN_STEP_CONFIG.blocks,
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
