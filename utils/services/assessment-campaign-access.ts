import type { CampaignConfig } from '@/utils/assessments/campaign-types'
import {
  getAccessibleCampaignAssessments,
  loadPublicCampaignContext,
} from '@/utils/services/assessment-campaign-context'

type AssessmentCampaignAccessFailure = {
  ok: false
  error:
    | 'missing_service_role'
    | 'campaign_not_found'
    | 'campaign_not_active'
    | 'campaign_limit_reached'
    | 'survey_not_active'
}

export type GetAssessmentCampaignResult =
  | {
      ok: true
      data: {
        campaign: {
          id: string
          name: string
          slug: string
          config: CampaignConfig
          organisation: string | null
        }
        assessments: Array<{
          id: string
          assessment: {
            id: string
            key: string
            name: string
            description: string | null
          }
          survey: {
            id: string
            key: string
            name: string
            description: string | null
          }
        }>
        assessment: {
          id: string
          key: string
          name: string
          description: string | null
        }
        survey: {
          id: string
          key: string
          name: string
          description: string | null
        }
      }
    }
  | AssessmentCampaignAccessFailure

export async function getAssessmentCampaign(input: {
  slug: string
}): Promise<GetAssessmentCampaignResult> {
  const context = await loadPublicCampaignContext(input.slug)
  if (!context.ok) {
    return { ok: false, error: context.error }
  }

  const assessments = getAccessibleCampaignAssessments(context.campaign)
  if (assessments.length === 0) {
    return { ok: false, error: 'survey_not_active' }
  }

  const firstAssessment = assessments[0]

  return {
    ok: true,
    data: {
      campaign: {
        id: context.campaign.id,
        name: context.campaign.name,
        slug: context.campaign.slug ?? input.slug,
        config: context.campaign.config,
        organisation: context.organisationName,
      },
      assessments,
      assessment: firstAssessment.assessment,
      survey: firstAssessment.survey,
    },
  }
}
