export type V2LayerKey = 'dimensions' | 'competencies' | 'traits' | 'items'
export type V2ScalePoints = 2 | 3 | 4 | 5 | 6 | 7
export type V2ScaleOrder = 'ascending' | 'descending'

export type V2LayerLabel = {
  internalLabel: string
  externalLabel: string
}

export type V2LayerLabels = Record<V2LayerKey, V2LayerLabel>

export type V2Dimension = {
  id: string
  key: string
  internalName: string
  externalName: string
  definition: string
}

export type V2Competency = {
  id: string
  key: string
  internalName: string
  externalName: string
  definition: string
  dimensionKeys: string[]
}

export type V2Trait = {
  id: string
  key: string
  internalName: string
  externalName: string
  definition: string
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
  competency_keys: string[]
  competency_internal_names: string[]
  competency_external_names: string[]
  competency_definitions: string[]
  dimension_keys: string[]
  dimension_internal_names: string[]
  dimension_external_names: string[]
  dimension_definitions: string[]
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

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => asString(item).trim()).filter(Boolean)
    : []
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
    dimensions: normalizeRows(bank.dimensions, (row) => ({
      id: asString(row.id).trim() || crypto.randomUUID(),
      key: slugifyKey(asString(row.key), 'dimension'),
      internalName: asString(row.internalName).trim(),
      externalName: asString(row.externalName).trim(),
      definition: asString(row.definition).trim(),
    })).filter((item) => item.key),
    competencies: normalizeRows(bank.competencies, (row) => ({
      id: asString(row.id).trim() || crypto.randomUUID(),
      key: slugifyKey(asString(row.key), 'competency'),
      internalName: asString(row.internalName).trim(),
      externalName: asString(row.externalName).trim(),
      definition: asString(row.definition).trim(),
      dimensionKeys: asStringArray(row.dimensionKeys).map((value) => slugifyKey(value, 'dimension')),
    })).filter((item) => item.key),
    traits: normalizeRows(bank.traits, (row) => ({
      id: asString(row.id).trim() || crypto.randomUUID(),
      key: slugifyKey(asString(row.key), 'trait'),
      internalName: asString(row.internalName).trim(),
      externalName: asString(row.externalName).trim(),
      definition: asString(row.definition).trim(),
      competencyKeys: asStringArray(row.competencyKeys).map((value) => slugifyKey(value, 'competency')),
    })).filter((item) => item.key),
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

export function buildV2QuestionBankCsvTemplate() {
  const header = [
    'item_type',
    'item_key',
    'item_text',
    'reverse_coded',
    'item_weight',
    'trait_key',
    'trait_internal_name',
    'trait_external_name',
    'trait_definition',
    'competency_keys',
    'competency_internal_names',
    'competency_external_names',
    'competency_definitions',
    'dimension_keys',
    'dimension_internal_names',
    'dimension_external_names',
    'dimension_definitions',
  ]

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
    'decision_quality',
    'Decision Quality',
    'Decision Quality',
    'Evaluates the quality of choices and trade-offs',
    'thinking',
    'Thinking',
    'Thinking',
    'How this assessment organises thinking-related capabilities',
  ]

  return `${header.join(',')}\n${sample.map(escapeCsvCell).join(',')}`
}

export function serializeV2QuestionBankToCsv(bank: V2QuestionBank) {
  const header = [
    'item_type',
    'item_key',
    'item_text',
    'reverse_coded',
    'item_weight',
    'trait_key',
    'trait_internal_name',
    'trait_external_name',
    'trait_definition',
    'competency_keys',
    'competency_internal_names',
    'competency_external_names',
    'competency_definitions',
    'dimension_keys',
    'dimension_internal_names',
    'dimension_external_names',
    'dimension_definitions',
  ]

  const competencyMap = new Map(bank.competencies.map((item) => [item.key, item]))
  const dimensionMap = new Map(bank.dimensions.map((item) => [item.key, item]))
  const traitMap = new Map(bank.traits.map((item) => [item.key, item]))

  const rows: string[] = [header.join(',')]

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
      joinPipe(competencies.map((entry) => entry.key)),
      joinPipe(competencies.map((entry) => entry.internalName)),
      joinPipe(competencies.map((entry) => entry.externalName)),
      joinPipe(competencies.map((entry) => entry.definition)),
      joinPipe(dimensions.map((entry) => entry.key)),
      joinPipe(dimensions.map((entry) => entry.internalName)),
      joinPipe(dimensions.map((entry) => entry.externalName)),
      joinPipe(dimensions.map((entry) => entry.definition)),
    ].map(escapeCsvCell).join(','))
  }

  for (const item of bank.socialItems) {
    rows.push([
      'social',
      item.key,
      item.text,
      item.isReverseCoded ? 'true' : 'false',
      '1',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
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

    const hasExplicitWeightColumn = fields.length >= 17
    const offset = hasExplicitWeightColumn ? 1 : 0
    const itemWeight = hasExplicitWeightColumn ? fields[4] : '1'
    const traitKey = fields[4 + offset]
    const traitInternalName = fields[5 + offset]
    const traitExternalName = fields[6 + offset]
    const traitDefinition = fields[7 + offset]
    const competencyKeys = fields[8 + offset]
    const competencyInternalNames = fields[9 + offset]
    const competencyExternalNames = fields[10 + offset]
    const competencyDefinitions = fields[11 + offset]
    const dimensionKeys = fields[12 + offset]
    const dimensionInternalNames = fields[13 + offset]
    const dimensionExternalNames = fields[14 + offset]
    const dimensionDefinitions = fields[15 + offset]

    rows.push({
      item_type: itemType === 'social' ? 'social' : 'scored',
      item_key: asString(itemKey).trim(),
      item_text: asString(itemText).trim(),
      reverse_coded: asString(reverseCoded).trim().toLowerCase() === 'true',
      item_weight: normalizeWeight(itemWeight),
      trait_key: asString(traitKey).trim(),
      trait_internal_name: asString(traitInternalName).trim(),
      trait_external_name: asString(traitExternalName).trim(),
      trait_definition: asString(traitDefinition).trim(),
      competency_keys: splitPipe(asString(competencyKeys)),
      competency_internal_names: splitPipe(asString(competencyInternalNames)),
      competency_external_names: splitPipe(asString(competencyExternalNames)),
      competency_definitions: splitPipe(asString(competencyDefinitions)),
      dimension_keys: splitPipe(asString(dimensionKeys)),
      dimension_internal_names: splitPipe(asString(dimensionInternalNames)),
      dimension_external_names: splitPipe(asString(dimensionExternalNames)),
      dimension_definitions: splitPipe(asString(dimensionDefinitions)),
    })
  }

  return rows
}

function nameAt(values: string[], index: number, fallback: string) {
  return values[index] ?? fallback
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
          definition: nameAt(row.dimension_definitions, index, ''),
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
          definition: nameAt(row.competency_definitions, index, ''),
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
        definition: row.trait_definition,
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
