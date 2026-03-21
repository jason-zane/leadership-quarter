export type V2ScoreMethod = 'average' | 'sum'
export type V2ScoringLevel = 'trait' | 'competency' | 'dimension'
export type V2TransformSource = 'raw' | 'normed'
export type V2DisplayMode = 'raw' | 'rescaled'

export type TraitScoringOverride = {
  targetKey: string
  method: V2ScoreMethod
}

export type V2WeightLink = {
  parentKey: string
  childKey: string
  weight: number
}

export type V2NormGroupConfig = {
  id: string
  key: string
  name: string
  description: string
  sampleDescription: string
}

export type V2BandDefinition = {
  id: string
  label: string
  min: number
  max: number
  color: string
  meaning: string
  behaviouralIndicators: string
  strengths: string
  watchouts: string
  developmentFocus: string
  narrativeText: string
}

export type V2BandingConfig = {
  level: V2ScoringLevel
  targetKey: string
  bands: V2BandDefinition[]
}

export type V2InterpretationContent = {
  level: V2ScoringLevel
  targetKey: string
  lowMeaning: string
  midMeaning: string
  highMeaning: string
  behaviouralIndicators: string
  strengths: string
  risksWatchouts: string
  developmentFocus: string
  narrativeText: string
}

export type V2AIInterpretationConfig = {
  level: V2ScoringLevel
  targetKey: string
  summary: string
  guidance: string
  contextNotes: string
  promptHints: string
}

export type V2DerivedOutcome = {
  id: string
  key: string
  label: string
  shortDescription: string
  reportSummary: string
  fullNarrative: string
  recommendations: string[]
  sortOrder: number
}

export type V2DerivedOutcomeMapping = {
  id: string
  combination: Record<string, string>
  outcomeKey: string
  rationale: string
}

export type V2DerivedOutcomeSet = {
  id: string
  key: string
  name: string
  description: string
  level: V2ScoringLevel
  targetKeys: string[]
  outcomes: V2DerivedOutcome[]
  mappings: V2DerivedOutcomeMapping[]
}

export type V2DerivedOutcomeCoverageIssue = {
  type:
    | 'missing_targets'
    | 'too_many_targets'
    | 'unknown_target'
    | 'missing_banding'
    | 'unknown_band'
    | 'unknown_outcome'
    | 'duplicate_mapping'
    | 'ambiguous_match'
    | 'unresolved_combination'
  message: string
  targetKey?: string
  mappingId?: string
  combination?: Record<string, string>
}

export type V2DerivedOutcomeCoverage = {
  ok: boolean
  totalCombinations: number
  resolvedCombinations: number
  issues: V2DerivedOutcomeCoverageIssue[]
}

export type V2DerivedOutcomeResolution =
  | {
      status: 'matched'
      outcome: V2DerivedOutcome
      mapping: V2DerivedOutcomeMapping
    }
  | {
      status: 'ambiguous'
      candidates: V2DerivedOutcomeMapping[]
    }
  | {
      status: 'unmatched'
    }

// Archetype Engine Types
export type V2ArchetypeCondition =
  | { type: 'band_in'; targetKey: string; bandLabels: string[] }
  | { type: 'band_not_in'; targetKey: string; bandLabels: string[] }
  | { type: 'count_gte'; bandLabels: string[]; count: number }
  | { type: 'count_lte'; bandLabels: string[]; count: number }

export type V2ArchetypeRule = {
  id: string
  priority: number
  profileKey: string
  conditions: V2ArchetypeCondition[]
  rationale: string
}

export type V2ArchetypeProfile = {
  id: string
  key: string
  label: string
  tagline: string
  shortDescription: string
  reportSummary: string
  fullNarrative: string
  strengthKeys: string[]
  constraintKeys: string[]
  recommendations: string[]
  isDefault: boolean
}

export type V2ArchetypeSet = {
  id: string
  key: string
  name: string
  description: string
  level: V2ScoringLevel
  targetKeys: string[]
  profiles: V2ArchetypeProfile[]
  rules: V2ArchetypeRule[]
}

export type V2ArchetypeResolution =
  | { status: 'matched'; profile: V2ArchetypeProfile; rule: V2ArchetypeRule; matchedConditions: number }
  | { status: 'default'; profile: V2ArchetypeProfile }
  | { status: 'unmatched' }

export type V2ScoringConfig = {
  version: 1
  calculation: {
    traitDefaultMethod: V2ScoreMethod
    traitOverrides: TraitScoringOverride[]
    useItemWeights: boolean
  }
  rollups: {
    competency: {
      method: V2ScoreMethod
      weights: V2WeightLink[]
    }
    dimension: {
      method: V2ScoreMethod
      weights: V2WeightLink[]
    }
  }
  transforms: {
    displayMode: V2DisplayMode
    displayRangeMin: number
    displayRangeMax: number
    defaultNormGroupId: string | null
    normGroups: V2NormGroupConfig[]
    sten: {
      enabled: boolean
      source: V2TransformSource
      min: number
      max: number
    }
  }
  bandings: V2BandingConfig[]
  interpretations: V2InterpretationContent[]
  aiContext: V2AIInterpretationConfig[]
  derivedOutcomes: V2DerivedOutcomeSet[]
  archetypes: V2ArchetypeSet[]
}

export const MAX_V2_DERIVED_OUTCOME_TARGETS = 5

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function normalizeTargetKey(value: unknown) {
  return asString(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function asBoolean(value: unknown) {
  return value === true
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeWeight(value: unknown) {
  return Math.max(0, Number(asNumber(value, 1).toFixed(3)))
}

function normalizeMethod(value: unknown): V2ScoreMethod {
  return value === 'sum' ? 'sum' : 'average'
}

function normalizeLevel(value: unknown): V2ScoringLevel {
  if (value === 'competency' || value === 'dimension') return value
  return 'trait'
}

function normalizeRows<T>(items: unknown, mapper: (row: Record<string, unknown>) => T | null) {
  if (!Array.isArray(items)) return [] as T[]

  return items
    .map((item) => item as Record<string, unknown>)
    .map(mapper)
    .filter((item): item is T => item !== null)
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[]
  return value.map((item) => asString(item).trim()).filter(Boolean)
}

function normalizeStringList(value: unknown) {
  return asStringArray(value)
}

function normalizeWeightLinks(value: unknown): V2WeightLink[] {
  return normalizeRows(value, (row) => {
    const parentKey = normalizeTargetKey(row.parentKey)
    const childKey = normalizeTargetKey(row.childKey)
    if (!parentKey || !childKey) return null
    return {
      parentKey,
      childKey,
      weight: normalizeWeight(row.weight),
    }
  })
}

function normalizeBands(value: unknown): V2BandDefinition[] {
  return normalizeRows(value, (row) => ({
    id: asString(row.id).trim() || crypto.randomUUID(),
    label: asString(row.label).trim(),
    min: asNumber(row.min, 0),
    max: asNumber(row.max, 0),
    color: asString(row.color).trim() || '#D0D8E8',
    meaning: asString(row.meaning).trim(),
    behaviouralIndicators: asString(row.behaviouralIndicators).trim(),
    strengths: asString(row.strengths).trim(),
    watchouts: asString(row.watchouts).trim() || asString(row.risksWatchouts).trim(),
    developmentFocus: asString(row.developmentFocus).trim(),
    narrativeText: asString(row.narrativeText).trim(),
  }))
}

function ensureInterpretationContent(
  value: Partial<V2InterpretationContent> & Pick<V2InterpretationContent, 'level' | 'targetKey'>
): V2InterpretationContent {
  return {
    level: value.level,
    targetKey: value.targetKey,
    lowMeaning: value.lowMeaning ?? '',
    midMeaning: value.midMeaning ?? '',
    highMeaning: value.highMeaning ?? '',
    behaviouralIndicators: value.behaviouralIndicators ?? '',
    strengths: value.strengths ?? '',
    risksWatchouts: value.risksWatchouts ?? '',
    developmentFocus: value.developmentFocus ?? '',
    narrativeText: value.narrativeText ?? '',
  }
}

function ensureAIContext(
  value: Partial<V2AIInterpretationConfig> & Pick<V2AIInterpretationConfig, 'level' | 'targetKey'>
): V2AIInterpretationConfig {
  return {
    level: value.level,
    targetKey: value.targetKey,
    summary: value.summary ?? '',
    guidance: value.guidance ?? '',
    contextNotes: value.contextNotes ?? '',
    promptHints: value.promptHints ?? '',
  }
}

export function createEmptyV2ScoringConfig(): V2ScoringConfig {
  return {
    version: 1,
    calculation: {
      traitDefaultMethod: 'average',
      traitOverrides: [],
      useItemWeights: true,
    },
    rollups: {
      competency: {
        method: 'average',
        weights: [],
      },
      dimension: {
        method: 'average',
        weights: [],
      },
    },
    transforms: {
      displayMode: 'raw',
      displayRangeMin: 1,
      displayRangeMax: 5,
      defaultNormGroupId: null,
      normGroups: [],
      sten: {
        enabled: false,
        source: 'raw',
        min: 1,
        max: 10,
      },
    },
    bandings: [],
    interpretations: [],
    aiContext: [],
    derivedOutcomes: [],
    archetypes: [],
  }
}

export function normalizeV2ScoringConfig(input: unknown): V2ScoringConfig {
  const config = (input ?? {}) as Record<string, unknown>
  const base = createEmptyV2ScoringConfig()
  const calculation = (config.calculation ?? {}) as Record<string, unknown>
  const rollups = (config.rollups ?? {}) as Record<string, unknown>
  const competency = (rollups.competency ?? {}) as Record<string, unknown>
  const dimension = (rollups.dimension ?? {}) as Record<string, unknown>
  const transforms = (config.transforms ?? {}) as Record<string, unknown>
  const sten = (transforms.sten ?? {}) as Record<string, unknown>

  return {
    version: 1,
    calculation: {
      traitDefaultMethod: normalizeMethod(calculation.traitDefaultMethod),
      traitOverrides: normalizeRows(calculation.traitOverrides, (row) => {
        const targetKey = normalizeTargetKey(row.targetKey)
        if (!targetKey) return null
        return {
          targetKey,
          method: normalizeMethod(row.method),
        }
      }),
      useItemWeights: calculation.useItemWeights === undefined ? base.calculation.useItemWeights : asBoolean(calculation.useItemWeights),
    },
    rollups: {
      competency: {
        method: normalizeMethod(competency.method),
        weights: normalizeWeightLinks(competency.weights),
      },
      dimension: {
        method: normalizeMethod(dimension.method),
        weights: normalizeWeightLinks(dimension.weights),
      },
    },
    transforms: {
      displayMode: transforms.displayMode === 'rescaled' ? 'rescaled' : base.transforms.displayMode,
      displayRangeMin: asNumber(transforms.displayRangeMin, base.transforms.displayRangeMin),
      displayRangeMax: asNumber(transforms.displayRangeMax, base.transforms.displayRangeMax),
      defaultNormGroupId: asString(transforms.defaultNormGroupId).trim() || null,
      normGroups: normalizeRows(transforms.normGroups, (row) => ({
        id: asString(row.id).trim() || crypto.randomUUID(),
        key: asString(row.key).trim() || crypto.randomUUID().replace(/-/g, '_'),
        name: asString(row.name).trim(),
        description: asString(row.description).trim(),
        sampleDescription: asString(row.sampleDescription).trim(),
      })),
      sten: {
        enabled: asBoolean(sten.enabled),
        source: sten.source === 'normed' ? 'normed' : base.transforms.sten.source,
        min: asNumber(sten.min, base.transforms.sten.min),
        max: asNumber(sten.max, base.transforms.sten.max),
      },
    },
    bandings: normalizeRows(config.bandings, (row) => {
      const targetKey = normalizeTargetKey(row.targetKey)
      if (!targetKey) return null
      return {
        level: normalizeLevel(row.level),
        targetKey,
        bands: normalizeBands(row.bands),
      }
    }),
    interpretations: normalizeRows(config.interpretations, (row) => {
      const targetKey = normalizeTargetKey(row.targetKey)
      if (!targetKey) return null
      return ensureInterpretationContent({
        level: normalizeLevel(row.level),
        targetKey,
        lowMeaning: asString(row.lowMeaning).trim(),
        midMeaning: asString(row.midMeaning).trim(),
        highMeaning: asString(row.highMeaning).trim(),
        behaviouralIndicators: asString(row.behaviouralIndicators).trim(),
        strengths: asString(row.strengths).trim(),
        risksWatchouts: asString(row.risksWatchouts).trim(),
        developmentFocus: asString(row.developmentFocus).trim(),
        narrativeText: asString(row.narrativeText).trim(),
      })
    }),
    aiContext: normalizeRows(config.aiContext, (row) => {
      const targetKey = normalizeTargetKey(row.targetKey)
      if (!targetKey) return null
      return ensureAIContext({
        level: normalizeLevel(row.level),
        targetKey,
        summary: asString(row.summary).trim(),
        guidance: asString(row.guidance).trim(),
        contextNotes: asString(row.contextNotes).trim(),
        promptHints: asString(row.promptHints).trim(),
      })
    }),
    derivedOutcomes: normalizeRows(config.derivedOutcomes, (row) => {
      const targetKeys = asStringArray(row.targetKeys).map((value) => normalizeTargetKey(value)).filter(Boolean)
      return {
        id: asString(row.id).trim() || crypto.randomUUID(),
        key: asString(row.key).trim() || crypto.randomUUID().replace(/-/g, '_'),
        name: asString(row.name).trim() || 'Derived outcome set',
        description: asString(row.description).trim(),
        level: normalizeLevel(row.level),
        targetKeys,
        outcomes: normalizeRows(row.outcomes, (outcomeRow) => ({
          id: asString(outcomeRow.id).trim() || crypto.randomUUID(),
          key: asString(outcomeRow.key).trim() || crypto.randomUUID().replace(/-/g, '_'),
          label: asString(outcomeRow.label).trim(),
          shortDescription: asString(outcomeRow.shortDescription).trim(),
          reportSummary: asString(outcomeRow.reportSummary).trim(),
          fullNarrative: asString(outcomeRow.fullNarrative).trim(),
          recommendations: normalizeStringList(outcomeRow.recommendations),
          sortOrder: Math.max(0, Math.floor(asNumber(outcomeRow.sortOrder, 0))),
        })),
        mappings: normalizeRows(row.mappings, (mappingRow) => {
          const combination = typeof mappingRow.combination === 'object' && mappingRow.combination
            ? Object.fromEntries(
                Object.entries(mappingRow.combination as Record<string, unknown>)
                  .map(([key, value]) => [normalizeTargetKey(key), asString(value).trim()])
                  .filter(([key, value]) => Boolean(key) && Boolean(value))
              )
            : {}
          return {
            id: asString(mappingRow.id).trim() || crypto.randomUUID(),
            combination,
            outcomeKey: asString(mappingRow.outcomeKey).trim(),
            rationale: asString(mappingRow.rationale).trim(),
          }
        }),
      }
    }),
    archetypes: normalizeRows(config.archetypes, (row) => {
      const targetKeys = asStringArray(row.targetKeys).map((value) => normalizeTargetKey(value)).filter(Boolean)
      return {
        id: asString(row.id).trim() || crypto.randomUUID(),
        key: asString(row.key).trim() || crypto.randomUUID().replace(/-/g, '_'),
        name: asString(row.name).trim() || 'Archetype set',
        description: asString(row.description).trim(),
        level: normalizeLevel(row.level),
        targetKeys,
        profiles: normalizeRows(row.profiles, (profileRow) => ({
          id: asString(profileRow.id).trim() || crypto.randomUUID(),
          key: asString(profileRow.key).trim() || crypto.randomUUID().replace(/-/g, '_'),
          label: asString(profileRow.label).trim(),
          tagline: asString(profileRow.tagline).trim(),
          shortDescription: asString(profileRow.shortDescription).trim(),
          reportSummary: asString(profileRow.reportSummary).trim(),
          fullNarrative: asString(profileRow.fullNarrative).trim(),
          strengthKeys: asStringArray(profileRow.strengthKeys).map((v) => normalizeTargetKey(v)).filter(Boolean),
          constraintKeys: asStringArray(profileRow.constraintKeys).map((v) => normalizeTargetKey(v)).filter(Boolean),
          recommendations: normalizeStringList(profileRow.recommendations),
          isDefault: asBoolean(profileRow.isDefault),
        })),
        rules: normalizeRows(row.rules, (ruleRow) => ({
          id: asString(ruleRow.id).trim() || crypto.randomUUID(),
          priority: Math.max(0, Math.floor(asNumber(ruleRow.priority, 0))),
          profileKey: normalizeTargetKey(ruleRow.profileKey),
          conditions: normalizeRows(ruleRow.conditions, (condRow) => {
            const condType = asString(condRow.type).trim().toLowerCase()
            if (condType === 'band_in') {
              return {
                type: 'band_in' as const,
                targetKey: normalizeTargetKey(condRow.targetKey),
                bandLabels: asStringArray(condRow.bandLabels),
              }
            }
            if (condType === 'band_not_in') {
              return {
                type: 'band_not_in' as const,
                targetKey: normalizeTargetKey(condRow.targetKey),
                bandLabels: asStringArray(condRow.bandLabels),
              }
            }
            if (condType === 'count_gte') {
              return {
                type: 'count_gte' as const,
                bandLabels: asStringArray(condRow.bandLabels),
                count: Math.max(0, Math.floor(asNumber(condRow.count, 1))),
              }
            }
            if (condType === 'count_lte') {
              return {
                type: 'count_lte' as const,
                bandLabels: asStringArray(condRow.bandLabels),
                count: Math.max(0, Math.floor(asNumber(condRow.count, 1))),
              }
            }
            return null
          }),
          rationale: asString(ruleRow.rationale).trim(),
        })),
      }
    }),
  }
}

export function getTraitScoringMethod(config: V2ScoringConfig, traitKey: string) {
  return config.calculation.traitOverrides.find((item) => item.targetKey === traitKey)?.method
    ?? config.calculation.traitDefaultMethod
}

export function setTraitScoringMethod(config: V2ScoringConfig, traitKey: string, method: V2ScoreMethod | 'default') {
  const traitOverrides = config.calculation.traitOverrides.filter((item) => item.targetKey !== traitKey)
  if (method === 'default') {
    return normalizeV2ScoringConfig({
      ...config,
      calculation: {
        ...config.calculation,
        traitOverrides,
      },
    })
  }

  return normalizeV2ScoringConfig({
    ...config,
    calculation: {
      ...config.calculation,
      traitOverrides: [...traitOverrides, { targetKey: traitKey, method }],
    },
  })
}

export function getRollupWeight(
  weights: V2WeightLink[],
  parentKey: string,
  childKey: string
) {
  return weights.find((item) => item.parentKey === parentKey && item.childKey === childKey)?.weight ?? 1
}

export function setRollupWeight(
  weights: V2WeightLink[],
  parentKey: string,
  childKey: string,
  weight: number
) {
  const next = weights.filter((item) => !(item.parentKey === parentKey && item.childKey === childKey))
  return [...next, { parentKey, childKey, weight: normalizeWeight(weight) }]
}

export function getBandingConfig(
  config: V2ScoringConfig,
  level: V2ScoringLevel,
  targetKey: string
) {
  return config.bandings.find((item) => item.level === level && item.targetKey === targetKey) ?? {
    level,
    targetKey,
    bands: [],
  }
}

export function upsertBandingConfig(config: V2ScoringConfig, value: V2BandingConfig) {
  const bandings = config.bandings.filter((item) => !(item.level === value.level && item.targetKey === value.targetKey))
  return normalizeV2ScoringConfig({
    ...config,
    bandings: [...bandings, value],
  })
}

export function getInterpretationContent(
  config: V2ScoringConfig,
  level: V2ScoringLevel,
  targetKey: string
) {
  return config.interpretations.find((item) => item.level === level && item.targetKey === targetKey)
    ?? ensureInterpretationContent({ level, targetKey })
}

export function upsertInterpretationContent(config: V2ScoringConfig, value: V2InterpretationContent) {
  const interpretations = config.interpretations.filter((item) => !(item.level === value.level && item.targetKey === value.targetKey))
  return normalizeV2ScoringConfig({
    ...config,
    interpretations: [...interpretations, value],
  })
}

export function getAIContext(config: V2ScoringConfig, level: V2ScoringLevel, targetKey: string) {
  return config.aiContext.find((item) => item.level === level && item.targetKey === targetKey)
    ?? ensureAIContext({ level, targetKey })
}

export function upsertAIContext(config: V2ScoringConfig, value: V2AIInterpretationConfig) {
  const aiContext = config.aiContext.filter((item) => !(item.level === value.level && item.targetKey === value.targetKey))
  return normalizeV2ScoringConfig({
    ...config,
    aiContext: [...aiContext, value],
  })
}

export function getDerivedOutcomeSet(config: V2ScoringConfig, key: string) {
  return config.derivedOutcomes.find((item) => item.key === key) ?? null
}

export function upsertDerivedOutcomeSet(config: V2ScoringConfig, value: V2DerivedOutcomeSet) {
  const derivedOutcomes = config.derivedOutcomes.filter((item) => item.key !== value.key)
  return normalizeV2ScoringConfig({
    ...config,
    derivedOutcomes: [...derivedOutcomes, value],
  })
}

export function deleteDerivedOutcomeSet(config: V2ScoringConfig, key: string) {
  return normalizeV2ScoringConfig({
    ...config,
    derivedOutcomes: config.derivedOutcomes.filter((item) => item.key !== key),
  })
}

export function getBandLabelMap(config: V2ScoringConfig, level: V2ScoringLevel, targetKey: string) {
  return new Map(getBandingConfig(config, level, targetKey).bands.map((band) => [band.id, band]))
}

export function buildExactDerivedOutcomeCombinations(
  config: V2ScoringConfig,
  outcomeSet: V2DerivedOutcomeSet
): Array<Record<string, string>> {
  if (outcomeSet.targetKeys.length === 0) return []

  let combinations: Array<Record<string, string>> = [{}]
  for (const targetKey of outcomeSet.targetKeys) {
    const bands = getBandingConfig(config, outcomeSet.level, targetKey).bands
    if (bands.length === 0) return []

    const next: Array<Record<string, string>> = []
    for (const combination of combinations) {
      for (const band of bands) {
        next.push({
          ...combination,
          [targetKey]: band.id,
        })
      }
    }
    combinations = next
  }

  return combinations
}

function mappingMatchesCombination(mapping: V2DerivedOutcomeMapping, combination: Record<string, string>, targetKeys: string[]) {
  return targetKeys.every((targetKey) => {
    const expected = mapping.combination[targetKey]
    if (!expected || expected === '*') return true
    return expected === combination[targetKey]
  })
}

function getMappingSpecificity(mapping: V2DerivedOutcomeMapping, targetKeys: string[]) {
  return targetKeys.reduce((count, targetKey) => {
    const value = mapping.combination[targetKey]
    return value && value !== '*' ? count + 1 : count
  }, 0)
}

export function resolveDerivedOutcome(
  config: V2ScoringConfig,
  outcomeSet: V2DerivedOutcomeSet,
  bandSelection: Record<string, string>
): V2DerivedOutcomeResolution {
  const normalizedSelection = Object.fromEntries(
    Object.entries(bandSelection).map(([key, value]) => [normalizeTargetKey(key), asString(value).trim()])
  )
  const matches = outcomeSet.mappings.filter((mapping) =>
    mappingMatchesCombination(mapping, normalizedSelection, outcomeSet.targetKeys)
  )

  if (matches.length === 0) {
    return { status: 'unmatched' }
  }

  const ranked = [...matches].sort((left, right) => {
    const specificity = getMappingSpecificity(right, outcomeSet.targetKeys) - getMappingSpecificity(left, outcomeSet.targetKeys)
    if (specificity !== 0) return specificity
    return outcomeSet.mappings.findIndex((item) => item.id === left.id) - outcomeSet.mappings.findIndex((item) => item.id === right.id)
  })
  const topSpecificity = getMappingSpecificity(ranked[0]!, outcomeSet.targetKeys)
  const topMatches = ranked.filter((mapping) => getMappingSpecificity(mapping, outcomeSet.targetKeys) === topSpecificity)

  if (topMatches.length > 1) {
    const distinctOutcomeKeys = new Set(topMatches.map((mapping) => mapping.outcomeKey))
    if (distinctOutcomeKeys.size > 1) {
      return { status: 'ambiguous', candidates: topMatches }
    }
  }

  const mapping = ranked[0]!
  const outcome = outcomeSet.outcomes.find((item) => item.key === mapping.outcomeKey)
  if (!outcome) {
    return { status: 'unmatched' }
  }

  return {
    status: 'matched',
    outcome,
    mapping,
  }
}

export function analyzeDerivedOutcomeCoverage(
  config: V2ScoringConfig,
  outcomeSet: V2DerivedOutcomeSet
): V2DerivedOutcomeCoverage {
  const issues: V2DerivedOutcomeCoverageIssue[] = []

  if (outcomeSet.targetKeys.length < 2) {
    issues.push({
      type: 'missing_targets',
      message: 'Derived outcome sets must reference at least two targets.',
    })
  }

  if (outcomeSet.targetKeys.length > MAX_V2_DERIVED_OUTCOME_TARGETS) {
    issues.push({
      type: 'too_many_targets',
      message: `Derived outcome sets can reference at most ${MAX_V2_DERIVED_OUTCOME_TARGETS} targets.`,
    })
  }

  const targetKeySet = new Set(outcomeSet.targetKeys)
  const outcomeKeySet = new Set(outcomeSet.outcomes.map((item) => item.key))
  const bandKeyMap = new Map(
    outcomeSet.targetKeys.map((targetKey) => [
      targetKey,
      new Set(getBandingConfig(config, outcomeSet.level, targetKey).bands.map((band) => band.id)),
    ])
  )

  for (const targetKey of outcomeSet.targetKeys) {
    const bandKeys = bandKeyMap.get(targetKey)
    if (!bandKeys || bandKeys.size === 0) {
      issues.push({
        type: 'missing_banding',
        targetKey,
        message: `Target "${targetKey}" has no configured bands.`,
      })
    }
  }

  const signatureMap = new Map<string, string>()
  for (const mapping of outcomeSet.mappings) {
    if (!outcomeKeySet.has(mapping.outcomeKey)) {
      issues.push({
        type: 'unknown_outcome',
        mappingId: mapping.id,
        message: `Mapping "${mapping.id}" points to unknown outcome "${mapping.outcomeKey}".`,
      })
    }

    for (const [targetKey, bandKey] of Object.entries(mapping.combination)) {
      if (!targetKeySet.has(targetKey)) {
        issues.push({
          type: 'unknown_target',
          mappingId: mapping.id,
          targetKey,
          message: `Mapping "${mapping.id}" references unknown target "${targetKey}".`,
        })
        continue
      }
      if (bandKey !== '*' && !bandKeyMap.get(targetKey)?.has(bandKey)) {
        issues.push({
          type: 'unknown_band',
          mappingId: mapping.id,
          targetKey,
          message: `Mapping "${mapping.id}" references unknown band "${bandKey}" for "${targetKey}".`,
        })
      }
    }

    const signature = outcomeSet.targetKeys
      .map((targetKey) => `${targetKey}:${mapping.combination[targetKey] ?? '*'}`)
      .join('|')
    if (signatureMap.has(signature)) {
      issues.push({
        type: 'duplicate_mapping',
        mappingId: mapping.id,
        message: `Mappings "${signatureMap.get(signature)}" and "${mapping.id}" target the same combination signature.`,
      })
    } else {
      signatureMap.set(signature, mapping.id)
    }
  }

  const combinations = buildExactDerivedOutcomeCombinations(config, outcomeSet)
  let resolvedCombinations = 0
  for (const combination of combinations) {
    const resolution = resolveDerivedOutcome(config, outcomeSet, combination)
    if (resolution.status === 'matched') {
      resolvedCombinations += 1
      continue
    }

    issues.push({
      type: resolution.status === 'ambiguous' ? 'ambiguous_match' : 'unresolved_combination',
      combination,
      message:
        resolution.status === 'ambiguous'
          ? 'Multiple equally specific mappings match this combination.'
          : 'No derived outcome mapping matches this combination.',
    })
  }

  return {
    ok: issues.length === 0,
    totalCombinations: combinations.length,
    resolvedCombinations,
    issues,
  }
}

// Archetype Engine Functions

export function getArchetypeSet(config: V2ScoringConfig, key: string) {
  return config.archetypes.find((item) => item.key === key) ?? null
}

export function upsertArchetypeSet(config: V2ScoringConfig, value: V2ArchetypeSet) {
  const archetypes = config.archetypes.filter((item) => item.key !== value.key)
  return normalizeV2ScoringConfig({
    ...config,
    archetypes: [...archetypes, value],
  })
}

export function deleteArchetypeSet(config: V2ScoringConfig, key: string) {
  return normalizeV2ScoringConfig({
    ...config,
    archetypes: config.archetypes.filter((item) => item.key !== key),
  })
}

function conditionMatches(
  condition: V2ArchetypeCondition,
  bandSelection: Record<string, string>,
  archetypeSet: V2ArchetypeSet
): boolean {
  if (condition.type === 'band_in') {
    const bandLabel = bandSelection[condition.targetKey]
    return typeof bandLabel === 'string' && condition.bandLabels.includes(bandLabel)
  }

  if (condition.type === 'band_not_in') {
    const bandLabel = bandSelection[condition.targetKey]
    return typeof bandLabel !== 'string' || !condition.bandLabels.includes(bandLabel)
  }

  if (condition.type === 'count_gte') {
    const count = archetypeSet.targetKeys.filter((targetKey) => {
      const bandLabel = bandSelection[targetKey]
      return typeof bandLabel === 'string' && condition.bandLabels.includes(bandLabel)
    }).length
    return count >= condition.count
  }

  if (condition.type === 'count_lte') {
    const count = archetypeSet.targetKeys.filter((targetKey) => {
      const bandLabel = bandSelection[targetKey]
      return typeof bandLabel === 'string' && condition.bandLabels.includes(bandLabel)
    }).length
    return count <= condition.count
  }

  return false
}

export function resolveArchetype(
  config: V2ScoringConfig,
  archetypeSet: V2ArchetypeSet,
  bandSelection: Record<string, string>
): V2ArchetypeResolution {
  const normalizedSelection = Object.fromEntries(
    Object.entries(bandSelection).map(([key, value]) => [normalizeTargetKey(key), asString(value).trim()])
  )

  // Sort rules by priority (lower = checked first)
  const sortedRules = [...archetypeSet.rules].sort((a, b) => a.priority - b.priority)

  // Walk through rules in priority order
  for (const rule of sortedRules) {
    const allConditionsMatch = rule.conditions.every((condition) =>
      conditionMatches(condition, normalizedSelection, archetypeSet)
    )

    if (allConditionsMatch) {
      const profile = archetypeSet.profiles.find((p) => p.key === rule.profileKey)
      if (profile) {
        return {
          status: 'matched',
          profile,
          rule,
          matchedConditions: rule.conditions.length,
        }
      }
    }
  }

  // Fall back to default profile if one exists
  const defaultProfile = archetypeSet.profiles.find((p) => p.isDefault)
  if (defaultProfile) {
    return {
      status: 'default',
      profile: defaultProfile,
    }
  }

  return { status: 'unmatched' }
}
