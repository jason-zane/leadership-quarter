import { createAdminClient } from '@/utils/supabase/admin'
import {
  loadAssessmentRuntimeQuestions,
  toRuntimeAssessmentPayload,
  type AssessmentPayloadSource,
  type RuntimeAssessmentQuestion,
} from '@/utils/services/assessment-runtime-content'

type InvitationAssessmentRelation = AssessmentPayloadSource & {
  status: string
}

type InvitationRow = {
  id: string
  assessment_id: string
  token: string
  first_name: string | null
  last_name: string | null
  organisation: string | null
  role: string | null
  status: string | null
  opened_at: string | null
  completed_at: string | null
  expires_at: string | null
  assessments: InvitationAssessmentRelation | InvitationAssessmentRelation[] | null
}

export type GetAssessmentInvitationResult =
  | {
      ok: true
      data: {
        assessment: {
          id: string
          key: string
          name: string
          description: string | null
          version: number
        }
        survey: {
          id: string
          key: string
          name: string
          description: string | null
          version: number
        }
        questions: RuntimeAssessmentQuestion[]
        invitation: {
          firstName: string | null
          lastName: string | null
          organisation: string | null
          role: string | null
        }
      }
    }
  | {
      ok: false
      error:
        | 'missing_service_role'
        | 'invitation_not_found'
        | 'survey_not_active'
        | 'invitation_completed'
        | 'invitation_expired'
        | 'questions_load_failed'
      message?: string
    }

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() <= Date.now()
}

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export async function getAssessmentInvitation(input: {
  token: string
}): Promise<GetAssessmentInvitationResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      ok: false,
      error: 'missing_service_role',
      message: 'Supabase admin credentials are not configured.',
    }
  }

  const { data: invitationRow, error } = await adminClient
    .from('assessment_invitations')
    .select(
      'id, assessment_id, token, first_name, last_name, organisation, role, status, opened_at, completed_at, expires_at, assessments(id, key, name:external_name, description, version, status)'
    )
    .eq('token', input.token)
    .maybeSingle()

  if (error || !invitationRow) {
    return { ok: false, error: 'invitation_not_found' }
  }

  const invitation = invitationRow as InvitationRow
  const assessment = pickRelation(invitation.assessments)

  if (!assessment || assessment.status !== 'active') {
    return { ok: false, error: 'survey_not_active' }
  }

  if (invitation.status === 'completed' || invitation.completed_at) {
    return { ok: false, error: 'invitation_completed' }
  }

  if (isExpired(invitation.expires_at)) {
    await adminClient
      .from('assessment_invitations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', invitation.id)

    return { ok: false, error: 'invitation_expired' }
  }

  const questionResult = await loadAssessmentRuntimeQuestions(adminClient, assessment.id)
  if (!questionResult.ok) {
    return questionResult
  }

  if (!invitation.opened_at) {
    await adminClient
      .from('assessment_invitations')
      .update({
        opened_at: new Date().toISOString(),
        status:
          invitation.status === 'pending' || invitation.status === 'sent'
            ? 'opened'
            : invitation.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)
  }

  const assessmentPayload = toRuntimeAssessmentPayload(assessment)

  return {
    ok: true,
    data: {
      assessment: assessmentPayload,
      survey: assessmentPayload,
      questions: questionResult.questions,
      invitation: {
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        organisation: invitation.organisation,
        role: invitation.role,
      },
    },
  }
}
