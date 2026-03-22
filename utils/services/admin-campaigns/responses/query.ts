import { listAdminCampaignFlowSteps } from '@/utils/services/admin-campaigns/flow-steps'
import { pickRelation } from '@/utils/services/participant-identity'
import type { AdminClient } from '@/utils/services/admin-campaigns/types'
import type { CampaignFlowStep, SubmissionRow } from './types'

export async function loadCampaignSubmissions(adminClient: AdminClient, campaignId: string) {
  const { data, error } = await adminClient
    .from('assessment_submissions')
    .select(
      `
      id, invitation_id, campaign_id, assessment_id, created_at, first_name, last_name, email, organisation, role,
      demographics, scores, bands, classification, recommendations, responses, normalized_responses, report_token,
      assessments(id, key, name:external_name, status, report_config),
      assessment_invitations!survey_submissions_invitation_id_fkey(id, status, completed_at, first_name, last_name, email, organisation, role)
    `
    )
    .eq('campaign_id', campaignId)
    .eq('is_preview_sample', false)
    .order('created_at', { ascending: false })

  if (error) {
    return { ok: false as const, error: 'responses_list_failed' as const }
  }

  return {
    ok: true as const,
    rows: (data ?? []) as SubmissionRow[],
  }
}

export async function loadFlowSteps(adminClient: AdminClient, campaignId: string) {
  const result = await listAdminCampaignFlowSteps({
    adminClient,
    campaignId,
  })

  return result.ok ? result.data.flowSteps : ([] as CampaignFlowStep[])
}

export async function loadCampaignAssessmentMap(adminClient: AdminClient, campaignId: string) {
  const { data, error } = await adminClient
    .from('campaign_assessments')
    .select('id, assessment_id, assessments(id, key, name:external_name)')
    .eq('campaign_id', campaignId)

  if (error) {
    return new Map<string, { assessmentId: string; assessment: { id: string; key: string; name: string } | null }>()
  }

  return new Map(
    (data ?? []).map((row) => {
      const assessment = pickRelation(row.assessments as
        | { id: string; key: string; name: string }
        | Array<{ id: string; key: string; name: string }>
        | null)
      return [
        row.id as string,
        {
          assessmentId: row.assessment_id as string,
          assessment: assessment
            ? {
                id: assessment.id,
                key: assessment.key,
                name: assessment.name,
              }
            : null,
        },
      ] as const
    })
  )
}
