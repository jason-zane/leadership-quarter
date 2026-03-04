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

export type ReportAccess = 'none' | 'immediate' | 'gated'

export type CampaignConfig = {
  registration_position: RegistrationPosition
  report_access: ReportAccess
  demographics_enabled: boolean
  demographics_fields: string[]
}

export const DEFAULT_CAMPAIGN_CONFIG: CampaignConfig = {
  registration_position: 'before',
  report_access: 'immediate',
  demographics_enabled: false,
  demographics_fields: [],
}

export type Campaign = {
  id: string
  organisation_id: string | null
  name: string
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

export const DEMOGRAPHICS_FIELD_OPTIONS = [
  { key: 'job_title', label: 'Job title' },
  { key: 'seniority_level', label: 'Seniority level' },
  { key: 'industry', label: 'Industry' },
  { key: 'company_size', label: 'Company size' },
  { key: 'years_in_role', label: 'Years in role' },
  { key: 'ai_tools_used', label: 'AI tools currently used' },
  { key: 'primary_function', label: 'Primary business function' },
  { key: 'location_country', label: 'Country' },
] as const

export type DemographicsFieldKey = (typeof DEMOGRAPHICS_FIELD_OPTIONS)[number]['key']
