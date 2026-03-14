import type { CampaignConfig } from '@/utils/assessments/campaign-types'
import {
  normalizeReportConfig,
  resolveCampaignRunnerConfig,
} from '@/utils/assessments/experience-config'
import { shouldUseV2Runtime } from '@/utils/assessments/v2-runtime'
import { loadPublicCampaignRuntimeContext } from '@/utils/services/assessment-campaign-context'
import { getAssessmentV2Runtime } from '@/utils/services/assessment-runtime-v2'
import {
  loadAssessmentRuntimeQuestions,
  type RuntimeAssessmentPayload,
  type RuntimeAssessmentQuestion,
  toRuntimeAssessmentPayload,
} from '@/utils/services/assessment-runtime-content'
import {
  getAssessmentV2ExperienceConfig,
  type AssessmentV2ExperienceConfig,
} from '@/utils/assessments/v2-experience-config'

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
        assessment: RuntimeAssessmentPayload
        questions: RuntimeAssessmentQuestion[]
        runnerConfig: ReturnType<typeof resolveCampaignRunnerConfig>
        reportConfig: ReturnType<typeof normalizeReportConfig>
        v2ExperienceConfig?: AssessmentV2ExperienceConfig
        scale: { points: number; labels: string[] }
      }
    }
  | RuntimeCampaignFailure

export async function getAssessmentRuntimeCampaign(input: {
  organisationSlug: string
  campaignSlug: string
  forceV2?: boolean
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

  if (shouldUseV2Runtime(context.primaryAssessment.report_config, { forceV2: input.forceV2 })) {
    const v2Runtime = await getAssessmentV2Runtime({
      adminClient: context.adminClient,
      assessmentId: context.primaryAssessment.id,
    })
    if (!v2Runtime.ok) {
      return { ok: false, error: v2Runtime.error === 'assessment_not_found' ? 'assessment_not_active' : v2Runtime.error }
    }

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
        assessment: v2Runtime.data.assessment,
        questions: v2Runtime.data.questions,
        runnerConfig: resolveCampaignRunnerConfig(
          context.primaryAssessment.runner_config,
          context.campaign.runner_overrides,
          {
            campaignName: context.campaign.name,
            organisationName: context.organisationName,
            assessmentName: context.primaryAssessment.name,
          }
        ),
        reportConfig: v2Runtime.data.reportConfig,
        v2ExperienceConfig: getAssessmentV2ExperienceConfig(context.primaryAssessment.runner_config),
        scale: v2Runtime.data.scale,
      },
    }
  }

  const questionResult = await loadAssessmentRuntimeQuestions(
    context.adminClient,
    context.primaryAssessment.id
  )
  if (!questionResult.ok) {
    return questionResult
  }

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
      assessment: toRuntimeAssessmentPayload(context.primaryAssessment),
      questions: questionResult.questions,
      runnerConfig: resolveCampaignRunnerConfig(
        context.primaryAssessment.runner_config,
        context.campaign.runner_overrides,
        {
          campaignName: context.campaign.name,
          organisationName: context.organisationName,
          assessmentName: context.primaryAssessment.name,
        }
      ),
      reportConfig: normalizeReportConfig(context.primaryAssessment.report_config),
      v2ExperienceConfig: getAssessmentV2ExperienceConfig(context.primaryAssessment.runner_config),
      scale: {
        points: 5,
        labels: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'],
      },
    },
  }
}
