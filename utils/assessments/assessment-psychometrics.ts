import type {
  PsychometricValidationResponse,
  ValidationFactorModel,
  ValidationItemDiagnostic,
  ValidationScaleDiagnostic,
} from '@/utils/psychometrics/validation-contract'
import type { TraitNormStat } from '@/utils/assessments/assessment-psychometric-structure'

export type PsychometricNormGroup = {
  id: string
  key: string
  name: string
  useEveryone: boolean
  filters: Record<string, unknown>
  matchedSubmissionCount: number
  lastComputedAt: string | null
  traitStats: TraitNormStat[]
}

export type PsychometricValidationRun = {
  id: string
  analysisType: 'efa' | 'cfa' | 'invariance' | 'full_validation'
  normGroupId: string | null
  groupingVariable: string | null
  minimumSampleN: number
  sampleN: number
  status: 'completed' | 'failed'
  createdAt: string
  completedAt: string | null
  summary: Record<string, unknown>
  warnings: string[]
  errorMessage: string | null
  scaleDiagnostics: ValidationScaleDiagnostic[]
  itemDiagnostics: ValidationItemDiagnostic[]
  factorModels: ValidationFactorModel[]
  recommendations: PsychometricValidationResponse['recommendations']
}

export type PsychometricsConfig = {
  version: 1
  referenceGroups: PsychometricNormGroup[]
  validationRuns: PsychometricValidationRun[]
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function asBoolean(value: unknown) {
  return value === true
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function normalizeRows<T>(items: unknown, mapper: (row: Record<string, unknown>) => T | null) {
  if (!Array.isArray(items)) return [] as T[]
  return items
    .map((item) => item as Record<string, unknown>)
    .map(mapper)
    .filter((item): item is T => item !== null)
}

export function createEmptyPsychometricsConfig(): PsychometricsConfig {
  return {
    version: 1,
    referenceGroups: [],
    validationRuns: [],
  }
}

export function normalizePsychometricsConfig(input: unknown): PsychometricsConfig {
  const config = asRecord(input)

  return {
    version: 1,
    referenceGroups: normalizeRows(config.referenceGroups, (row) => ({
      id: asString(row.id).trim() || crypto.randomUUID(),
      key: asString(row.key).trim() || crypto.randomUUID().replace(/-/g, '_'),
      name: asString(row.name).trim(),
      useEveryone: row.useEveryone === undefined ? true : asBoolean(row.useEveryone),
      filters: asRecord(row.filters),
      matchedSubmissionCount: asNumber(row.matchedSubmissionCount, 0),
      lastComputedAt: asString(row.lastComputedAt).trim() || null,
      traitStats: normalizeRows(row.traitStats, (stat) => ({
        traitKey: asString(stat.traitKey).trim(),
        traitLabel: asString(stat.traitLabel).trim(),
        n: asNumber(stat.n, 0),
        mean: asNumber(stat.mean, 0),
        sd: Number.isFinite(asNumber(stat.sd, Number.NaN)) ? asNumber(stat.sd, 0) : null,
        min: Number.isFinite(asNumber(stat.min, Number.NaN)) ? asNumber(stat.min, 0) : null,
        max: Number.isFinite(asNumber(stat.max, Number.NaN)) ? asNumber(stat.max, 0) : null,
        p10: Number.isFinite(asNumber(stat.p10, Number.NaN)) ? asNumber(stat.p10, 0) : null,
        p25: Number.isFinite(asNumber(stat.p25, Number.NaN)) ? asNumber(stat.p25, 0) : null,
        p50: Number.isFinite(asNumber(stat.p50, Number.NaN)) ? asNumber(stat.p50, 0) : null,
        p75: Number.isFinite(asNumber(stat.p75, Number.NaN)) ? asNumber(stat.p75, 0) : null,
        p90: Number.isFinite(asNumber(stat.p90, Number.NaN)) ? asNumber(stat.p90, 0) : null,
        alpha: Number.isFinite(asNumber(stat.alpha, Number.NaN)) ? asNumber(stat.alpha, 0) : null,
      })).filter((stat) => stat.traitKey),
    })),
    validationRuns: normalizeRows(config.validationRuns, (row) => ({
      id: asString(row.id).trim() || crypto.randomUUID(),
      analysisType: row.analysisType === 'efa' || row.analysisType === 'cfa' || row.analysisType === 'invariance'
        ? row.analysisType
        : 'full_validation',
      normGroupId: asString(row.normGroupId).trim() || null,
      groupingVariable: asString(row.groupingVariable).trim() || null,
      minimumSampleN: Math.max(25, asNumber(row.minimumSampleN, 150)),
      sampleN: Math.max(0, asNumber(row.sampleN, 0)),
      status: row.status === 'failed' ? 'failed' : 'completed',
      createdAt: asString(row.createdAt).trim() || new Date().toISOString(),
      completedAt: asString(row.completedAt).trim() || null,
      summary: asRecord(row.summary),
      warnings: Array.isArray(row.warnings) ? row.warnings.map((item) => asString(item).trim()).filter(Boolean) : [],
      errorMessage: asString(row.errorMessage).trim() || null,
      scaleDiagnostics: Array.isArray(row.scaleDiagnostics) ? (row.scaleDiagnostics as ValidationScaleDiagnostic[]) : [],
      itemDiagnostics: Array.isArray(row.itemDiagnostics) ? (row.itemDiagnostics as ValidationItemDiagnostic[]) : [],
      factorModels: Array.isArray(row.factorModels) ? (row.factorModels as ValidationFactorModel[]) : [],
      recommendations: Array.isArray(row.recommendations) ? (row.recommendations as PsychometricValidationResponse['recommendations']) : [],
    })),
  }
}
