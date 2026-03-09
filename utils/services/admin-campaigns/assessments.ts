import type {
  AdminClient,
  CampaignAssessmentPayload,
} from '@/utils/services/admin-campaigns/types'

export async function addAdminCampaignAssessment(input: {
  adminClient: AdminClient
  campaignId: string
  payload: CampaignAssessmentPayload | null
}): Promise<
  | {
      ok: true
      data: {
        assessment: unknown
      }
    }
  | {
      ok: false
      error: 'survey_id_required' | 'assessment_already_added' | 'add_assessment_failed'
    }
> {
  const assessmentId = String(
    input.payload?.assessment_id ?? input.payload?.survey_id ?? ''
  ).trim()
  if (!assessmentId) {
    return { ok: false, error: 'survey_id_required' }
  }

  const { data, error } = await input.adminClient
    .from('campaign_assessments')
    .insert({
      campaign_id: input.campaignId,
      assessment_id: assessmentId,
      sort_order: input.payload?.sort_order ?? 0,
      report_overrides: input.payload?.report_overrides ?? {},
    })
    .select('id, campaign_id, assessment_id, sort_order, is_active, report_overrides, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'assessment_already_added' }
    }

    return { ok: false, error: 'add_assessment_failed' }
  }

  return {
    ok: true,
    data: {
      assessment: data,
    },
  }
}

export async function updateAdminCampaignAssessment(input: {
  adminClient: AdminClient
  campaignId: string
  campaignAssessmentId: string
  payload: CampaignAssessmentPayload | null
}): Promise<
  | {
      ok: true
      data: {
        assessment: unknown
      }
    }
  | {
      ok: false
      error: 'invalid_payload' | 'update_assessment_failed'
    }
> {
  if (!input.payload || input.payload.report_overrides === undefined) {
    return { ok: false, error: 'invalid_payload' }
  }

  const { data, error } = await input.adminClient
    .from('campaign_assessments')
    .update({
      report_overrides: input.payload.report_overrides,
    })
    .eq('id', input.campaignAssessmentId)
    .eq('campaign_id', input.campaignId)
    .select('id, campaign_id, assessment_id, sort_order, is_active, report_overrides, created_at')
    .maybeSingle()

  if (error || !data) {
    return { ok: false, error: 'update_assessment_failed' }
  }

  return {
    ok: true,
    data: {
      assessment: data,
    },
  }
}

export async function removeAdminCampaignAssessment(input: {
  adminClient: AdminClient
  campaignId: string
  campaignAssessmentId: string
}): Promise<
  | { ok: true }
  | {
      ok: false
      error: 'remove_assessment_failed'
    }
> {
  const { error } = await input.adminClient
    .from('campaign_assessments')
    .delete()
    .eq('id', input.campaignAssessmentId)
    .eq('campaign_id', input.campaignId)

  if (error) {
    return { ok: false, error: 'remove_assessment_failed' }
  }

  return { ok: true }
}
