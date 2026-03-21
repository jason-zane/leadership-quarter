// ---------------------------------------------------------------------------
// V2 Block-Based Report Template — Types + Normalization
// ---------------------------------------------------------------------------

// --- Data sources (what to show) ---
export type V2BlockDataSource =
  | 'overall_classification'
  | 'archetype_profile'
  | 'derived_outcome'
  | 'layer_profile'
  | 'dimension_scores'
  | 'competency_scores'
  | 'trait_scores'
  | 'interpretations'
  | 'recommendations'
  | 'static_content'
  | 'report_header'
  | 'report_cta'

// --- Display formats (how to show it) ---
export type V2BlockDisplayFormat =
  | 'hero_card'
  | 'score_cards'
  | 'bar_chart'
  | 'band_cards'
  | 'insight_list'
  | 'bullet_list'
  | 'rich_text'
  | 'score_table'
  | 'bipolar_bar'

// --- Per-block config types ---
export type V2BlockScoreConfig = {
  score_mode?: 'display' | 'sten' | 'percentile' | 'raw' | 'auto'
  score_max?: number
  show_sem_bands?: boolean
  show_score_labels?: boolean
  group_by_dimension?: boolean
  show_score?: boolean
}

export type V2BlockContentConfig = {
  eyebrow?: string
  title?: string
  description?: string
  body_markdown?: string
}

export type V2ReportBrandingMode = 'inherit_org' | 'force_lq' | 'custom_override'

export type V2ReportStylePreset = 'classic' | 'editorial' | 'minimal'

export type V2ReportBrandingConfig = {
  mode?: V2ReportBrandingMode
  company_name?: string
  logo_url?: string
  primary_color?: string
  secondary_color?: string
  show_lq_attribution?: boolean
}

export type V2ReportPresentationConfig = {
  style_preset?: V2ReportStylePreset
}

export type V2BlockNarrativeField = 'label' | 'short_description' | 'report_summary' | 'full_narrative'

export type V2BlockContentMode = 'report' | 'derived_outcome'
export type V2BlockProfileLayer = 'dimension' | 'competency' | 'trait'
export type V2BlockProfileLabelMode = 'internal' | 'external'
export type V2BlockProfileBodySource = 'summary_definition' | 'detailed_definition' | 'current_band_behaviour' | 'none'
export type V2BlockProfileBehaviourMode = 'current_only' | 'low_high_only' | 'all_three' | 'none'
export type V2BlockProfileMetricKey = 'display' | 'raw' | 'sten' | 'percentile'
export type V2BlockProfileSortMode = 'template_order' | 'score_desc' | 'score_asc' | 'alphabetical'

export type V2CtaInternalDestinationKey =
  | 'home'
  | 'contact'
  | 'framework'
  | 'framework_ai_readiness'
  | 'framework_lq8'
  | 'capabilities'
  | 'capability_ai_readiness'
  | 'capability_leadership_assessment'
  | 'capability_executive_search'
  | 'capability_succession_strategy'
  | 'work_with_us'

export type V2BlockDataConfig = {
  badge_label?: string
  show_date?: boolean
  show_participant?: boolean
  show_email?: boolean
  heading_field?: V2BlockNarrativeField
  summary_field?: Exclude<V2BlockNarrativeField, 'label'>
  body_field?: Exclude<V2BlockNarrativeField, 'label'>
  show_input_evidence?: boolean
  content_mode?: V2BlockContentMode
  layer?: V2BlockProfileLayer
  label_mode?: V2BlockProfileLabelMode
  body_source?: V2BlockProfileBodySource
  show_band?: boolean
  show_low_high_meaning?: boolean
  show_behaviour_snapshot?: boolean
  behaviour_snapshot_mode?: V2BlockProfileBehaviourMode
  split_items_into_cards?: boolean
  metric_key?: V2BlockProfileMetricKey
  metric_scale_max?: number
  sort_mode?: V2BlockProfileSortMode
}

export type V2BlockLinkConfig = {
  mode?: 'internal' | 'custom'
  internal_key?: V2CtaInternalDestinationKey
  custom_url?: string
  label?: string
  open_in_new_tab?: boolean
}

export type V2BlockFilterConfig = {
  include_keys?: string[]
  exclude_keys?: string[]
  max_items?: number
  outcome_set_key?: string
  use_derived_narrative?: boolean
}

export type V2BlockStyleConfig = {
  columns?: 1 | 2 | 3
  pdf_break_before?: boolean
  pdf_hidden?: boolean
}

export type V2ReportSectionKind =
  | 'overall_profile'
  | 'score_summary'
  | 'narrative_insights'
  | 'recommendations'
  | 'editorial'

export type V2ReportSectionLayer = 'dimension' | 'competency' | 'trait'

export type V2ReportSectionLayout =
  | 'hero_card'
  | 'score_cards'
  | 'bar_chart'
  | 'score_table'
  | 'band_cards'
  | 'insight_list'
  | 'bullet_list'
  | 'rich_text'
  | 'bipolar_bar'

export type V2ReportSectionDefinition = {
  id: string
  kind: V2ReportSectionKind
  title: string
  description?: string
  enabled: boolean
  layer?: V2ReportSectionLayer
  layout?: V2ReportSectionLayout
  include_keys?: string[]
  exclude_keys?: string[]
  max_items?: number
  body_markdown?: string
  show_score?: boolean
  columns?: 1 | 2 | 3
  eyebrow?: string
  pdf_break_before?: boolean
  pdf_hidden?: boolean
  source_override?: 'default' | 'derived_outcome'
}

export type V2ReportCompositionDefinition = {
  version: 1
  sections: V2ReportSectionDefinition[]
}

// --- The block definition ---
export type V2ReportBlockDefinition = {
  id: string
  source: V2BlockDataSource
  format: V2BlockDisplayFormat
  content?: V2BlockContentConfig
  data?: V2BlockDataConfig
  link?: V2BlockLinkConfig
  score?: V2BlockScoreConfig
  filter?: V2BlockFilterConfig
  style?: V2BlockStyleConfig
  enabled: boolean
}

// --- The template (ordered list of blocks + global settings) ---
export type V2ReportTemplateDefinition = {
  version: 1
  name: string
  description?: string
  global: {
    pdf_enabled: boolean
    layer_labels?: Partial<Record<'dimensions' | 'competencies' | 'traits', string>>
    branding?: V2ReportBrandingConfig
    presentation?: V2ReportPresentationConfig
  }
  composition?: V2ReportCompositionDefinition
  blocks: V2ReportBlockDefinition[]
}

export function normalizeV2ReportStylePreset(value: unknown): V2ReportStylePreset {
  return value === 'editorial' || value === 'minimal' ? value : 'classic'
}

export function isValidV2CtaUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('/')) return true

  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const VALID_SOURCES: V2BlockDataSource[] = [
  'overall_classification',
  'archetype_profile',
  'derived_outcome',
  'layer_profile',
  'dimension_scores',
  'competency_scores',
  'trait_scores',
  'interpretations',
  'recommendations',
  'static_content',
  'report_header',
  'report_cta',
]

const VALID_FORMATS: V2BlockDisplayFormat[] = [
  'hero_card',
  'score_cards',
  'bar_chart',
  'band_cards',
  'insight_list',
  'bullet_list',
  'rich_text',
  'score_table',
  'bipolar_bar',
]

export function createEmptyV2ReportTemplate(): V2ReportTemplateDefinition {
  return {
    version: 1,
    name: '',
    description: '',
    global: {
      pdf_enabled: true,
      branding: {
        mode: 'inherit_org',
      },
      presentation: {
        style_preset: 'classic',
      },
    },
    composition: {
      version: 1,
      sections: [],
    },
    blocks: [],
  }
}

// ---------------------------------------------------------------------------
// Normalization — defensive JSONB parsing
// ---------------------------------------------------------------------------

function asString(v: unknown): string {
  if (typeof v === 'string') return v
  if (v == null) return ''
  return String(v)
}

function asBool(v: unknown, fallback: boolean): boolean {
  if (typeof v === 'boolean') return v
  if (v === 'true') return true
  if (v === 'false') return false
  return fallback
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x) => typeof x === 'string')
}

function isHexColor(value: string) {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value)
}

function normalizeScoreConfig(raw: unknown): V2BlockScoreConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const validModes = ['display', 'sten', 'percentile', 'raw', 'auto'] as const
  const mode = validModes.find((m) => m === r.score_mode)
  const result: V2BlockScoreConfig = {}
  if (mode) result.score_mode = mode
  const max = asNumber(r.score_max)
  if (max !== undefined) result.score_max = max
  if (typeof r.show_sem_bands === 'boolean') result.show_sem_bands = r.show_sem_bands
  if (typeof r.show_score_labels === 'boolean') result.show_score_labels = r.show_score_labels
  if (typeof r.group_by_dimension === 'boolean') result.group_by_dimension = r.group_by_dimension
  if (typeof r.show_score === 'boolean') result.show_score = r.show_score
  return Object.keys(result).length > 0 ? result : undefined
}

function normalizeContentConfig(raw: unknown): V2BlockContentConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const result: V2BlockContentConfig = {}
  const eyebrow = asString(r.eyebrow).trim()
  if (eyebrow) result.eyebrow = eyebrow
  const title = asString(r.title).trim()
  if (title) result.title = title
  const description = asString(r.description).trim()
  if (description) result.description = description
  const body = asString(r.body_markdown).trim()
  if (body) result.body_markdown = body
  return Object.keys(result).length > 0 ? result : undefined
}

function normalizeDataConfig(raw: unknown): V2BlockDataConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const result: V2BlockDataConfig = {}
  const validNarrativeFields: V2BlockNarrativeField[] = [
    'label',
    'short_description',
    'report_summary',
    'full_narrative',
  ]
  const validBodyFields: Array<Exclude<V2BlockNarrativeField, 'label'>> = [
    'short_description',
    'report_summary',
    'full_narrative',
  ]
  const validContentModes: V2BlockContentMode[] = ['report', 'derived_outcome']
  const validLayers: V2BlockProfileLayer[] = ['dimension', 'competency', 'trait']
  const validLabelModes: V2BlockProfileLabelMode[] = ['internal', 'external']
  const validBodySources: V2BlockProfileBodySource[] = ['summary_definition', 'detailed_definition', 'current_band_behaviour', 'none']
  const validBehaviourModes: V2BlockProfileBehaviourMode[] = ['current_only', 'low_high_only', 'all_three', 'none']
  const validMetricKeys: V2BlockProfileMetricKey[] = ['display', 'raw', 'sten', 'percentile']
  const validSortModes: V2BlockProfileSortMode[] = ['template_order', 'score_desc', 'score_asc', 'alphabetical']

  const badgeLabel = asString(r.badge_label).trim()
  if (badgeLabel) result.badge_label = badgeLabel
  if (typeof r.show_date === 'boolean') result.show_date = r.show_date
  if (typeof r.show_participant === 'boolean') result.show_participant = r.show_participant
  if (typeof r.show_email === 'boolean') result.show_email = r.show_email

  const headingField = validNarrativeFields.find((value) => value === r.heading_field)
  if (headingField) result.heading_field = headingField
  const summaryField = validBodyFields.find((value) => value === r.summary_field)
  if (summaryField) result.summary_field = summaryField
  const bodyField = validBodyFields.find((value) => value === r.body_field)
  if (bodyField) result.body_field = bodyField
  if (typeof r.show_input_evidence === 'boolean') result.show_input_evidence = r.show_input_evidence
  const contentMode = validContentModes.find((value) => value === r.content_mode)
  if (contentMode) result.content_mode = contentMode
  const layer = validLayers.find((value) => value === r.layer)
  if (layer) result.layer = layer
  const labelMode = validLabelModes.find((value) => value === r.label_mode)
  if (labelMode) result.label_mode = labelMode
  const bodySource = validBodySources.find((value) => value === r.body_source)
  if (bodySource) result.body_source = bodySource
  if (typeof r.show_band === 'boolean') result.show_band = r.show_band
  if (typeof r.show_low_high_meaning === 'boolean') result.show_low_high_meaning = r.show_low_high_meaning
  if (typeof r.show_behaviour_snapshot === 'boolean') result.show_behaviour_snapshot = r.show_behaviour_snapshot
  const behaviourMode = validBehaviourModes.find((value) => value === r.behaviour_snapshot_mode)
  if (behaviourMode) result.behaviour_snapshot_mode = behaviourMode
  if (typeof r.split_items_into_cards === 'boolean') result.split_items_into_cards = r.split_items_into_cards
  const metricKey = validMetricKeys.find((value) => value === r.metric_key)
  if (metricKey) result.metric_key = metricKey
  const metricScaleMax = asNumber(r.metric_scale_max)
  if (metricScaleMax !== undefined && metricScaleMax > 0) result.metric_scale_max = metricScaleMax
  const sortMode = validSortModes.find((value) => value === r.sort_mode)
  if (sortMode) result.sort_mode = sortMode

  return Object.keys(result).length > 0 ? result : undefined
}

function normalizeLinkConfig(raw: unknown): V2BlockLinkConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const result: V2BlockLinkConfig = {}
  const validModes = ['internal', 'custom'] as const
  const validInternalKeys: V2CtaInternalDestinationKey[] = [
    'home',
    'contact',
    'framework',
    'framework_ai_readiness',
    'framework_lq8',
    'capabilities',
    'capability_ai_readiness',
    'capability_leadership_assessment',
    'capability_executive_search',
    'capability_succession_strategy',
    'work_with_us',
  ]

  const mode = validModes.find((value) => value === r.mode)
  if (mode) result.mode = mode
  const internalKey = validInternalKeys.find((value) => value === r.internal_key)
  if (internalKey) result.internal_key = internalKey
  const customUrl = asString(r.custom_url).trim()
  if (customUrl) result.custom_url = customUrl
  const label = asString(r.label).trim()
  if (label) result.label = label
  if (typeof r.open_in_new_tab === 'boolean') result.open_in_new_tab = r.open_in_new_tab

  return Object.keys(result).length > 0 ? result : undefined
}

function normalizeFilterConfig(raw: unknown): V2BlockFilterConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const result: V2BlockFilterConfig = {}
  const include = asStringArray(r.include_keys)
  if (include.length > 0) result.include_keys = include
  const exclude = asStringArray(r.exclude_keys)
  if (exclude.length > 0) result.exclude_keys = exclude
  const max = asNumber(r.max_items)
  if (max !== undefined && max > 0) result.max_items = max
  const outcomeSetKey = asString(r.outcome_set_key).trim()
  if (outcomeSetKey) result.outcome_set_key = outcomeSetKey
  if (typeof r.use_derived_narrative === 'boolean') result.use_derived_narrative = r.use_derived_narrative
  return Object.keys(result).length > 0 ? result : undefined
}

function normalizeStyleConfig(raw: unknown): V2BlockStyleConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const result: V2BlockStyleConfig = {}
  const validCols = [1, 2, 3] as const
  const cols = asNumber(r.columns)
  if (cols !== undefined && validCols.includes(cols as 1 | 2 | 3)) {
    result.columns = cols as 1 | 2 | 3
  }
  if (typeof r.pdf_break_before === 'boolean') result.pdf_break_before = r.pdf_break_before
  if (typeof r.pdf_hidden === 'boolean') result.pdf_hidden = r.pdf_hidden
  return Object.keys(result).length > 0 ? result : undefined
}

function normalizeBrandingConfig(raw: unknown): V2ReportBrandingConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const result: V2ReportBrandingConfig = {}
  const validModes: V2ReportBrandingMode[] = ['inherit_org', 'force_lq', 'custom_override']
  const mode = validModes.find((value) => value === r.mode)
  if (mode) result.mode = mode

  const companyName = asString(r.company_name).trim()
  if (companyName) result.company_name = companyName
  const logoUrl = asString(r.logo_url).trim()
  if (logoUrl) result.logo_url = logoUrl
  const primaryColor = asString(r.primary_color).trim()
  if (primaryColor && isHexColor(primaryColor)) result.primary_color = primaryColor
  const secondaryColor = asString(r.secondary_color).trim()
  if (secondaryColor && isHexColor(secondaryColor)) result.secondary_color = secondaryColor
  if (typeof r.show_lq_attribution === 'boolean') result.show_lq_attribution = r.show_lq_attribution

  return Object.keys(result).length > 0 ? result : undefined
}

function normalizePresentationConfig(raw: unknown): V2ReportPresentationConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  return {
    style_preset: normalizeV2ReportStylePreset(r.style_preset),
  }
}

function normalizeSection(raw: unknown): V2ReportSectionDefinition | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const validKinds: V2ReportSectionKind[] = [
    'overall_profile',
    'score_summary',
    'narrative_insights',
    'recommendations',
    'editorial',
  ]
  const validLayers: V2ReportSectionLayer[] = ['dimension', 'competency', 'trait']
  const validLayouts: V2ReportSectionLayout[] = [
    'hero_card',
    'score_cards',
    'bar_chart',
    'score_table',
    'band_cards',
    'insight_list',
    'bullet_list',
    'rich_text',
    'bipolar_bar',
  ]

  const kind = validKinds.find((value) => value === r.kind)
  if (!kind) return null

  const title = asString(r.title).trim() || 'Untitled section'
  const description = asString(r.description).trim() || undefined
  const layer = validLayers.find((value) => value === r.layer)
  const layout = validLayouts.find((value) => value === r.layout)
  const includeKeys = asStringArray(r.include_keys)
  const excludeKeys = asStringArray(r.exclude_keys)
  const maxItems = asNumber(r.max_items)
  const bodyMarkdown = asString(r.body_markdown).trim() || undefined

  const validSourceOverrides = ['default', 'derived_outcome'] as const
  const sourceOverride = validSourceOverrides.find((v) => v === r.source_override)

  return {
    id: asString(r.id).trim() || crypto.randomUUID(),
    kind,
    title,
    description,
    enabled: asBool(r.enabled, true),
    layer,
    layout,
    include_keys: includeKeys.length > 0 ? includeKeys : undefined,
    exclude_keys: excludeKeys.length > 0 ? excludeKeys : undefined,
    max_items: maxItems !== undefined && maxItems > 0 ? maxItems : undefined,
    body_markdown: bodyMarkdown,
    show_score: typeof r.show_score === 'boolean' ? r.show_score : undefined,
    columns: ([1, 2, 3] as const).find((c) => c === asNumber(r.columns)),
    eyebrow: asString(r.eyebrow).trim() || undefined,
    pdf_break_before: typeof r.pdf_break_before === 'boolean' ? r.pdf_break_before : undefined,
    pdf_hidden: typeof r.pdf_hidden === 'boolean' ? r.pdf_hidden : undefined,
    source_override: sourceOverride,
  }
}

function normalizeComposition(raw: unknown): V2ReportCompositionDefinition | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const sections = Array.isArray(r.sections)
    ? r.sections
      .map((item) => normalizeSection(item))
      .filter((item): item is V2ReportSectionDefinition => item !== null)
    : []

  return {
    version: 1,
    sections,
  }
}

function normalizeBlock(raw: unknown): V2ReportBlockDefinition | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const source = VALID_SOURCES.find((s) => s === r.source)
  const format = VALID_FORMATS.find((f) => f === r.format)
  if (!source || !format) return null

  const id = asString(r.id).trim() || crypto.randomUUID()
  const normalizedLink = normalizeLinkConfig(r.link)

  return {
    id,
    source,
    format,
    content: normalizeContentConfig(r.content),
    data: normalizeDataConfig(r.data),
    link: source === 'report_cta'
      ? {
          mode: normalizedLink?.mode ?? 'internal',
          internal_key: normalizedLink?.internal_key ?? 'contact',
          custom_url: normalizedLink?.custom_url,
          label: normalizedLink?.label ?? 'Contact us',
          open_in_new_tab: normalizedLink?.open_in_new_tab ?? false,
        }
      : normalizedLink,
    score: normalizeScoreConfig(r.score),
    filter: normalizeFilterConfig(r.filter),
    style: normalizeStyleConfig(r.style),
    enabled: asBool(r.enabled, true),
  }
}

function normalizeLayerLabels(
  raw: unknown
): Partial<Record<'dimensions' | 'competencies' | 'traits', string>> | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const result: Partial<Record<'dimensions' | 'competencies' | 'traits', string>> = {}
  for (const key of ['dimensions', 'competencies', 'traits'] as const) {
    const v = asString(r[key]).trim()
    if (v) result[key] = v
  }
  return Object.keys(result).length > 0 ? result : undefined
}

export function normalizeV2ReportTemplate(input: unknown): V2ReportTemplateDefinition {
  const raw = (input ?? {}) as Record<string, unknown>

  const globalRaw = (raw.global ?? {}) as Record<string, unknown>

  const rawBlocks = Array.isArray(raw.blocks) ? raw.blocks : []
  const blocks = rawBlocks
    .map((b) => normalizeBlock(b))
    .filter((b): b is V2ReportBlockDefinition => b !== null)

  const hasHeader = blocks.some((b) => b.source === 'report_header')
  const hasCta = blocks.some((b) => b.source === 'report_cta')

  if (!hasHeader) {
    blocks.unshift({ id: 'report_header', source: 'report_header', format: 'hero_card', enabled: true })
  }
  if (!hasCta) {
    blocks.push({
      id: 'report_cta',
      source: 'report_cta',
      format: 'rich_text',
      enabled: false,
      content: { title: 'Want to discuss your results?', description: '', body_markdown: '' },
    })
  }

  return {
    version: 1,
    name: asString(raw.name).trim(),
    description: asString(raw.description).trim() || undefined,
    global: {
      pdf_enabled: asBool(globalRaw.pdf_enabled, true),
      layer_labels: normalizeLayerLabels(globalRaw.layer_labels),
      branding: normalizeBrandingConfig(globalRaw.branding) ?? { mode: 'inherit_org' },
      presentation: normalizePresentationConfig(globalRaw.presentation) ?? { style_preset: 'classic' },
    },
    composition: normalizeComposition(raw.composition),
    blocks,
  }
}
