// ---------------------------------------------------------------------------
// V2 Block-Based Report Template — Types + Normalization
// ---------------------------------------------------------------------------

// --- Data sources (what to show) ---
export type V2BlockDataSource =
  | 'overall_classification'
  | 'derived_outcome'
  | 'dimension_scores'
  | 'competency_scores'
  | 'trait_scores'
  | 'interpretations'
  | 'recommendations'
  | 'static_content'

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

// --- Per-block config types ---
export type V2BlockScoreConfig = {
  score_mode?: 'sten' | 'percentile' | 'raw' | 'auto'
  score_max?: number
  show_sem_bands?: boolean
  show_score_labels?: boolean
  group_by_dimension?: boolean
}

export type V2BlockContentConfig = {
  eyebrow?: string
  title?: string
  description?: string
  body_markdown?: string
}

export type V2BlockFilterConfig = {
  include_keys?: string[]
  exclude_keys?: string[]
  max_items?: number
  outcome_set_key?: string
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
  pdf_break_before?: boolean
  pdf_hidden?: boolean
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
  }
  composition?: V2ReportCompositionDefinition
  blocks: V2ReportBlockDefinition[]
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const VALID_SOURCES: V2BlockDataSource[] = [
  'overall_classification',
  'derived_outcome',
  'dimension_scores',
  'competency_scores',
  'trait_scores',
  'interpretations',
  'recommendations',
  'static_content',
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
]

export function createEmptyV2ReportTemplate(): V2ReportTemplateDefinition {
  return {
    version: 1,
    name: '',
    description: '',
    global: { pdf_enabled: true },
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

function normalizeScoreConfig(raw: unknown): V2BlockScoreConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const validModes = ['sten', 'percentile', 'raw', 'auto'] as const
  const mode = validModes.find((m) => m === r.score_mode)
  const result: V2BlockScoreConfig = {}
  if (mode) result.score_mode = mode
  const max = asNumber(r.score_max)
  if (max !== undefined) result.score_max = max
  if (typeof r.show_sem_bands === 'boolean') result.show_sem_bands = r.show_sem_bands
  if (typeof r.show_score_labels === 'boolean') result.show_score_labels = r.show_score_labels
  if (typeof r.group_by_dimension === 'boolean') result.group_by_dimension = r.group_by_dimension
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
    pdf_break_before: typeof r.pdf_break_before === 'boolean' ? r.pdf_break_before : undefined,
    pdf_hidden: typeof r.pdf_hidden === 'boolean' ? r.pdf_hidden : undefined,
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

  return {
    id,
    source,
    format,
    content: normalizeContentConfig(r.content),
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

  return {
    version: 1,
    name: asString(raw.name).trim(),
    description: asString(raw.description).trim() || undefined,
    global: {
      pdf_enabled: asBool(globalRaw.pdf_enabled, true),
      layer_labels: normalizeLayerLabels(globalRaw.layer_labels),
    },
    composition: normalizeComposition(raw.composition),
    blocks,
  }
}
