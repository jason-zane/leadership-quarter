import type { ResponseReportOption } from '@/utils/services/response-experience'

export type SubmissionAssessmentRelation = {
  id?: string
  key?: string
  name?: string
  report_config?: unknown
}

export type InvitationAssessmentRelation = {
  id?: string
  key?: string
  name?: string
}

export type CampaignRelation = {
  id?: string
  name?: string
  slug?: string
}

export type SubmissionInvitationRelation = {
  id?: string
  contact_id?: string | null
  status?: string | null
  completed_at?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  organisation?: string | null
  role?: string | null
}

export type SubmissionRow = {
  id: string
  assessment_id: string
  campaign_id: string | null
  invitation_id: string | null
  participant_id: string | null
  contact_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
  demographics: Record<string, unknown> | null
  created_at: string
  assessments:
    | SubmissionAssessmentRelation
    | SubmissionAssessmentRelation[]
    | null
  campaigns:
    | CampaignRelation
    | CampaignRelation[]
    | null
  assessment_invitations:
    | SubmissionInvitationRelation
    | SubmissionInvitationRelation[]
    | null
}

export type InvitationRow = {
  id: string
  assessment_id: string
  campaign_id: string | null
  participant_id: string | null
  contact_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
  status: string | null
  completed_at: string | null
  created_at: string
  expires_at: string | null
  assessments:
    | InvitationAssessmentRelation
    | InvitationAssessmentRelation[]
    | null
  campaigns:
    | CampaignRelation
    | CampaignRelation[]
    | null
}

export type ContactRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  status: string
}

export type ParticipantRecordRow = {
  id: string
  status: 'active' | 'archived'
  contact_id: string | null
  email: string | null
  first_name: string | null
  last_name: string | null
  organisation: string | null
  role: string | null
}

export type AdminAssessmentParticipantRow = {
  participantRecordId: string | null
  participantKey: string
  participantName: string
  email: string | null
  organisation: string | null
  role: string | null
  identitySource: 'contact' | 'email' | 'anonymous'
  status: 'active' | 'archived'
  contactId: string | null
  contactHref: string | null
  assessmentsCompleted: number
  assessmentsTouched: number
  campaignsInvolved: number
  responseCount: number
  pendingInvitations: number
  lastActivityAt: string | null
  detailHref: string
  latestSubmission:
    | {
        submissionId: string
        assessmentId: string
        detailHref: string
      }
    | null
}

export type AdminAssessmentParticipantSubmissionRow = {
  submissionId: string
  assessmentId: string
  assessmentKey: string
  assessmentName: string
  campaignId: string | null
  campaignName: string | null
  campaignSlug: string | null
  participantName: string
  email: string | null
  organisation: string | null
  role: string | null
  submittedAt: string
  demographics: Array<{ key: string; label: string; value: string }>
  detailHref: string
  reportsHref: string
  currentReportHref: string | null
}

export type AdminAssessmentParticipantInvitationRow = {
  invitationId: string
  assessmentId: string
  assessmentName: string
  campaignId: string | null
  campaignName: string | null
  status: string | null
  completedAt: string | null
  createdAt: string
  expiresAt: string | null
}

export type AdminAssessmentParticipantProfile = {
  participantRecordId: string | null
  participantKey: string
  participantName: string
  email: string | null
  organisation: string | null
  role: string | null
  identitySource: 'contact' | 'email' | 'anonymous'
  status: 'active' | 'archived'
  contact: {
    id: string
    name: string
    email: string
    status: string
    href: string
  } | null
  counts: {
    responses: number
    completedAssessments: number
    assessmentsTouched: number
    campaignsInvolved: number
    pendingInvitations: number
  }
  lastActivityAt: string | null
  submissions: AdminAssessmentParticipantSubmissionRow[]
  invitations: AdminAssessmentParticipantInvitationRow[]
}

export type AdminAssessmentParticipantSubmissionDetail = {
  submissionId: string
  assessmentId: string
  detailData: {
    participantName: string
    email: string | null
    contextLine: string
    submittedLabel: string
    demographics: Array<{ key: string; label: string; value: string }>
    completeness: {
      answeredItems: number
      totalItems: number
      completionPercent: number
    }
    traitScores: Array<{
      key: string
      label: string
      groupLabel: string | null
      value: number
      band: string | null
      meaning: string | null
    }>
    itemResponses: Array<{
      key: string
      text: string
      rawValue: number | null
      normalizedValue: number | null
      reverseCoded: boolean
      mappedTraits: string[]
    }>
    reportOptions: ResponseReportOption[]
  }
}

export type AdminAssessmentParticipantAccumulator = {
  participantRecordId: string | null
  participantStatus: 'active' | 'archived'
  participantKey: string
  contactId: string | null
  email: string
  participantName: string
  organisation: string | null
  role: string | null
  submissions: SubmissionRow[]
  invitations: InvitationRow[]
}

export type ParticipantFilters = {
  q?: string
  assessmentId?: string
  campaignId?: string
}
