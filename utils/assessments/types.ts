export type AssessmentStatus = 'draft' | 'active' | 'archived'
export type ScoringEngineType = 'rule_based' | 'psychometric' | 'hybrid'

export type Assessment = {
  id: string
  key: string
  name: string
  external_name: string
  description: string | null
  status: AssessmentStatus
  is_public: boolean
  version: number
  scoring_engine: ScoringEngineType
  scoring_config: ScoringConfig
  created_by: string | null
  created_at: string
  updated_at: string
}

export type AssessmentQuestion = {
  id: string
  assessment_id: string
  question_key: string
  text: string
  dimension: string
  is_reverse_coded: boolean
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AssessmentCohortStatus = 'draft' | 'active' | 'closed'

export type AssessmentCohort = {
  id: string
  assessment_id: string
  name: string
  description: string | null
  status: AssessmentCohortStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export type AssessmentInvitationStatus =
  | 'pending'
  | 'sent'
  | 'opened'
  | 'started'
  | 'completed'
  | 'expired'

export type AssessmentInvitation = {
  id: string
  assessment_id: string
  cohort_id: string | null
  token: string
  contact_id: string | null
  email: string
  first_name: string | null
  last_name: string | null
  organisation: string | null
  role: string | null
  status: AssessmentInvitationStatus
  expires_at: string | null
  sent_at: string | null
  opened_at: string | null
  started_at: string | null
  completed_at: string | null
  submission_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type AssessmentSubmission = {
  id: string
  assessment_id: string
  invitation_id: string | null
  contact_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
  consent: boolean | null
  responses: Record<string, number>
  normalized_responses: Record<string, number>
  scores: Record<string, number>
  bands: Record<string, string>
  classification: {
    key: string
    label: string
  }
  recommendations: string[]
  created_at: string
  updated_at: string
}

export type ScoringOperator = '>' | '>=' | '<' | '<=' | '=' | '!='
export type ScoringConfigVersion = 1 | 2

export type ScoringCondition = {
  dimension: string
  operator: ScoringOperator
  value: number
}

export type ScoringBand = {
  key?: string
  label: string
  min_score: number // average score >= this → this band (lowest min_score is fallback)
  max_score?: number
  meaning?: string
}

export type ScoringDimension = {
  key: string
  label: string
  description?: string
  question_keys: string[] // auto-managed by API, used by scoring engine
  bands: ScoringBand[] // ordered list; lowest min_score is fallback
}

export type ScoringClassification = {
  key: string
  label: string
  conditions: ScoringCondition[]
  recommendations: string[]
  description?: string
  automation_rationale?: string
  preferred_signals?: ScoringClassificationSignal[]
  excluded_signals?: ScoringClassificationExclusion[]
}

export type ScoringMatrixCell = {
  combination: Record<string, string>
  classification_key: string
  source?: 'manual' | 'generated'
  rationale?: string[]
}

export type ScoringClassificationSignal = {
  dimension: string
  band_key: string
  weight: number
}

export type ScoringClassificationExclusion = {
  dimension: string
  band_key: string
}

export type ScaleConfig = {
  points: 2 | 3 | 4 | 5 | 6 | 7
  labels: string[]
}

export type ScoringConfig = {
  version?: ScoringConfigVersion
  dimensions: ScoringDimension[]
  classifications: ScoringClassification[]
  scale_config?: ScaleConfig
  classification_overrides?: ScoringMatrixCell[]
  classification_matrix?: ScoringMatrixCell[]
}

export type ScoringCoverageIssue = {
  type:
    | 'dimension_band_gap'
    | 'dimension_band_overlap'
    | 'dimension_band_invalid'
    | 'dimension_band_key_duplicate'
    | 'matrix_missing_combination'
    | 'matrix_duplicate_combination'
    | 'matrix_invalid_band'
    | 'matrix_invalid_classification'
    | 'matrix_unreachable_classification'
    | 'classification_no_match'
    | 'classification_ambiguous'
  message: string
  dimension_key?: string
  band_key?: string
  classification_key?: string
  combination?: Record<string, string>
}

export type ScoringCoverageReport = {
  ok: boolean
  combinations_total: number
  combinations_mapped: number
  manual_combinations: number
  generated_combinations: number
  unresolved_combinations: number
  missing_combinations: number
  duplicate_combinations: number
  analysis_mode?: 'exhaustive' | 'rules'
  evaluated_profiles?: number
  issues: ScoringCoverageIssue[]
}

// ── Psychometric types ────────────────────────────────────────

export type AssessmentDimension = {
  id: string
  assessment_id: string
  code: string
  name: string
  description: string | null
  position: number
}

export type AssessmentTrait = {
  id: string
  assessment_id: string
  dimension_id: string | null
  code: string
  name: string
  description: string | null
  score_method: 'mean' | 'sum'
}

export type TraitQuestionMapping = {
  id: string
  trait_id: string
  question_id: string
  weight: number
  reverse_scored: boolean
}

export type NormGroup = {
  id: string
  assessment_id: string
  name: string
  description: string | null
  filters: Record<string, unknown> | null
  n: number
  is_global: boolean
  created_at: string
  updated_at: string
}

export type NormStats = {
  id: string
  norm_group_id: string
  trait_id: string
  mean: number
  sd: number
  p10: number | null
  p25: number | null
  p50: number | null
  p75: number | null
  p90: number | null
  min: number | null
  max: number | null
  computed_at: string
}

export type InterpretationRule = {
  id: string
  assessment_id: string
  target_type: 'trait' | 'dimension' | 'overall'
  target_id: string | null
  rule_type: 'band_text' | 'coaching_tip' | 'risk_flag' | 'recommendation'
  min_percentile: number
  max_percentile: number
  title: string | null
  body: string
  priority: number
  created_at: string
}

export type SessionScore = {
  id: string
  submission_id: string
  assessment_id: string
  norm_group_id: string | null
  scoring_run_id: string
  status: 'ok' | 'partial' | 'failed'
  warnings: Record<string, unknown> | null
  computed_at: string
}

export type TraitScore = {
  id: string
  session_score_id: string
  trait_id: string
  raw_score: number
  raw_n: number
  z_score: number | null
  percentile: number | null
  band: string | null
  computed_at: string
}

export type DimensionScore = {
  id: string
  session_score_id: string
  dimension_id: string
  raw_score: number
  z_score: number | null
  percentile: number | null
  band: string | null
  computed_at: string
}
