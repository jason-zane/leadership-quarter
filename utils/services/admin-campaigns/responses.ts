import {
  getSummaryScore,
  pickRelation,
} from '@/utils/services/admin-campaigns/shared'
import type {
  AdminClient,
  CampaignResponseInvitation,
  CampaignResponseScoreMap,
} from '@/utils/services/admin-campaigns/types'

export async function listAdminCampaignResponses(input: {
  adminClient: AdminClient
  campaignId: string
}): Promise<
  | {
      ok: true
      data: {
        responses: unknown[]
      }
    }
  | {
      ok: false
      error: 'responses_list_failed'
    }
> {
  const { data, error } = await input.adminClient
    .from('assessment_submissions')
    .select(
      `
      id, assessment_id, created_at, demographics, scores,
      assessments(id, name, key),
      assessment_invitations!survey_submissions_invitation_id_fkey(status, completed_at, first_name, last_name, email, organisation, role)
    `
    )
    .eq('campaign_id', input.campaignId)
    .order('created_at', { ascending: false })

  if (error) {
    return { ok: false, error: 'responses_list_failed' }
  }

  const responses = (data ?? []).map((row) => {
    const invitation = pickRelation(
      row.assessment_invitations as
        | CampaignResponseInvitation
        | CampaignResponseInvitation[]
        | null
    )

    return {
      id: row.id,
      assessment_id: row.assessment_id,
      status: invitation?.status ?? 'completed',
      score: getSummaryScore((row.scores as CampaignResponseScoreMap | null) ?? null),
      created_at: row.created_at,
      completed_at: invitation?.completed_at ?? null,
      demographics: (row.demographics as Record<string, string> | null) ?? null,
      assessments: row.assessments,
      assessment_invitations: invitation
        ? {
            first_name: invitation.first_name ?? '',
            last_name: invitation.last_name ?? '',
            email: invitation.email ?? '',
            organisation: invitation.organisation,
            role: invitation.role,
          }
        : null,
    }
  })

  return {
    ok: true,
    data: {
      responses,
    },
  }
}
