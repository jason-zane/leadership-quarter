import { createAdminClient } from '@/utils/supabase/admin'
import { normalizeOrgBrandingConfig, type OrgBrandingConfig } from '@/utils/brand/org-brand-utils'
import { normalizeCampaignConfig } from '@/utils/assessments/campaign-types'
import { getAssessmentRuntime } from '@/utils/services/assessment-runtime'
import {
  type RuntimeAssessmentPayload,
  type RuntimeAssessmentPresentation,
  type RuntimeAssessmentQuestion,
  type RuntimeRenderableAssessment,
} from '@/utils/services/assessment-runtime-content'
import type { AssessmentExperienceConfig } from '@/utils/assessments/assessment-experience-config'

type InvitationRuntimeAssessmentRelation = RuntimeRenderableAssessment & {
  status: string
}

type InvitationCampaignOrgRelation = {
  id?: string
  name: string
  branding_config: unknown
}

type InvitationCampaignRelation = {
  config?: unknown
  organisations: InvitationCampaignOrgRelation | InvitationCampaignOrgRelation[] | null
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
  campaigns: InvitationCampaignRelation | InvitationCampaignRelation[] | null
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
        brandingConfig: OrgBrandingConfig
        questions: RuntimeAssessmentQuestion[]
        runnerConfig: RuntimeAssessmentPresentation['runnerConfig']
        reportConfig: RuntimeAssessmentPresentation['reportConfig']
        v2ExperienceConfig?: AssessmentExperienceConfig
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
}): Promise<GetRuntimeInvitationAssessmentResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return { ok: false, error: 'missing_service_role' }
  }

  const { data: invitationRow, error: invitationError } = await adminClient
    .from('assessment_invitations')
    .select(`
      id, token, status, expires_at, first_name, last_name, organisation, role,
      assessments(id, key, name:external_name, description, status, version, runner_config, report_config),
      campaigns(config, organisations(id, name, branding_config))
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

  // Resolve org branding via campaign → organisation chain
  const campaignRelation = Array.isArray(invitation.campaigns)
    ? invitation.campaigns[0] ?? null
    : invitation.campaigns
  let orgRelation = campaignRelation
    ? pickRelation(campaignRelation.organisations)
    : null
  const normalizedCampaignConfig = normalizeCampaignConfig(campaignRelation?.config ?? null)
  if (
    normalizedCampaignConfig.branding_source_organisation_id
    && normalizedCampaignConfig.branding_source_organisation_id !== orgRelation?.id
  ) {
    const { data: brandingSourceOrg } = await adminClient
      .from('organisations')
      .select('id, name, branding_config')
      .eq('id', normalizedCampaignConfig.branding_source_organisation_id)
      .maybeSingle()

    if (brandingSourceOrg) {
      orgRelation = brandingSourceOrg as InvitationCampaignOrgRelation
    }
  }
  const brandingConfig = normalizeOrgBrandingConfig(
    orgRelation ? orgRelation.branding_config : null
  )

  const invitationFields = {
    firstName: invitation.first_name,
    lastName: invitation.last_name,
    organisation: invitation.organisation,
    role: invitation.role,
  }

  const v2Runtime = await getAssessmentRuntime({
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
      invitation: invitationFields,
      brandingConfig,
      questions: v2Runtime.data.questions,
      runnerConfig: v2Runtime.data.runnerConfig,
      reportConfig: v2Runtime.data.reportConfig,
      v2ExperienceConfig: v2Runtime.data.v2ExperienceConfig,
      scale: v2Runtime.data.scale,
    },
  }
}
