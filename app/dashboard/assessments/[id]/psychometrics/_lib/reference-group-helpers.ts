type DemographicRow = {
  id: string
  key: string
  value: string
}

export type ReferenceGroupFilterDraft = {
  campaignIds: string[]
  cohortIds: string[]
  createdAtFrom: string
  createdAtTo: string
  demographicRows: DemographicRow[]
  advancedJson: string
}

export function nextDemographicRow(key = '', value = ''): DemographicRow {
  return {
    id: crypto.randomUUID(),
    key,
    value,
  }
}

export function createEmptyReferenceGroupDraft(): ReferenceGroupFilterDraft {
  return {
    campaignIds: [],
    cohortIds: [],
    createdAtFrom: '',
    createdAtTo: '',
    demographicRows: [nextDemographicRow()],
    advancedJson: '{}',
  }
}

function asStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0) : []
}

export function buildReferenceGroupDraft(filters: Record<string, unknown>): ReferenceGroupFilterDraft {
  const advancedFilters = { ...filters }
  delete advancedFilters.campaign_ids
  delete advancedFilters.cohort_ids
  delete advancedFilters.created_at_from
  delete advancedFilters.created_at_to
  delete advancedFilters.demographics

  const demographicEntries = filters.demographics && typeof filters.demographics === 'object' && !Array.isArray(filters.demographics)
    ? Object.entries(filters.demographics as Record<string, unknown>).map(([key, rawValue]) =>
        nextDemographicRow(key, Array.isArray(rawValue) ? rawValue.join(', ') : typeof rawValue === 'string' ? rawValue : '')
      )
    : []

  return {
    campaignIds: asStringList(filters.campaign_ids),
    cohortIds: asStringList(filters.cohort_ids),
    createdAtFrom: typeof filters.created_at_from === 'string' ? filters.created_at_from : '',
    createdAtTo: typeof filters.created_at_to === 'string' ? filters.created_at_to : '',
    demographicRows: demographicEntries.length > 0 ? demographicEntries : [nextDemographicRow()],
    advancedJson: Object.keys(advancedFilters).length > 0 ? JSON.stringify(advancedFilters, null, 2) : '{}',
  }
}

function parseListValue(value: string) {
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 1 ? parts : parts[0] ?? ''
}

export function buildReferenceGroupFilters(draft: ReferenceGroupFilterDraft) {
  const filters: Record<string, unknown> = {}

  if (draft.campaignIds.length > 0) filters.campaign_ids = draft.campaignIds
  if (draft.cohortIds.length > 0) filters.cohort_ids = draft.cohortIds
  if (draft.createdAtFrom) filters.created_at_from = draft.createdAtFrom
  if (draft.createdAtTo) filters.created_at_to = draft.createdAtTo

  const demographics = draft.demographicRows.reduce<Record<string, string | string[]>>((acc, row) => {
    const key = row.key.trim()
    const value = row.value.trim()
    if (!key || !value) return acc
    const parsed = parseListValue(value)
    if (Array.isArray(parsed)) {
      acc[key] = parsed
    } else if (parsed) {
      acc[key] = parsed
    }
    return acc
  }, {})

  if (Object.keys(demographics).length > 0) {
    filters.demographics = demographics
  }

  const rawAdvanced = draft.advancedJson.trim()
  if (!rawAdvanced || rawAdvanced === '{}') {
    return { filters, error: null as string | null }
  }

  try {
    const parsed = JSON.parse(rawAdvanced) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { filters, error: 'Advanced JSON must be an object.' }
    }
    return {
      filters: {
        ...filters,
        ...(parsed as Record<string, unknown>),
      },
      error: null as string | null,
    }
  } catch {
    return { filters, error: 'Advanced JSON must be valid before saving.' }
  }
}

type ReferenceOption = {
  id: string
  name: string
  status?: string | null
}

export function describeFilters(
  filters: Record<string, unknown>,
  campaignOptions: ReferenceOption[],
  cohortOptions: ReferenceOption[]
) {
  if (Object.keys(filters).length === 0) return ['All responses']

  const campaignNameById = new Map(campaignOptions.map((campaign) => [campaign.id, campaign.name]))
  const cohortNameById = new Map(cohortOptions.map((cohort) => [cohort.id, cohort.name]))
  const labels: string[] = []

  for (const value of asStringList(filters.campaign_ids)) {
    labels.push(`Campaign: ${campaignNameById.get(value) ?? value}`)
  }

  for (const value of asStringList(filters.cohort_ids)) {
    labels.push(`Cohort: ${cohortNameById.get(value) ?? value}`)
  }

  if (typeof filters.created_at_from === 'string') {
    labels.push(`From ${formatDate(filters.created_at_from)}`)
  }

  if (typeof filters.created_at_to === 'string') {
    labels.push(`To ${formatDate(filters.created_at_to)}`)
  }

  if (filters.demographics && typeof filters.demographics === 'object' && !Array.isArray(filters.demographics)) {
    for (const [key, rawValue] of Object.entries(filters.demographics as Record<string, unknown>)) {
      if (Array.isArray(rawValue)) {
        labels.push(`${key}: ${rawValue.join(', ')}`)
      } else if (typeof rawValue === 'string') {
        labels.push(`${key}: ${rawValue}`)
      }
    }
  }

  const knownKeys = new Set(['campaign_ids', 'cohort_ids', 'created_at_from', 'created_at_to', 'demographics'])
  const advancedKeys = Object.keys(filters).filter((key) => !knownKeys.has(key))
  if (advancedKeys.length > 0) {
    labels.push(`Advanced: ${advancedKeys.join(', ')}`)
  }

  return labels
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function toggleSelection(current: string[], id: string) {
  return current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
}
