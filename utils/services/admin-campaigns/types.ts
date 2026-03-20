import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import type {
  CampaignConfig,
  CampaignScreenStepConfig,
  CampaignStatus,
} from '@/utils/assessments/campaign-types'

export type AdminClient = RouteAuthSuccess['adminClient']

export type CampaignResponseScoreMap = Record<string, unknown>
export type CampaignResponseInvitation = {
  status: string | null
  completed_at: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
}

export type AdminCampaignCreatePayload = {
  name?: string
  external_name?: string
  description?: string | null
  slug?: string
  status?: CampaignStatus
  organisation_id?: string | null
  config?: Partial<CampaignConfig>
  runner_overrides?: Record<string, unknown>
  assessment_ids?: string[]
  survey_ids?: string[]
}

export type AdminCampaignUpdatePayload = {
  name?: string
  external_name?: string
  description?: string | null
  slug?: string
  status?: CampaignStatus
  organisation_id?: string | null
  config?: Partial<CampaignConfig>
  runner_overrides?: Record<string, unknown>
}

export type CampaignAssessmentPayload = {
  assessment_id?: string
  survey_id?: string
  sort_order?: number
  is_active?: boolean
  report_overrides?: Record<string, unknown>
  report_delivery_config?: Record<string, unknown>
}

export type CampaignFlowStepPayload = {
  step_type?: 'assessment' | 'screen'
  assessment_id?: string
  survey_id?: string
  campaign_assessment_id?: string
  sort_order?: number
  is_active?: boolean
  screen_config?: Partial<CampaignScreenStepConfig> | null
  report_overrides?: Record<string, unknown>
  report_delivery_config?: Record<string, unknown>
}
