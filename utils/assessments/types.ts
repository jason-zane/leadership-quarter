export type AssessmentStatus = 'draft' | 'active' | 'archived'
export type ScoringEngineType = 'rule_based' | 'psychometric' | 'hybrid'

export type Assessment = {
  id: string
  key: string
  name: string
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

export type ScoringCondition = {
  dimension: string
  operator: ScoringOperator
  value: number
}

export type ScoringDimension = {
  key: string
  label: string
  question_keys: string[]
  thresholds: {
    high: number
    mid: number
  }
  bands: {
    high: string
    mid: string
    low: string
  }
}

export type ScoringClassification = {
  key: string
  label: string
  conditions: ScoringCondition[]
  recommendations: string[]
}

export type ScoringConfig = {
  dimensions: ScoringDimension[]
  classifications: ScoringClassification[]
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
