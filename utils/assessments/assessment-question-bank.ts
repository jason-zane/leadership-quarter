export type V2LayerKey = 'dimensions' | 'competencies' | 'traits' | 'items'
export type V2ScalePoints = 2 | 3 | 4 | 5 | 6 | 7
export type V2ScaleOrder = 'ascending' | 'descending'

export type V2LayerLabel = {
  internalLabel: string
  externalLabel: string
}

export type V2LayerLabels = Record<V2LayerKey, V2LayerLabel>

export type V2LayerBehaviorIndicators = {
  high: string
  mid: string
  low: string
}

export type V2LayerScoreInterpretation = {
  high: string
  low: string
}

export type V2LayerContent = {
  summaryDefinition: string
  detailedDefinition: string
  behaviourIndicators: V2LayerBehaviorIndicators
  scoreInterpretation: V2LayerScoreInterpretation
}

export type V2Dimension = {
  id: string
  key: string
  internalName: string
  externalName: string
  definition: string
  summaryDefinition: string
  detailedDefinition: string
  behaviourIndicators: V2LayerBehaviorIndicators
  scoreInterpretation: V2LayerScoreInterpretation
}

export type V2Competency = {
  id: string
  key: string
  internalName: string
  externalName: string
  definition: string
  summaryDefinition: string
  detailedDefinition: string
  behaviourIndicators: V2LayerBehaviorIndicators
  scoreInterpretation: V2LayerScoreInterpretation
  dimensionKeys: string[]
}

export type V2Trait = {
  id: string
  key: string
  internalName: string
  externalName: string
  definition: string
  summaryDefinition: string
  detailedDefinition: string
  behaviourIndicators: V2LayerBehaviorIndicators
  scoreInterpretation: V2LayerScoreInterpretation
  competencyKeys: string[]
}

export type V2ScoredItem = {
  id: string
  key: string
  text: string
  traitKey: string
  isReverseCoded: boolean
  weight: number
}

export type V2SocialDesirabilityItem = {
  id: string
  key: string
  text: string
  isReverseCoded: boolean
}

export type V2QuestionBank = {
  version: 1
  layerLabels: V2LayerLabels
  scale: {
    points: V2ScalePoints
    labels: string[]
    order: V2ScaleOrder
  }
  dimensions: V2Dimension[]
  competencies: V2Competency[]
  traits: V2Trait[]
  scoredItems: V2ScoredItem[]
  socialItems: V2SocialDesirabilityItem[]
}

export type V2QuestionBankCsvRow = {
  item_type: 'scored' | 'social'
  item_key: string
  item_text: string
  reverse_coded: boolean
  item_weight: number
  trait_key: string
  trait_internal_name: string
  trait_external_name: string
  trait_definition: string
  trait_summary_definition: string
  trait_detailed_definition: string
  trait_behavior_high: string
  trait_behavior_mid: string
  trait_behavior_low: string
  trait_interpretation_high: string
  trait_interpretation_low: string
  competency_keys: string[]
  competency_internal_names: string[]
  competency_external_names: string[]
  competency_definitions: string[]
  competency_summary_definitions: string[]
  competency_detailed_definitions: string[]
  competency_behavior_high: string[]
  competency_behavior_mid: string[]
  competency_behavior_low: string[]
  competency_interpretation_high: string[]
  competency_interpretation_low: string[]
  dimension_keys: string[]
  dimension_internal_names: string[]
  dimension_external_names: string[]
  dimension_definitions: string[]
  dimension_summary_definitions: string[]
  dimension_detailed_definitions: string[]
  dimension_behavior_high: string[]
  dimension_behavior_mid: string[]
  dimension_behavior_low: string[]
  dimension_interpretation_high: string[]
  dimension_interpretation_low: string[]
}

export const DEFAULT_V2_LAYER_LABELS: V2LayerLabels = {
  dimensions: { internalLabel: 'Dimensions', externalLabel: 'Dimensions' },
  competencies: { internalLabel: 'Competencies', externalLabel: 'Competencies' },
  traits: { internalLabel: 'Traits', externalLabel: 'Traits' },
  items: { internalLabel: 'Items', externalLabel: 'Items' },
}

export const V2_SCALE_POINTS: V2ScalePoints[] = [2, 3, 4, 5, 6, 7]

export const DEFAULT_V2_SCALE = {
  points: 5 as V2ScalePoints,
  labels: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
  order: 'ascending' as V2ScaleOrder,
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function asBoolean(value: unknown) {
  return value === true
}

function asNumber(value: unknown, fallback = 1) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeWeight(value: unknown) {
  return Math.max(0, Number(asNumber(value, 1).toFixed(3)))
}

function normalizeScalePoints(value: unknown): V2ScalePoints {
  return V2_SCALE_POINTS.includes(Number(value) as V2ScalePoints)
    ? (Number(value) as V2ScalePoints)
    : DEFAULT_V2_SCALE.points
}

function normalizeScaleLabels(value: unknown, points: V2ScalePoints) {
  const incoming = Array.isArray(value)
    ? value.map((item) => asString(item).trim())
    : []

  return Array.from({ length: points }, (_, index) => incoming[index] ?? DEFAULT_V2_SCALE.labels[index] ?? `Value ${index + 1}`)
}

function normalizeScaleOrder(value: unknown): V2ScaleOrder {
  return value === 'descending' ? 'descending' : DEFAULT_V2_SCALE.order
}

function asStringArray(value: unknown, options?: { preserveDrafts?: boolean }) {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      const stringValue = asString(item)
      return options?.preserveDrafts === true ? stringValue : stringValue.trim()
    })
    .filter((item) => options?.preserveDrafts === true || Boolean(item))
}

function normalizeLayerLabel(layer: unknown, fallback: V2LayerLabel): V2LayerLabel {
  return {
    internalLabel: asString((layer as { internalLabel?: unknown } | null)?.internalLabel).trim() || fallback.internalLabel,
    externalLabel: asString((layer as { externalLabel?: unknown } | null)?.externalLabel).trim() || fallback.externalLabel,
  }
}

function normalizeRows<T>(items: unknown, mapper: (row: Record<string, unknown>) => T | null): T[] {
  if (!Array.isArray(items)) return []

  return items
    .map((item) => item as Record<string, unknown>)
    .map(mapper)
    .filter((item): item is T => item !== null)
}

function emptyBehaviorIndicators(): V2LayerBehaviorIndicators {
  return {
    high: '',
    mid: '',
    low: '',
  }
}

function emptyScoreInterpretation(): V2LayerScoreInterpretation {
  return {
    high: '',
    low: '',
  }
}

export function createEmptyLayerContent(): V2LayerContent {
  return {
    summaryDefinition: '',
    detailedDefinition: '',
    behaviourIndicators: emptyBehaviorIndicators(),
    scoreInterpretation: emptyScoreInterpretation(),
  }
}

function normalizeBehaviorIndicators(raw: unknown, options?: { preserveDrafts?: boolean }): V2LayerBehaviorIndicators {
  const value = raw as Record<string, unknown> | null | undefined
  const normalizeText = (input: unknown) => {
    if (Array.isArray(input)) {
      return input
        .map((item) => {
          const stringValue = asString(item)
          return options?.preserveDrafts === true ? stringValue : stringValue.trim()
        })
        .filter((item) => options?.preserveDrafts === true || Boolean(item))
        .join('\n')
    }

    const stringValue = asString(input)
    return options?.preserveDrafts === true ? stringValue : stringValue.trim()
  }

  return {
    high: normalizeText(value?.high),
    mid: normalizeText(value?.mid),
    low: normalizeText(value?.low),
  }
}

function normalizeScoreInterpretation(raw: unknown): V2LayerScoreInterpretation {
  const value = raw as Record<string, unknown> | null | undefined
  return {
    high: asString(value?.high).trim(),
    low: asString(value?.low).trim(),
  }
}

function normalizeLayerContent(raw: Record<string, unknown>, options?: { preserveDrafts?: boolean }) {
  const legacyDefinition = asString(raw.definition).trim()
  const summaryDefinition = asString(raw.summaryDefinition).trim() || legacyDefinition
  const detailedDefinition = asString(raw.detailedDefinition).trim()
  const behaviourIndicators = normalizeBehaviorIndicators(raw.behaviourIndicators, options)
  const scoreInterpretation = normalizeScoreInterpretation(raw.scoreInterpretation)

  return {
    definition: legacyDefinition || summaryDefinition,
    summaryDefinition,
    detailedDefinition,
    behaviourIndicators,
    scoreInterpretation,
  }
}

export function createEmptyV2QuestionBank(): V2QuestionBank {
  return {
    version: 1,
    layerLabels: DEFAULT_V2_LAYER_LABELS,
    scale: {
      points: DEFAULT_V2_SCALE.points,
      labels: [...DEFAULT_V2_SCALE.labels],
      order: DEFAULT_V2_SCALE.order,
    },
    dimensions: [],
    competencies: [],
    traits: [],
    scoredItems: [],
    socialItems: [],
  }
}

export function slugifyKey(value: string, fallback = 'item') {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || fallback
}

export function makeUniqueKey(candidate: string, existing: Iterable<string>, fallbackPrefix: string) {
  const taken = new Set(Array.from(existing))
  const base = slugifyKey(candidate, fallbackPrefix)
  if (!taken.has(base)) return base

  let index = 2
  while (taken.has(`${base}_${index}`)) {
    index += 1
  }
  return `${base}_${index}`
}

export function normalizeV2QuestionBank(input: unknown, options?: { preserveDrafts?: boolean }): V2QuestionBank {
  const bank = (input ?? {}) as Record<string, unknown>
  const preserveDrafts = options?.preserveDrafts === true

  return {
    version: 1,
    layerLabels: {
      dimensions: normalizeLayerLabel(bank.layerLabels && (bank.layerLabels as Record<string, unknown>).dimensions, DEFAULT_V2_LAYER_LABELS.dimensions),
      competencies: normalizeLayerLabel(bank.layerLabels && (bank.layerLabels as Record<string, unknown>).competencies, DEFAULT_V2_LAYER_LABELS.competencies),
      traits: normalizeLayerLabel(bank.layerLabels && (bank.layerLabels as Record<string, unknown>).traits, DEFAULT_V2_LAYER_LABELS.traits),
      items: normalizeLayerLabel(bank.layerLabels && (bank.layerLabels as Record<string, unknown>).items, DEFAULT_V2_LAYER_LABELS.items),
    },
    scale: (() => {
      const rawScale = (bank.scale ?? {}) as Record<string, unknown>
      const points = normalizeScalePoints(rawScale.points)
      return {
        points,
        labels: normalizeScaleLabels(rawScale.labels, points),
        order: normalizeScaleOrder(rawScale.order),
      }
    })(),
    dimensions: normalizeRows(bank.dimensions, (row) => {
      const content = normalizeLayerContent(row, { preserveDrafts })
      return {
        id: asString(row.id).trim() || crypto.randomUUID(),
        key: slugifyKey(asString(row.key), 'dimension'),
        internalName: asString(row.internalName).trim(),
        externalName: asString(row.externalName).trim(),
        ...content,
      }
    }).filter((item) => item.key),
    competencies: normalizeRows(bank.competencies, (row) => {
      const content = normalizeLayerContent(row, { preserveDrafts })
      return {
        id: asString(row.id).trim() || crypto.randomUUID(),
        key: slugifyKey(asString(row.key), 'competency'),
        internalName: asString(row.internalName).trim(),
        externalName: asString(row.externalName).trim(),
        ...content,
        dimensionKeys: asStringArray(row.dimensionKeys).map((value) => slugifyKey(value, 'dimension')),
      }
    }).filter((item) => item.key),
    traits: normalizeRows(bank.traits, (row) => {
      const content = normalizeLayerContent(row, { preserveDrafts })
      return {
        id: asString(row.id).trim() || crypto.randomUUID(),
        key: slugifyKey(asString(row.key), 'trait'),
        internalName: asString(row.internalName).trim(),
        externalName: asString(row.externalName).trim(),
        ...content,
        competencyKeys: asStringArray(row.competencyKeys).map((value) => slugifyKey(value, 'competency')),
      }
    }).filter((item) => item.key),
    scoredItems: normalizeRows(bank.scoredItems, (row) => ({
      id: asString(row.id).trim() || crypto.randomUUID(),
      key: slugifyKey(asString(row.key), 'item'),
      text: asString(row.text).trim(),
      traitKey: slugifyKey(asString(row.traitKey), 'trait'),
      isReverseCoded: asBoolean(row.isReverseCoded),
      weight: normalizeWeight(row.weight),
    })).filter((item) => item.key && item.traitKey && (preserveDrafts || Boolean(item.text))),
    socialItems: normalizeRows(bank.socialItems, (row) => ({
      id: asString(row.id).trim() || crypto.randomUUID(),
      key: slugifyKey(asString(row.key), 'social_item'),
      text: asString(row.text).trim(),
      isReverseCoded: asBoolean(row.isReverseCoded),
    })).filter((item) => item.key && (preserveDrafts || Boolean(item.text))),
  }
}

function escapeCsvCell(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function splitPipe(value: string) {
  return value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
}

function joinPipe(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean).join('|')
}

function parseCsvLine(line: string) {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current)
  return fields
}

const CSV_HEADER = [
  'item_type',
  'item_key',
  'item_text',
  'reverse_coded',
  'item_weight',
  'trait_key',
  'trait_internal_name',
  'trait_external_name',
  'trait_definition',
  'trait_summary_definition',
  'trait_detailed_definition',
  'trait_behavior_high',
  'trait_behavior_mid',
  'trait_behavior_low',
  'trait_interpretation_high',
  'trait_interpretation_low',
  'competency_keys',
  'competency_internal_names',
  'competency_external_names',
  'competency_definitions',
  'competency_summary_definitions',
  'competency_detailed_definitions',
  'competency_behavior_high',
  'competency_behavior_mid',
  'competency_behavior_low',
  'competency_interpretation_high',
  'competency_interpretation_low',
  'dimension_keys',
  'dimension_internal_names',
  'dimension_external_names',
  'dimension_definitions',
  'dimension_summary_definitions',
  'dimension_detailed_definitions',
  'dimension_behavior_high',
  'dimension_behavior_mid',
  'dimension_behavior_low',
  'dimension_interpretation_high',
  'dimension_interpretation_low',
] as const

export function buildV2QuestionBankCsvTemplate() {
  const sample = [
    'scored',
    'judgement_1',
    'I test AI-generated work before I use it.',
    'false',
    '1',
    'judgement',
    'Judgement',
    'Judgement',
    'Quality of decision-making under uncertainty',
    'Quality of decision-making under uncertainty',
    'The ability to evaluate options, verify output, and make sound calls when AI introduces ambiguity.',
    'Tests output before relying on it|Checks assumptions in context',
    'Shows some verification discipline|Balances speed and care inconsistently',
    'Relies too quickly on first-pass output|Misses errors or trade-offs',
    'High scores indicate strong judgement and verification discipline.',
    'Low scores indicate inconsistent judgement and weaker verification habits.',
    'decision_quality',
    'Decision Quality',
    'Decision Quality',
    'Evaluates the quality of choices and trade-offs',
    'Evaluates the quality of choices and trade-offs',
    'How effectively a person frames choices, interprets evidence, and manages trade-offs in practice.',
    'Frames options clearly|Assesses trade-offs explicitly',
    'Makes reasonable calls with some coaching',
    'Avoids trade-offs or defaults to habit',
    'High scores indicate stronger decision framing and trade-off quality.',
    'Low scores indicate weaker evaluation and less deliberate decision-making.',
    'thinking',
    'Thinking',
    'Thinking',
    'How this assessment organises thinking-related capabilities',
    'How this assessment organises thinking-related capabilities',
    'The broad thinking domain covering judgement, sense-making, and decision quality under uncertainty.',
    'Applies structured reasoning|Brings clarity to ambiguity',
    'Shows workable reasoning with uneven consistency',
    'Struggles to structure ambiguity into decisions',
    'High scores indicate stronger thinking capability in applied settings.',
    'Low scores indicate more limited clarity and reasoning discipline.',
  ]

  return `${CSV_HEADER.join(',')}\n${sample.map(escapeCsvCell).join(',')}`
}

export function serializeV2QuestionBankToCsv(bank: V2QuestionBank) {
  const competencyMap = new Map(bank.competencies.map((item) => [item.key, item]))
  const dimensionMap = new Map(bank.dimensions.map((item) => [item.key, item]))
  const traitMap = new Map(bank.traits.map((item) => [item.key, item]))

  const rows: string[] = [CSV_HEADER.join(',')]

  for (const item of bank.scoredItems) {
    const trait = traitMap.get(item.traitKey)
    const competencies = (trait?.competencyKeys ?? [])
      .map((key) => competencyMap.get(key))
      .filter((entry): entry is V2Competency => Boolean(entry))
    const dimensionKeys = Array.from(new Set(competencies.flatMap((entry) => entry.dimensionKeys)))
    const dimensions = dimensionKeys
      .map((key) => dimensionMap.get(key))
      .filter((entry): entry is V2Dimension => Boolean(entry))

    rows.push([
      'scored',
      item.key,
      item.text,
      item.isReverseCoded ? 'true' : 'false',
      String(item.weight),
      trait?.key ?? item.traitKey,
      trait?.internalName ?? '',
      trait?.externalName ?? '',
      trait?.definition ?? '',
      trait?.summaryDefinition ?? '',
      trait?.detailedDefinition ?? '',
      trait?.behaviourIndicators.high ?? '',
      trait?.behaviourIndicators.mid ?? '',
      trait?.behaviourIndicators.low ?? '',
      trait?.scoreInterpretation.high ?? '',
      trait?.scoreInterpretation.low ?? '',
      joinPipe(competencies.map((entry) => entry.key)),
      joinPipe(competencies.map((entry) => entry.internalName)),
      joinPipe(competencies.map((entry) => entry.externalName)),
      joinPipe(competencies.map((entry) => entry.definition)),
      joinPipe(competencies.map((entry) => entry.summaryDefinition)),
      joinPipe(competencies.map((entry) => entry.detailedDefinition)),
      joinPipe(competencies.map((entry) => entry.behaviourIndicators.high)),
      joinPipe(competencies.map((entry) => entry.behaviourIndicators.mid)),
      joinPipe(competencies.map((entry) => entry.behaviourIndicators.low)),
      joinPipe(competencies.map((entry) => entry.scoreInterpretation.high)),
      joinPipe(competencies.map((entry) => entry.scoreInterpretation.low)),
      joinPipe(dimensions.map((entry) => entry.key)),
      joinPipe(dimensions.map((entry) => entry.internalName)),
      joinPipe(dimensions.map((entry) => entry.externalName)),
      joinPipe(dimensions.map((entry) => entry.definition)),
      joinPipe(dimensions.map((entry) => entry.summaryDefinition)),
      joinPipe(dimensions.map((entry) => entry.detailedDefinition)),
      joinPipe(dimensions.map((entry) => entry.behaviourIndicators.high)),
      joinPipe(dimensions.map((entry) => entry.behaviourIndicators.mid)),
      joinPipe(dimensions.map((entry) => entry.behaviourIndicators.low)),
      joinPipe(dimensions.map((entry) => entry.scoreInterpretation.high)),
      joinPipe(dimensions.map((entry) => entry.scoreInterpretation.low)),
    ].map(escapeCsvCell).join(','))
  }

  for (const item of bank.socialItems) {
    rows.push([
      'social', item.key, item.text, item.isReverseCoded ? 'true' : 'false', '1',
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    ].map(escapeCsvCell).join(','))
  }

  return rows.join('\n')
}

export function parseV2QuestionBankCsv(text: string): V2QuestionBankCsvRow[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []

  const rows: V2QuestionBankCsvRow[] = []

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index]?.trim()
    if (!line) continue

    const fields = parseCsvLine(line)
    const itemType = fields[0]
    const itemKey = fields[1]
    const itemText = fields[2]
    const reverseCoded = fields[3]

    if (!itemType || !itemText) continue

    const hasNewColumns = fields.length >= CSV_HEADER.length
    const hasExplicitWeightColumn = fields.length >= 17

    rows.push({
      item_type: itemType === 'social' ? 'social' : 'scored',
      item_key: asString(itemKey).trim(),
      item_text: asString(itemText).trim(),
      reverse_coded: asString(reverseCoded).trim().toLowerCase() === 'true',
      item_weight: normalizeWeight(hasExplicitWeightColumn ? fields[4] : '1'),
      trait_key: asString(fields[5] ?? fields[4]).trim(),
      trait_internal_name: asString(fields[6] ?? fields[5]).trim(),
      trait_external_name: asString(fields[7] ?? fields[6]).trim(),
      trait_definition: asString(fields[8] ?? fields[7]).trim(),
      trait_summary_definition: asString(hasNewColumns ? fields[9] : fields[8] ?? fields[7]).trim(),
      trait_detailed_definition: asString(hasNewColumns ? fields[10] : '').trim(),
      trait_behavior_high: asString(hasNewColumns ? fields[11] : '').trim(),
      trait_behavior_mid: asString(hasNewColumns ? fields[12] : '').trim(),
      trait_behavior_low: asString(hasNewColumns ? fields[13] : '').trim(),
      trait_interpretation_high: asString(hasNewColumns ? fields[14] : '').trim(),
      trait_interpretation_low: asString(hasNewColumns ? fields[15] : '').trim(),
      competency_keys: splitPipe(asString(hasNewColumns ? fields[16] : fields[8 + 1])),
      competency_internal_names: splitPipe(asString(hasNewColumns ? fields[17] : fields[9 + 1])),
      competency_external_names: splitPipe(asString(hasNewColumns ? fields[18] : fields[10 + 1])),
      competency_definitions: splitPipe(asString(hasNewColumns ? fields[19] : fields[11 + 1])),
      competency_summary_definitions: splitPipe(asString(hasNewColumns ? fields[20] : fields[11 + 1])),
      competency_detailed_definitions: splitPipe(asString(hasNewColumns ? fields[21] : '')),
      competency_behavior_high: splitPipe(asString(hasNewColumns ? fields[22] : '')),
      competency_behavior_mid: splitPipe(asString(hasNewColumns ? fields[23] : '')),
      competency_behavior_low: splitPipe(asString(hasNewColumns ? fields[24] : '')),
      competency_interpretation_high: splitPipe(asString(hasNewColumns ? fields[25] : '')),
      competency_interpretation_low: splitPipe(asString(hasNewColumns ? fields[26] : '')),
      dimension_keys: splitPipe(asString(hasNewColumns ? fields[27] : fields[12 + 1])),
      dimension_internal_names: splitPipe(asString(hasNewColumns ? fields[28] : fields[13 + 1])),
      dimension_external_names: splitPipe(asString(hasNewColumns ? fields[29] : fields[14 + 1])),
      dimension_definitions: splitPipe(asString(hasNewColumns ? fields[30] : fields[15 + 1])),
      dimension_summary_definitions: splitPipe(asString(hasNewColumns ? fields[31] : fields[15 + 1])),
      dimension_detailed_definitions: splitPipe(asString(hasNewColumns ? fields[32] : '')),
      dimension_behavior_high: splitPipe(asString(hasNewColumns ? fields[33] : '')),
      dimension_behavior_mid: splitPipe(asString(hasNewColumns ? fields[34] : '')),
      dimension_behavior_low: splitPipe(asString(hasNewColumns ? fields[35] : '')),
      dimension_interpretation_high: splitPipe(asString(hasNewColumns ? fields[36] : '')),
      dimension_interpretation_low: splitPipe(asString(hasNewColumns ? fields[37] : '')),
    })
  }

  return rows
}

function nameAt(values: string[], index: number, fallback: string) {
  return values[index] ?? fallback
}

function contentAt(input: {
  definitions: string[]
  summaryDefinitions: string[]
  detailedDefinitions: string[]
  behaviorHigh: string[]
  behaviorMid: string[]
  behaviorLow: string[]
  interpretationHigh: string[]
  interpretationLow: string[]
  index: number
}) {
  const summaryDefinition = nameAt(input.summaryDefinitions, input.index, nameAt(input.definitions, input.index, ''))
  return {
    definition: nameAt(input.definitions, input.index, summaryDefinition),
    summaryDefinition,
    detailedDefinition: nameAt(input.detailedDefinitions, input.index, ''),
    behaviourIndicators: {
      high: nameAt(input.behaviorHigh, input.index, ''),
      mid: nameAt(input.behaviorMid, input.index, ''),
      low: nameAt(input.behaviorLow, input.index, ''),
    },
    scoreInterpretation: {
      high: nameAt(input.interpretationHigh, input.index, ''),
      low: nameAt(input.interpretationLow, input.index, ''),
    },
  }
}

export function buildV2QuestionBankFromCsvRows(rows: V2QuestionBankCsvRow[]): V2QuestionBank {
  const bank = createEmptyV2QuestionBank()
  const dimensions = new Map<string, V2Dimension>()
  const competencies = new Map<string, V2Competency>()
  const traits = new Map<string, V2Trait>()
  const scoredItems: V2ScoredItem[] = []
  const socialItems: V2SocialDesirabilityItem[] = []
  const usedItemKeys = new Set<string>()

  for (const row of rows) {
    const dimensionKeys = row.dimension_keys.map((value) => slugifyKey(value, 'dimension'))
    const competencyKeys = row.competency_keys.map((value) => slugifyKey(value, 'competency'))

    dimensionKeys.forEach((key, index) => {
      if (!dimensions.has(key)) {
        dimensions.set(key, {
          id: crypto.randomUUID(),
          key,
          internalName: nameAt(row.dimension_internal_names, index, key),
          externalName: nameAt(row.dimension_external_names, index, nameAt(row.dimension_internal_names, index, key)),
          ...contentAt({
            definitions: row.dimension_definitions,
            summaryDefinitions: row.dimension_summary_definitions,
            detailedDefinitions: row.dimension_detailed_definitions,
            behaviorHigh: row.dimension_behavior_high,
            behaviorMid: row.dimension_behavior_mid,
            behaviorLow: row.dimension_behavior_low,
            interpretationHigh: row.dimension_interpretation_high,
            interpretationLow: row.dimension_interpretation_low,
            index,
          }),
        })
      }
    })

    competencyKeys.forEach((key, index) => {
      if (!competencies.has(key)) {
        competencies.set(key, {
          id: crypto.randomUUID(),
          key,
          internalName: nameAt(row.competency_internal_names, index, key),
          externalName: nameAt(row.competency_external_names, index, nameAt(row.competency_internal_names, index, key)),
          ...contentAt({
            definitions: row.competency_definitions,
            summaryDefinitions: row.competency_summary_definitions,
            detailedDefinitions: row.competency_detailed_definitions,
            behaviorHigh: row.competency_behavior_high,
            behaviorMid: row.competency_behavior_mid,
            behaviorLow: row.competency_behavior_low,
            interpretationHigh: row.competency_interpretation_high,
            interpretationLow: row.competency_interpretation_low,
            index,
          }),
          dimensionKeys,
        })
      } else {
        const existing = competencies.get(key)!
        existing.dimensionKeys = Array.from(new Set([...existing.dimensionKeys, ...dimensionKeys]))
      }
    })

    if (row.item_type === 'social') {
      const socialKey = makeUniqueKey(row.item_key || row.item_text, usedItemKeys, 'social_item')
      usedItemKeys.add(socialKey)
      socialItems.push({
        id: crypto.randomUUID(),
        key: socialKey,
        text: row.item_text,
        isReverseCoded: row.reverse_coded,
      })
      continue
    }

    const traitKey = slugifyKey(row.trait_key || row.trait_internal_name || row.item_key || row.item_text, 'trait')
    if (!traits.has(traitKey)) {
      traits.set(traitKey, {
        id: crypto.randomUUID(),
        key: traitKey,
        internalName: row.trait_internal_name || traitKey,
        externalName: row.trait_external_name || row.trait_internal_name || traitKey,
        definition: row.trait_definition || row.trait_summary_definition,
        summaryDefinition: row.trait_summary_definition || row.trait_definition,
        detailedDefinition: row.trait_detailed_definition,
        behaviourIndicators: {
          high: row.trait_behavior_high,
          mid: row.trait_behavior_mid,
          low: row.trait_behavior_low,
        },
        scoreInterpretation: {
          high: row.trait_interpretation_high,
          low: row.trait_interpretation_low,
        },
        competencyKeys,
      })
    } else {
      const existing = traits.get(traitKey)!
      existing.competencyKeys = Array.from(new Set([...existing.competencyKeys, ...competencyKeys]))
    }

    const itemKey = makeUniqueKey(row.item_key || row.item_text, usedItemKeys, traitKey)
    usedItemKeys.add(itemKey)
    scoredItems.push({
      id: crypto.randomUUID(),
      key: itemKey,
      text: row.item_text,
      traitKey,
      isReverseCoded: row.reverse_coded,
      weight: row.item_weight,
    })
  }

  bank.dimensions = Array.from(dimensions.values())
  bank.competencies = Array.from(competencies.values())
  bank.traits = Array.from(traits.values())
  bank.scoredItems = scoredItems
  bank.socialItems = socialItems

  return bank
}
