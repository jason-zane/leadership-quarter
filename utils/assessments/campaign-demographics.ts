export type CampaignDemographicValue = string | string[]

export type CampaignDemographics = Record<string, CampaignDemographicValue>

export type DemographicFieldInputType = 'select' | 'multiselect' | 'text'

export type DemographicFieldSectionKey =
  | 'role_context'
  | 'geography'
  | 'background'
  | 'organisation_context'
  | 'performance'

export type DemographicFieldOption = {
  value: string
  label: string
}

export type DemographicFieldDefinition = {
  key: string
  label: string
  section: DemographicFieldSectionKey
  inputType: DemographicFieldInputType
  options?: readonly DemographicFieldOption[]
  placeholder?: string
  sensitive?: boolean
  companionKey?: string
  companionLabel?: string
}

export const DEMOGRAPHIC_FIELD_SECTIONS: Array<{
  key: DemographicFieldSectionKey
  label: string
}> = [
  { key: 'role_context', label: 'Role context' },
  { key: 'geography', label: 'Geography' },
  { key: 'background', label: 'Background' },
  { key: 'organisation_context', label: 'Organisation context' },
  { key: 'performance', label: 'Performance' },
]

const PREFER_NOT_TO_SAY = { value: 'prefer_not_to_say', label: 'Prefer not to say' } as const
const OTHER_OPTION = { value: 'other', label: 'Other' } as const
const SELF_DESCRIBE = { value: 'self_describe', label: 'Self-describe' } as const

export const DEMOGRAPHIC_FIELD_CATALOG = [
  {
    key: 'job_level',
    label: 'Job level',
    section: 'role_context',
    inputType: 'select',
    options: [
      { value: 'individual_contributor', label: 'Individual contributor' },
      { value: 'manager', label: 'Manager' },
      { value: 'senior_manager', label: 'Senior manager' },
      { value: 'director', label: 'Director' },
      { value: 'vp_executive', label: 'VP / Executive' },
      { value: 'c_suite', label: 'C-suite' },
    ],
  },
  {
    key: 'job_function',
    label: 'Job function',
    section: 'role_context',
    inputType: 'select',
    options: [
      { value: 'sales', label: 'Sales' },
      { value: 'engineering', label: 'Engineering' },
      { value: 'product', label: 'Product' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'HR' },
      { value: 'operations', label: 'Operations' },
      { value: 'customer_success', label: 'Customer Success' },
      OTHER_OPTION,
    ],
  },
  {
    key: 'department_business_unit',
    label: 'Department or business unit',
    section: 'role_context',
    inputType: 'text',
    placeholder: 'e.g. Enterprise Sales, Platform, APAC Operations',
  },
  {
    key: 'years_professional_experience',
    label: 'Years of professional experience',
    section: 'role_context',
    inputType: 'select',
    options: [
      { value: '0_3', label: '0-3 years' },
      { value: '4_7', label: '4-7 years' },
      { value: '8_12', label: '8-12 years' },
      { value: '13_20', label: '13-20 years' },
      { value: '20_plus', label: '20+ years' },
    ],
  },
  {
    key: 'tenure_current_organisation',
    label: 'Tenure at current organisation',
    section: 'role_context',
    inputType: 'select',
    options: [
      { value: 'lt_1_year', label: '<1 year' },
      { value: '1_3_years', label: '1-3 years' },
      { value: '4_6_years', label: '4-6 years' },
      { value: '7_10_years', label: '7-10 years' },
      { value: '10_plus_years', label: '10+ years' },
    ],
  },
  {
    key: 'management_responsibility',
    label: 'Management responsibility',
    section: 'role_context',
    inputType: 'select',
    options: [
      { value: 'no_direct_reports', label: 'No direct reports' },
      { value: '1_5_reports', label: '1-5 direct reports' },
      { value: '6_10_reports', label: '6-10 direct reports' },
      { value: '10_plus_reports', label: '10+ direct reports' },
    ],
  },
  {
    key: 'country',
    label: 'Country',
    section: 'geography',
    inputType: 'text',
    placeholder: 'e.g. Australia, United States, Singapore',
  },
  {
    key: 'region',
    label: 'Region',
    section: 'geography',
    inputType: 'select',
    options: [
      { value: 'north_america', label: 'North America' },
      { value: 'europe', label: 'Europe' },
      { value: 'apac', label: 'APAC' },
      { value: 'latam', label: 'LATAM' },
      { value: 'middle_east_africa', label: 'Middle East / Africa' },
    ],
  },
  {
    key: 'work_arrangement',
    label: 'Work arrangement',
    section: 'geography',
    inputType: 'select',
    options: [
      { value: 'office', label: 'Office' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'remote', label: 'Remote' },
    ],
  },
  {
    key: 'highest_education_level',
    label: 'Highest education level',
    section: 'background',
    inputType: 'select',
    options: [
      { value: 'high_school', label: 'High school' },
      { value: 'bachelor', label: 'Bachelor' },
      { value: 'master', label: 'Master' },
      { value: 'mba', label: 'MBA' },
      { value: 'doctorate', label: 'Doctorate' },
      PREFER_NOT_TO_SAY,
    ],
  },
  {
    key: 'field_of_study',
    label: 'Field of study',
    section: 'background',
    inputType: 'text',
    placeholder: 'e.g. Computer science, Psychology, Economics',
  },
  {
    key: 'age_band',
    label: 'Age band',
    section: 'background',
    inputType: 'select',
    options: [
      { value: '18_24', label: '18-24' },
      { value: '25_34', label: '25-34' },
      { value: '35_44', label: '35-44' },
      { value: '45_54', label: '45-54' },
      { value: '55_plus', label: '55+' },
      PREFER_NOT_TO_SAY,
    ],
  },
  {
    key: 'gender',
    label: 'Gender',
    section: 'background',
    inputType: 'select',
    options: [
      { value: 'male', label: 'Male' },
      { value: 'female', label: 'Female' },
      { value: 'non_binary', label: 'Non-binary' },
      SELF_DESCRIBE,
      PREFER_NOT_TO_SAY,
    ],
    sensitive: true,
    companionKey: 'gender_self_describe',
    companionLabel: 'How would you describe your gender?',
  },
  {
    key: 'ethnicity_race',
    label: 'Ethnicity / race',
    section: 'background',
    inputType: 'select',
    options: [
      { value: 'asian', label: 'Asian' },
      { value: 'black', label: 'Black' },
      { value: 'hispanic_latino', label: 'Hispanic / Latino' },
      { value: 'middle_east_north_africa', label: 'Middle Eastern / North African' },
      { value: 'indigenous_first_nations_native_american', label: 'Indigenous / First Nations / Native American' },
      { value: 'pacific_islander', label: 'Pacific Islander' },
      { value: 'white', label: 'White' },
      SELF_DESCRIBE,
      PREFER_NOT_TO_SAY,
    ],
    sensitive: true,
    companionKey: 'ethnicity_race_self_describe',
    companionLabel: 'How would you describe your ethnicity / race?',
  },
  {
    key: 'industry',
    label: 'Industry',
    section: 'organisation_context',
    inputType: 'select',
    options: [
      { value: 'technology_saas', label: 'Technology / SaaS' },
      { value: 'finance', label: 'Finance' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'consulting', label: 'Consulting' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'government', label: 'Government' },
      OTHER_OPTION,
    ],
  },
  {
    key: 'company_size',
    label: 'Company size',
    section: 'organisation_context',
    inputType: 'select',
    options: [
      { value: '1_50', label: '1-50 employees' },
      { value: '51_200', label: '51-200 employees' },
      { value: '201_1000', label: '201-1,000 employees' },
      { value: '1001_5000', label: '1,001-5,000 employees' },
      { value: '5000_plus', label: '5,000+ employees' },
    ],
  },
  {
    key: 'performance_rating',
    label: 'Performance rating',
    section: 'performance',
    inputType: 'select',
    options: [
      { value: 'top_performer', label: 'Top performer' },
      { value: 'above_average', label: 'Above average' },
      { value: 'average', label: 'Average' },
      { value: 'below_average', label: 'Below average' },
      PREFER_NOT_TO_SAY,
    ],
  },
  {
    key: 'promotion_history',
    label: 'Promotion history',
    section: 'performance',
    inputType: 'select',
    options: [
      { value: 'promoted_last_12_months', label: 'Promoted in the last 12 months' },
      { value: 'promoted_last_2_years', label: 'Promoted in the last 2 years' },
      { value: 'no_promotion_last_2_years', label: 'No promotion in the last 2 years' },
      { value: 'not_applicable', label: 'Not applicable' },
      PREFER_NOT_TO_SAY,
    ],
  },
  {
    key: 'revenue_responsibility',
    label: 'Revenue responsibility',
    section: 'performance',
    inputType: 'select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'partial', label: 'Partial' },
      { value: 'primary_owner', label: 'Primary owner' },
      PREFER_NOT_TO_SAY,
    ],
  },
  {
    key: 'team_size_budget_responsibility',
    label: 'Team size / budget responsibility',
    section: 'performance',
    inputType: 'select',
    options: [
      { value: 'none', label: 'None' },
      { value: 'small', label: 'Small team / budget' },
      { value: 'medium', label: 'Medium team / budget' },
      { value: 'large', label: 'Large team / budget' },
      PREFER_NOT_TO_SAY,
    ],
  },
] as const satisfies readonly DemographicFieldDefinition[]

export type DemographicFieldKey = (typeof DEMOGRAPHIC_FIELD_CATALOG)[number]['key']

export const LEGACY_DEMOGRAPHIC_FIELD_KEY_MAP: Record<string, DemographicFieldKey> = {
  seniority_level: 'job_level',
  primary_function: 'job_function',
  location_country: 'country',
  industry: 'industry',
  company_size: 'company_size',
}

export function normalizeCampaignDemographicFieldKeys(fields: unknown): DemographicFieldKey[] {
  if (!Array.isArray(fields)) return []

  const knownKeys = new Set<string>(DEMOGRAPHIC_FIELD_CATALOG.map((field) => field.key))
  const normalized = new Set<DemographicFieldKey>()

  for (const rawField of fields) {
    if (typeof rawField !== 'string') continue
    const mapped = LEGACY_DEMOGRAPHIC_FIELD_KEY_MAP[rawField] ?? rawField
    if (knownKeys.has(mapped)) {
      normalized.add(mapped as DemographicFieldKey)
    }
  }

  return Array.from(normalized)
}

export function getDemographicFieldDefinition(key: string): DemographicFieldDefinition | null {
  return DEMOGRAPHIC_FIELD_CATALOG.find((field) => field.key === key) ?? null
}

export function getEnabledDemographicFields(fields: unknown): DemographicFieldDefinition[] {
  return normalizeCampaignDemographicFieldKeys(fields)
    .map((fieldKey) => getDemographicFieldDefinition(fieldKey))
    .filter((field): field is DemographicFieldDefinition => field !== null)
}

export function sanitizeDemographicsRecord(
  fields: unknown,
  input: unknown
): CampaignDemographics | null {
  if (!input || typeof input !== 'object') return null

  const record = input as Record<string, unknown>
  const allowedFields = getEnabledDemographicFields(fields)
  const sanitized: CampaignDemographics = {}

  for (const field of allowedFields) {
    const rawValue = record[field.key]
    if (field.inputType === 'multiselect') {
      const values = Array.isArray(rawValue)
        ? rawValue.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean)
        : []
      if (values.length > 0) {
        sanitized[field.key] = Array.from(new Set(values))
      }
    } else if (typeof rawValue === 'string') {
      const value = rawValue.trim()
      if (value) {
        sanitized[field.key] = value
      }
    }

    if (field.companionKey && typeof record[field.companionKey] === 'string') {
      const companionValue = String(record[field.companionKey]).trim()
      if (companionValue) {
        sanitized[field.companionKey] = companionValue
      }
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : null
}
