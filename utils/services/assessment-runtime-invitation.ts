import { createAdminClient } from '@/utils/supabase/admin'
import { normalizeOrgBrandingConfig, type OrgBrandingConfig } from '@/utils/brand/org-brand-utils'
import { normalizeCampaignConfig, normalizeCampaignFlowStep } from '@/utils/assessments/campaign-types'
import { resolveCampaignRunnerConfig } from '@/utils/assessments/experience-config'
import {
  getCampaignV2ExperienceConfig,
} from '@/utils/assessments/assessment-experience-config'
import { resolveCampaignJourney, type CampaignJourneyResolved } from '@/utils/assessments/campaign-journey'
import { getAssessmentRuntime } from '@/utils/services/assessment-runtime'
import type { CampaignRuntimeAssessmentStep } from '@/utils/services/assessment-runtime-campaign'
import {
  type RuntimeAssessmentPayload,
  type RuntimeAssessmentPresentation,
  type RuntimeAssessmentQuestion,
  type RuntimeRenderableAssessment,
} from '@/utils/services/assessment-runtime-content'
import type { AssessmentExperienceConfig } from '@/utils/assessments/assessment-experience-config'
import { resolveCampaignOrganisationSlug } from '@/utils/campaign-url'

type InvitationRuntimeAssessmentRelation = RuntimeRenderableAssessment & {
  status: string
}

type InvitationCampaignOrgRelation = {
  id?: string
  name: string
  slug?: string
  branding_config: unknown
}

type InvitationCampaignAssessmentRelation = {
  id: string
  assessment_id: string
  sort_order: number
  is_active: boolean
  assessments: {
    id: string
    key: string
    name: string
    description: string | null
    status: string
    version: number
    runner_config: unknown
    report_config: unknown
  } | {
    id: string
    key: string
    name: string
    description: string | null
    status: string
    version: number
    runner_config: unknown
    report_config: unknown
  }[] | null
}

type InvitationCampaignRelation = {
  id?: string
  slug?: string
  name?: string
  status?: string
  config?: unknown
  runner_overrides?: unknown
  organisation_id?: string | null
  organisations: InvitationCampaignOrgRelation | InvitationCampaignOrgRelation[] | null
  campaign_assessments?: InvitationCampaignAssessmentRelation[] | null
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
  assessment_id: string | null
  assessments:
    | InvitationRuntimeAssessmentRelation
    | InvitationRuntimeAssessmentRelation[]
    | null
  campaigns: InvitationCampaignRelation | InvitationCampaignRelation[] | null
}

type InvitationCampaignRuntime = {
  campaign: {
    id: string
    slug: string
    organisationSlug: string
    name: string
    organisation: string | null
    config: ReturnType<typeof normalizeCampaignConfig>
  }
  assessmentSteps: CampaignRuntimeAssessmentStep[]
  resolvedJourney: CampaignJourneyResolved
  invitationToken: string
  invitationAssessmentId: string
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
        campaignRuntime?: InvitationCampaignRuntime
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
      id, token, status, expires_at, first_name, last_name, organisation, role, assessment_id,
      assessments(id, key, name:external_name, description, status, version, runner_config, report_config),
      campaigns(id, slug, name:external_name, status, config, runner_overrides, organisation_id, organisations(id, name, slug, branding_config), campaign_assessments(id, assessment_id, sort_order, is_active, assessments(id, key, name:external_name, description, status, version, runner_config, report_config)))
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

  // Build campaign runtime when the invitation belongs to an active campaign
  let campaignRuntime: InvitationCampaignRuntime | undefined
  if (
    campaignRelation?.id
    && campaignRelation.status === 'active'
    && campaignRelation.slug
    && campaignRelation.name
  ) {
    const organisationName = orgRelation?.name ?? null
    const organisationSlug = resolveCampaignOrganisationSlug(orgRelation?.slug)
    const campaignAssessmentRows = (campaignRelation.campaign_assessments ?? [])
      .map((ca) => ({
        ...ca,
        assessmentRecord: Array.isArray(ca.assessments) ? (ca.assessments[0] ?? null) : (ca.assessments ?? null),
      }))
      .filter((ca) => ca.is_active && ca.assessmentRecord)
      .sort((a, b) => a.sort_order - b.sort_order)

    const runtimeResults = await Promise.all(
      campaignAssessmentRows.map(async (row) => {
        const assessmentRecord = row.assessmentRecord
        if (!assessmentRecord || assessmentRecord.status !== 'active') return null

        const runtime = await getAssessmentRuntime({
          adminClient,
          assessmentId: assessmentRecord.id,
        })
        if (!runtime.ok) return null

        return {
          campaignAssessmentId: row.id,
          assessment: runtime.data.assessment,
          questions: runtime.data.questions,
          runnerConfig: resolveCampaignRunnerConfig(
            assessmentRecord.runner_config,
            campaignRelation.runner_overrides,
            {
              campaignName: campaignRelation.name!,
              organisationName,
              assessmentName: assessmentRecord.name,
            }
          ),
          reportConfig: runtime.data.reportConfig,
          v2ExperienceConfig: getCampaignV2ExperienceConfig(
            campaignRelation.runner_overrides,
            assessmentRecord.runner_config
          ),
          scale: runtime.data.scale,
        } as CampaignRuntimeAssessmentStep
      })
    )

    const assessmentSteps = runtimeResults.filter(
      (result): result is CampaignRuntimeAssessmentStep => result !== null
    )

    if (assessmentSteps.length > 0) {
      const flowStepResult = await adminClient
        .from('campaign_flow_steps')
        .select('id, campaign_id, step_type, sort_order, is_active, campaign_assessment_id, screen_config, created_at, updated_at')
        .eq('campaign_id', campaignRelation.id)
        .order('sort_order', { ascending: true })

      const campaignAssessments = campaignAssessmentRows.map((row) => ({
        id: row.id,
        campaign_assessment_id: row.id,
        sort_order: row.sort_order,
        is_active: row.is_active,
        assessments: row.assessmentRecord
          ? {
              id: row.assessmentRecord.id,
              name: row.assessmentRecord.name,
              externalName: null,
              description: row.assessmentRecord.description ?? null,
              status: row.assessmentRecord.status,
            }
          : null,
      }))

      const flowSteps = flowStepResult.error
        ? campaignAssessments.map((row, index) =>
            normalizeCampaignFlowStep({
              id: row.id,
              campaign_id: campaignRelation.id!,
              step_type: 'assessment',
              sort_order: index,
              is_active: row.is_active,
              campaign_assessment_id: row.id,
              screen_config: {},
              created_at: '',
              updated_at: '',
            })
          )
        : (flowStepResult.data ?? []).map((row) => normalizeCampaignFlowStep(row))

      const primaryAssessment = campaignAssessmentRows[0]?.assessmentRecord ?? null

      const skipDemographics = !normalizedCampaignConfig.invitation_demographics_enabled

      const resolvedJourney = resolveCampaignJourney({
        campaignName: campaignRelation.name,
        organisationName,
        campaignConfig: normalizedCampaignConfig,
        runnerOverrides: campaignRelation.runner_overrides,
        assessmentRunnerConfig: primaryAssessment?.runner_config,
        assessmentReportConfig: primaryAssessment?.report_config,
        flowSteps,
        campaignAssessments,
        skipRegistration: true,
        skipDemographics,
        demographicsPositionOverride: skipDemographics ? undefined : 'after',
      })

      campaignRuntime = {
        campaign: {
          id: campaignRelation.id,
          slug: campaignRelation.slug,
          organisationSlug,
          name: campaignRelation.name,
          organisation: organisationName,
          config: normalizedCampaignConfig,
        },
        assessmentSteps,
        resolvedJourney,
        invitationToken: input.token,
        invitationAssessmentId: invitation.assessment_id ?? assessment.id,
      }
    }
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
      campaignRuntime,
    },
  }
}
