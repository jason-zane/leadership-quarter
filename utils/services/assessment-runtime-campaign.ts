import type { CampaignConfig } from '@/utils/assessments/campaign-types'
import { normalizeCampaignFlowStep } from '@/utils/assessments/campaign-types'
import {
  normalizeReportConfig,
  resolveCampaignRunnerConfig,
} from '@/utils/assessments/experience-config'
import { resolveCampaignJourney, type CampaignJourneyResolved } from '@/utils/assessments/campaign-journey'
import { loadPublicCampaignRuntimeContext } from '@/utils/services/assessment-campaign-context'
import { getAssessmentRuntime } from '@/utils/services/assessment-runtime'
import type { RuntimeAssessmentPayload, RuntimeAssessmentQuestion } from '@/utils/services/assessment-runtime-content'
import {
  getCampaignV2ExperienceConfig,
  type AssessmentV2ExperienceConfig,
} from '@/utils/assessments/assessment-experience-config'

type RuntimeCampaignFailure = {
  ok: false
  error:
    | 'missing_service_role'
    | 'campaign_not_found'
    | 'campaign_not_active'
    | 'campaign_limit_reached'
    | 'assessment_not_active'
    | 'questions_load_failed'
}

export type CampaignRuntimeAssessmentStep = {
  campaignAssessmentId: string
  assessment: RuntimeAssessmentPayload
  questions: RuntimeAssessmentQuestion[]
  runnerConfig: ReturnType<typeof resolveCampaignRunnerConfig>
  reportConfig: ReturnType<typeof normalizeReportConfig>
  v2ExperienceConfig?: AssessmentV2ExperienceConfig
  scale: { points: number; labels: string[] }
}

export type GetAssessmentRuntimeCampaignResult =
  | {
      ok: true
      data: {
        context: 'campaign'
        campaign: {
          id: string
          slug: string
          organisationSlug: string
          name: string
          organisation: string | null
          config: CampaignConfig
        }
        runnerConfig: ReturnType<typeof resolveCampaignRunnerConfig>
        reportConfig: ReturnType<typeof normalizeReportConfig>
        v2ExperienceConfig?: AssessmentV2ExperienceConfig
        assessmentSteps: CampaignRuntimeAssessmentStep[]
        resolvedJourney: CampaignJourneyResolved
      }
    }
  | RuntimeCampaignFailure

export async function getAssessmentRuntimeCampaign(input: {
  organisationSlug: string
  campaignSlug: string
}): Promise<GetAssessmentRuntimeCampaignResult> {
  const context = await loadPublicCampaignRuntimeContext({
    organisationSlug: input.organisationSlug,
    campaignSlug: input.campaignSlug,
  })
  if (!context.ok) {
    return { ok: false, error: context.error }
  }

  if (!context.primaryAssessment || context.primaryAssessment.status !== 'active') {
    return { ok: false, error: 'assessment_not_active' }
  }

  const runtimeAssessmentRows = (context.campaign.campaign_assessments ?? [])
    .map((assessment) => ({
      ...assessment,
      assessmentRecord: Array.isArray(assessment.assessments) ? null : (assessment.assessments ?? null),
    }))
    .filter((assessment) => assessment.is_active && assessment.assessmentRecord)
    .sort((a, b) => a.sort_order - b.sort_order)

  const runtimeResults = await Promise.all(
    runtimeAssessmentRows.map(async (row) => {
      const assessment = row.assessmentRecord
      if (!assessment || assessment.status !== 'active') {
        return null
      }

      const runtime = await getAssessmentRuntime({
        adminClient: context.adminClient,
        assessmentId: assessment.id,
      })
      if (!runtime.ok) {
        return { ok: false as const, error: runtime.error }
      }

      return {
        ok: true as const,
        data: {
          campaignAssessmentId: row.id,
          assessment: runtime.data.assessment,
          questions: runtime.data.questions,
          runnerConfig: resolveCampaignRunnerConfig(
            assessment.runner_config,
            context.campaign.runner_overrides,
            {
              campaignName: context.campaign.name,
              organisationName: context.organisationName,
              assessmentName: assessment.name,
            }
          ),
          reportConfig: runtime.data.reportConfig,
          v2ExperienceConfig: getCampaignV2ExperienceConfig(
            context.campaign.runner_overrides,
            assessment.runner_config
          ),
          scale: runtime.data.scale,
        },
      }
    })
  )

  const failedRuntime = runtimeResults.find((result) => result && !result.ok)
  if (failedRuntime && !failedRuntime.ok) {
    return { ok: false, error: failedRuntime.error === 'assessment_not_found' ? 'assessment_not_active' : failedRuntime.error }
  }

  const assessmentSteps = runtimeResults
    .filter((result): result is Exclude<typeof result, null> => Boolean(result))
    .filter((result): result is Extract<NonNullable<typeof result>, { ok: true }> => result.ok)
    .map((result) => result.data)

  const primaryRuntime = assessmentSteps[0]
  if (!primaryRuntime) {
    return { ok: false, error: 'assessment_not_active' }
  }

  const flowStepResult = await context.adminClient
    .from('campaign_flow_steps')
    .select('id, campaign_id, step_type, sort_order, is_active, campaign_assessment_id, screen_config, created_at, updated_at')
    .eq('campaign_id', context.campaign.id)
    .order('sort_order', { ascending: true })

  const campaignAssessments = runtimeAssessmentRows.map((row) => ({
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
          campaign_id: context.campaign.id,
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

  return {
    ok: true,
    data: {
      context: 'campaign',
      campaign: {
        id: context.campaign.id,
        slug: context.campaign.slug ?? input.campaignSlug,
        organisationSlug: context.organisationSlug,
        name: context.campaign.name,
        organisation: context.organisationName,
        config: context.campaign.config,
      },
      runnerConfig: resolveCampaignRunnerConfig(
        context.primaryAssessment.runner_config,
        context.campaign.runner_overrides,
        {
          campaignName: context.campaign.name,
          organisationName: context.organisationName,
          assessmentName: context.primaryAssessment.name,
        }
      ),
      reportConfig: primaryRuntime.reportConfig,
      v2ExperienceConfig: getCampaignV2ExperienceConfig(
        context.campaign.runner_overrides,
        context.primaryAssessment.runner_config
      ),
      assessmentSteps,
      resolvedJourney: resolveCampaignJourney({
        campaignName: context.campaign.name,
        organisationName: context.organisationName,
        campaignConfig: context.campaign.config,
        runnerOverrides: context.campaign.runner_overrides,
        assessmentRunnerConfig: context.primaryAssessment.runner_config,
        assessmentReportConfig: context.primaryAssessment.report_config,
        flowSteps,
        campaignAssessments,
      }),
    },
  }
}
