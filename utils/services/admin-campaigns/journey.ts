import { resolveCampaignJourney } from '@/utils/assessments/campaign-journey'
import {
  DEFAULT_CAMPAIGN_SCREEN_STEP_CONFIG,
  normalizeCampaignConfig,
  normalizeCampaignFlowStep,
} from '@/utils/assessments/campaign-types'
import type {
  AdminClient,
  CampaignFlowStepPayload,
} from '@/utils/services/admin-campaigns/types'

function isMissingFlowStepsTable(error: { message?: string; details?: string | null; hint?: string | null } | null | undefined) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase()
  return text.includes('campaign_flow_steps') && (text.includes('relation') || text.includes('table') || text.includes('schema'))
}

export async function listAdminCampaignResolvedFlowSteps(input: {
  adminClient: AdminClient
  campaignId: string
  campaignAssessments: Array<{
    id: string
    sort_order: number
    is_active: boolean
  }>
}) {
  const result = await input.adminClient
    .from('campaign_flow_steps')
    .select('id, campaign_id, step_type, sort_order, is_active, campaign_assessment_id, screen_config, created_at, updated_at')
    .eq('campaign_id', input.campaignId)
    .order('sort_order', { ascending: true })

  if (!result.error) {
    return {
      ok: true as const,
      flowSteps: (result.data ?? []).map((row) => normalizeCampaignFlowStep(row)),
      flowStepsBackedByTable: true,
    }
  }

  if (!isMissingFlowStepsTable(result.error)) {
    return {
      ok: false as const,
      error: 'flow_steps_list_failed' as const,
    }
  }

  return {
    ok: true as const,
    flowSteps: input.campaignAssessments
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((row) =>
        normalizeCampaignFlowStep({
          id: row.id,
          campaign_id: input.campaignId,
          step_type: 'assessment',
          sort_order: row.sort_order,
          is_active: row.is_active,
          campaign_assessment_id: row.id,
          screen_config: DEFAULT_CAMPAIGN_SCREEN_STEP_CONFIG,
          created_at: '',
          updated_at: '',
        } satisfies CampaignFlowStepPayload & {
          id: string
          campaign_id: string
          created_at: string
          updated_at: string
        })
      ),
    flowStepsBackedByTable: false,
  }
}

export async function resolveAdminCampaignJourney(input: {
  adminClient: AdminClient
  campaignId: string
  campaign: {
    name: string
    runner_overrides?: unknown
    config: unknown
    organisations?: { name?: string | null } | Array<{ name?: string | null }> | null
    campaign_assessments?: Array<{
      id: string
      sort_order: number
      is_active: boolean
      assessments?: {
        name?: string | null
        external_name?: string | null
        description?: string | null
        status?: string | null
        runner_config?: unknown
        report_config?: unknown
      } | null
    }> | null
  }
}) {
  const campaignAssessments = (input.campaign.campaign_assessments ?? []).map((row) => ({
    id: row.id,
    campaign_assessment_id: row.id,
    sort_order: row.sort_order,
    is_active: row.is_active,
    assessments: row.assessments
      ? {
          id: row.id,
          name: row.assessments.name ?? row.assessments.external_name ?? 'Assessment',
          externalName: row.assessments.external_name ?? null,
          description: row.assessments.description ?? null,
          status: row.assessments.status ?? 'draft',
        }
      : null,
  }))

  const flowResult = await listAdminCampaignResolvedFlowSteps({
    adminClient: input.adminClient,
    campaignId: input.campaignId,
    campaignAssessments,
  })

  if (!flowResult.ok) {
    return flowResult
  }

  const primaryAssessment = campaignAssessments
    .filter((assessment) => assessment.is_active && assessment.assessments)
    .sort((a, b) => a.sort_order - b.sort_order)[0]
  const primarySource = (input.campaign.campaign_assessments ?? [])
    .find((assessment) => assessment.id === primaryAssessment?.id)

  return {
    ok: true as const,
    data: {
      flowSteps: flowResult.flowSteps,
      flowStepsBackedByTable: flowResult.flowStepsBackedByTable,
      resolvedJourney: resolveCampaignJourney({
        campaignName: input.campaign.name,
        organisationName: Array.isArray(input.campaign.organisations)
          ? (input.campaign.organisations[0]?.name ?? null)
          : (input.campaign.organisations?.name ?? null),
        campaignConfig: normalizeCampaignConfig(input.campaign.config),
        runnerOverrides: input.campaign.runner_overrides,
        assessmentRunnerConfig: primarySource?.assessments?.runner_config,
        assessmentReportConfig: primarySource?.assessments?.report_config,
        flowSteps: flowResult.flowSteps,
        campaignAssessments,
      }),
    },
  }
}
