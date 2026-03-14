import { createAdminClient } from '@/utils/supabase/admin'
import { shouldUseV2Runtime } from '@/utils/assessments/v2-runtime'
import { getAssessmentV2Runtime } from '@/utils/services/assessment-runtime-v2'
import {
  loadAssessmentRuntimeQuestions,
  normalizeAssessmentRuntimePresentation,
  type RuntimeAssessmentPayload,
  type RuntimeAssessmentPresentation,
  type RuntimeAssessmentQuestion,
  type RuntimeRenderableAssessment,
} from '@/utils/services/assessment-runtime-content'
import type { AssessmentV2ExperienceConfig } from '@/utils/assessments/v2-experience-config'

type InvitationRuntimeAssessmentRelation = RuntimeRenderableAssessment & {
  status: string
}

type InvitationRuntimeRow = {
  id: string
  token: string
  status: string | null
  expires_at: string | null
  first_name: string | null
  last_name: string | null
  organisation: string | null
  role: string | null
  assessments:
    | InvitationRuntimeAssessmentRelation
    | InvitationRuntimeAssessmentRelation[]
    | null
}

export type GetRuntimeInvitationAssessmentResult =
  | {
      ok: true
      data: {
        context: 'invitation'
        assessment: RuntimeAssessmentPayload
        invitation: {
          firstName: string | null
          lastName: string | null
          organisation: string | null
          role: string | null
        }
        questions: RuntimeAssessmentQuestion[]
        runnerConfig: RuntimeAssessmentPresentation['runnerConfig']
        reportConfig: RuntimeAssessmentPresentation['reportConfig']
        v2ExperienceConfig?: AssessmentV2ExperienceConfig
        scale: RuntimeAssessmentPresentation['scale']
      }
    }
  | {
      ok: false
      error:
        | 'missing_service_role'
        | 'invitation_not_found'
        | 'invitation_completed'
        | 'invitation_expired'
        | 'assessment_not_active'
        | 'questions_load_failed'
    }

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() <= Date.now()
}

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export async function getRuntimeInvitationAssessment(input: {
  token: string
  forceV2?: boolean
}): Promise<GetRuntimeInvitationAssessmentResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return { ok: false, error: 'missing_service_role' }
  }

  const { data: invitationRow, error: invitationError } = await adminClient
    .from('assessment_invitations')
    .select(`
      id, token, status, expires_at, first_name, last_name, organisation, role,
      assessments(id, key, name:external_name, description, status, version, runner_config, report_config)
    `)
    .eq('token', input.token)
    .maybeSingle()

  if (invitationError || !invitationRow) {
    return { ok: false, error: 'invitation_not_found' }
  }

  const invitation = invitationRow as InvitationRuntimeRow

  if (invitation.status === 'completed') {
    return { ok: false, error: 'invitation_completed' }
  }

  if (isExpired(invitation.expires_at)) {
    await adminClient
      .from('assessment_invitations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', invitation.id)

    return { ok: false, error: 'invitation_expired' }
  }

  const assessment = pickRelation(invitation.assessments)
  if (!assessment || assessment.status !== 'active') {
    return { ok: false, error: 'assessment_not_active' }
  }

  if (shouldUseV2Runtime(assessment.report_config, { forceV2: input.forceV2 })) {
    const v2Runtime = await getAssessmentV2Runtime({
      adminClient,
      assessmentId: assessment.id,
    })
    if (!v2Runtime.ok) {
      return { ok: false, error: v2Runtime.error === 'assessment_not_found' ? 'assessment_not_active' : v2Runtime.error }
    }

    return {
      ok: true,
      data: {
        context: 'invitation',
        assessment: v2Runtime.data.assessment,
        invitation: {
          firstName: invitation.first_name,
          lastName: invitation.last_name,
          organisation: invitation.organisation,
          role: invitation.role,
        },
        questions: v2Runtime.data.questions,
        runnerConfig: v2Runtime.data.runnerConfig,
        reportConfig: v2Runtime.data.reportConfig,
        v2ExperienceConfig: v2Runtime.data.v2ExperienceConfig,
        scale: v2Runtime.data.scale,
      },
    }
  }

  const questionResult = await loadAssessmentRuntimeQuestions(adminClient, assessment.id)
  if (!questionResult.ok) {
    return questionResult
  }

  const presentation = normalizeAssessmentRuntimePresentation(assessment)

  return {
    ok: true,
    data: {
      context: 'invitation',
      assessment: presentation.assessment,
      invitation: {
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        organisation: invitation.organisation,
        role: invitation.role,
      },
      questions: questionResult.questions,
      runnerConfig: presentation.runnerConfig,
      reportConfig: presentation.reportConfig,
      v2ExperienceConfig: presentation.v2ExperienceConfig,
      scale: presentation.scale,
    },
  }
}
