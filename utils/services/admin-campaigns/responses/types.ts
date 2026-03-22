import type {
  CampaignDemographics,
  CampaignFlowStep,
  CampaignScreenStepConfig,
} from '@/utils/assessments/campaign-types'

export type SubmissionAssessmentRelation = {
  id: string
  key: string
  name: string
  status: string
  report_config?: unknown
}

export type SubmissionInvitationRelation = {
  id?: string
  status: string | null
  completed_at: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
}

export type SubmissionRow = {
  id: string
  invitation_id: string | null
  campaign_id: string
  assessment_id: string
  created_at: string
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
  demographics: CampaignDemographics | null
  scores: Record<string, unknown> | null
  bands: Record<string, string> | null
  classification: { key?: string; label?: string; source?: string } | null
  recommendations: unknown[] | null
  responses: Record<string, number> | null
  normalized_responses: Record<string, number> | null
  report_token?: string | null
  assessments:
    | SubmissionAssessmentRelation
    | SubmissionAssessmentRelation[]
    | null
  assessment_invitations:
    | SubmissionInvitationRelation
    | SubmissionInvitationRelation[]
    | null
}

export type AdminCampaignSubmissionRow = {
  id: string
  candidateKey: string
  assessmentId: string
  assessmentName: string
  assessmentKey: string
  participantName: string
  email: string
  organisation: string | null
  role: string | null
  status: string
  outcomeLabel: string | null
  averageTraitScore: number | null
  submittedAt: string
  completedAt: string | null
  detailHref: string
  reportsHref: string
  currentReportHref: string | null
  candidateHref: string
}

export type AdminCampaignCandidateRow = {
  candidateKey: string
  participantName: string
  email: string
  organisation: string | null
  role: string | null
  status: 'not_started' | 'in_progress' | 'completed'
  completedAssessments: number
  totalAssessments: number
  lastActivityAt: string | null
  submissionCount: number
}

export type AdminCampaignCandidateJourney = {
  candidate: {
    candidateKey: string
    participantName: string
    email: string
    organisation: string | null
    role: string | null
    status: 'not_started' | 'in_progress' | 'completed'
  }
  journey: Array<
    | {
        stepId: string
        stepType: 'screen'
        label: string
        status: 'screen'
        screenConfig: CampaignScreenStepConfig
      }
    | {
        stepId: string
        stepType: 'assessment'
        label: string
        status: 'not_started' | 'completed'
        assessment: {
          id: string
          key: string
          name: string
        } | null
        submission: AdminCampaignSubmissionRow | null
      }
  >
  submissions: AdminCampaignSubmissionRow[]
}

export type { CampaignFlowStep }
