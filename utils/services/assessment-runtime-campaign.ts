import type { CampaignConfig } from '@/utils/assessments/campaign-types'
import {
  normalizeReportConfig,
  resolveCampaignRunnerConfig,
} from '@/utils/assessments/experience-config'
import { loadPublicCampaignRuntimeContext } from '@/utils/services/assessment-campaign-context'
import {
  loadAssessmentRuntimeQuestions,
  type RuntimeAssessmentPayload,
  type RuntimeAssessmentQuestion,
  toRuntimeAssessmentPayload,
} from '@/utils/services/assessment-runtime-content'

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
          name: string
          organisation: string | null
          config: CampaignConfig
        }
        assessment: RuntimeAssessmentPayload
        questions: RuntimeAssessmentQuestion[]
        runnerConfig: ReturnType<typeof resolveCampaignRunnerConfig>
        reportConfig: ReturnType<typeof normalizeReportConfig>
      }
    }
  | RuntimeCampaignFailure

export async function getAssessmentRuntimeCampaign(input: {
  slug: string
}): Promise<GetAssessmentRuntimeCampaignResult> {
  const context = await loadPublicCampaignRuntimeContext(input.slug)
  if (!context.ok) {
    return { ok: false, error: context.error }
  }

  if (!context.primaryAssessment || context.primaryAssessment.status !== 'active') {
    return { ok: false, error: 'assessment_not_active' }
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
        slug: context.campaign.slug ?? input.slug,
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
    },
  }
}
