export type SurveyStatus = 'draft' | 'active' | 'archived'

export type Survey = {
  id: string
  key: string
  name: string
  description: string | null
  status: SurveyStatus
  is_public: boolean
  version: number
  scoring_config: ScoringConfig
  created_by: string | null
  created_at: string
  updated_at: string
}

export type SurveyQuestion = {
  id: string
  survey_id: string
  question_key: string
  text: string
  dimension: string
  is_reverse_coded: boolean
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SurveyCohortStatus = 'draft' | 'active' | 'closed'

export type SurveyCohort = {
  id: string
  survey_id: string
  name: string
  description: string | null
  status: SurveyCohortStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export type SurveyInvitationStatus =
  | 'pending'
  | 'sent'
  | 'opened'
  | 'started'
  | 'completed'
  | 'expired'

export type SurveyInvitation = {
  id: string
  survey_id: string
  cohort_id: string | null
  token: string
  contact_id: string | null
  email: string
  first_name: string | null
  last_name: string | null
  organisation: string | null
  role: string | null
  status: SurveyInvitationStatus
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

export type SurveySubmission = {
  id: string
  survey_id: string
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
