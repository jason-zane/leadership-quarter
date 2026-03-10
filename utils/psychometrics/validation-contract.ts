export type ValidationScaleItem = {
  question_key: string
  text: string
  weight: number
  reverse_scored: boolean
}

export type ValidationScaleDefinition = {
  key: string
  label: string
  source: 'trait_mapped' | 'legacy_dimension'
  items: ValidationScaleItem[]
}

export type ValidationRespondent = {
  submission_id: string
  group_key: string | null
  responses: Record<string, number | null>
}

export type PsychometricValidationRequest = {
  analysis_type: 'efa' | 'cfa' | 'invariance' | 'full_validation'
  assessment_id: string
  grouping_variable: string | null
  minimum_sample_n: number
  primary_scales: ValidationScaleDefinition[]
  legacy_scales: ValidationScaleDefinition[]
  respondents: ValidationRespondent[]
}

export type ValidationScaleDiagnostic = {
  scale_key: string
  scale_label: string
  source: 'trait_mapped' | 'legacy_dimension'
  item_count: number
  complete_n: number
  alpha: number | null
  alpha_ci_lower: number | null
  alpha_ci_upper: number | null
  sem: number | null
  missing_rate: number | null
  metadata?: Record<string, unknown>
}

export type ValidationItemDiagnostic = {
  scale_key: string
  question_key: string
  item_label: string
  source: 'trait_mapped' | 'legacy_dimension'
  reverse_scored: boolean
  mean: number | null
  sd: number | null
  missing_rate: number | null
  floor_pct: number | null
  ceiling_pct: number | null
  citc: number | null
  alpha_if_deleted: number | null
  metadata?: Record<string, unknown>
}

export type ValidationFactorLoading = {
  scale_key: string
  question_key: string
  factor_key: string
  loading: number | null
  standardized_loading: number | null
  communality: number | null
  uniqueness: number | null
  cross_loading: boolean
  retained: boolean
  metadata?: Record<string, unknown>
}

export type ValidationFactorModel = {
  model_kind: 'efa' | 'cfa' | 'invariance'
  model_name: string
  factor_count: number
  rotation?: string | null
  extraction_method?: string | null
  grouping_variable?: string | null
  group_key?: string | null
  adequacy?: Record<string, unknown>
  fit_indices?: Record<string, unknown>
  factor_correlations?: Record<string, unknown>
  summary?: Record<string, unknown>
  loadings?: ValidationFactorLoading[]
}

export type ValidationRecommendation = {
  scope: 'assessment' | 'scale' | 'item' | 'model'
  target_key?: string | null
  severity: 'info' | 'warning' | 'critical'
  code: string
  message: string
  metadata?: Record<string, unknown>
}

export type PsychometricValidationResponse = {
  summary: Record<string, unknown>
  scale_diagnostics: ValidationScaleDiagnostic[]
  item_diagnostics: ValidationItemDiagnostic[]
  efa_models: ValidationFactorModel[]
  cfa_models: ValidationFactorModel[]
  invariance_results: ValidationFactorModel[]
  recommendations: ValidationRecommendation[]
  warnings: Array<Record<string, unknown> | string>
}
