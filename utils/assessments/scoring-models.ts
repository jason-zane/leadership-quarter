import {
  createEmptyScoringConfig,
  normalizeScoringConfig,
} from '@/utils/assessments/scoring-config'
import type {
  ScoringConfig,
  ScoringEngineType,
} from '@/utils/assessments/types'

export type AssessmentScoringModelMode = ScoringEngineType
export type AssessmentScoringModelStatus = 'draft' | 'published' | 'archived'

export type AssessmentScoringModelRecord = {
  id: string
  assessment_id: string
  model_key: string
  name: string
  mode: AssessmentScoringModelMode
  status: AssessmentScoringModelStatus
  is_default: boolean
  config: unknown
  output_summary: unknown
  created_by?: string | null
  created_at?: string
  updated_at?: string
}

type ScoringModelOutputSummary = {
  competency_count: number
  classification_count: number
  uses_matrix: boolean
  scale_points: number
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeScoringModelMode(value: unknown): AssessmentScoringModelMode {
  if (value === 'psychometric' || value === 'hybrid') {
    return value
  }

  return 'rule_based'
}

export function normalizeScoringModelStatus(value: unknown): AssessmentScoringModelStatus {
  if (value === 'published' || value === 'archived') {
    return value
  }

  return 'draft'
}

export function normalizeScoringModelConfig(value: unknown): ScoringConfig {
  return normalizeScoringConfig(value)
}

export function buildScoringModelOutputSummary(value: unknown): ScoringModelOutputSummary {
  const config = normalizeScoringModelConfig(value)
  return {
    competency_count: config.dimensions.length,
    classification_count: config.classifications.length,
    uses_matrix: Array.isArray(config.classification_matrix) && config.classification_matrix.length > 0,
    scale_points: config.scale_config?.points ?? 5,
  }
}

export function normalizeScoringModelOutputSummary(value: unknown): ScoringModelOutputSummary {
  if (!isObject(value)) {
    return buildScoringModelOutputSummary(createEmptyScoringConfig())
  }

  return {
    competency_count:
      typeof value.competency_count === 'number' && Number.isFinite(value.competency_count)
        ? Math.max(0, Math.floor(value.competency_count))
        : 0,
    classification_count:
      typeof value.classification_count === 'number' && Number.isFinite(value.classification_count)
        ? Math.max(0, Math.floor(value.classification_count))
        : 0,
    uses_matrix: Boolean(value.uses_matrix),
    scale_points:
      typeof value.scale_points === 'number' && Number.isFinite(value.scale_points)
        ? Math.max(2, Math.floor(value.scale_points))
        : 5,
  }
}

export function getDefaultScoringModelName(mode: AssessmentScoringModelMode) {
  switch (mode) {
    case 'psychometric':
      return 'Psychometric scoring model'
    case 'hybrid':
      return 'Hybrid scoring model'
    default:
      return 'Core scoring model'
  }
}

export function toScoringModelKey(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return normalized || fallback
}
