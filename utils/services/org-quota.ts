import type { SupabaseClient } from '@supabase/supabase-js'

export type AssessmentQuotaStatus = {
  assessment_id: string
  used: number
  limit: number | null
  is_exceeded: boolean
}

async function getCampaignIdsForOrg(adminClient: SupabaseClient, organisationId: string): Promise<string[]> {
  const { data } = await adminClient.from('campaigns').select('id').eq('organisation_id', organisationId)
  return ((data ?? []) as Array<{ id: string }>).map((row) => row.id)
}

export async function getOrgAssessmentQuotaStatus(
  adminClient: SupabaseClient,
  organisationId: string,
  assessmentId: string
): Promise<AssessmentQuotaStatus | null> {
  const { data: accessRow } = await adminClient
    .from('organisation_assessment_access')
    .select('assessment_quota')
    .eq('organisation_id', organisationId)
    .eq('assessment_id', assessmentId)
    .maybeSingle()

  if (!accessRow) return null

  const campaignIds = await getCampaignIdsForOrg(adminClient, organisationId)

  let used = 0
  if (campaignIds.length > 0) {
    const { count } = await adminClient
      .from('assessment_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('assessment_id', assessmentId)
      .in('campaign_id', campaignIds)
    used = count ?? 0
  }

  const limit = (accessRow as { assessment_quota: number | null }).assessment_quota ?? null
  return {
    assessment_id: assessmentId,
    used,
    limit,
    is_exceeded: limit !== null && used >= limit,
  }
}

// Resolves organisation_id from the campaign, then delegates to getOrgAssessmentQuotaStatus.
// Returns null if the campaign has no owning organisation (public campaigns have no org quota).
export async function getOrgAssessmentQuotaStatusForCampaign(
  adminClient: SupabaseClient,
  campaignId: string,
  assessmentId: string
): Promise<AssessmentQuotaStatus | null> {
  const { data: campaign } = await adminClient
    .from('campaigns')
    .select('organisation_id')
    .eq('id', campaignId)
    .maybeSingle()

  const organisationId = (campaign as { organisation_id: string | null } | null)?.organisation_id ?? null
  if (!organisationId) return null

  return getOrgAssessmentQuotaStatus(adminClient, organisationId, assessmentId)
}

export async function getOrgAllAssessmentQuotaStatuses(
  adminClient: SupabaseClient,
  organisationId: string
): Promise<AssessmentQuotaStatus[]> {
  const { data: accessRows, error: accessError } = await adminClient
    .from('organisation_assessment_access')
    .select('assessment_id, assessment_quota')
    .eq('organisation_id', organisationId)

  if (accessError || !accessRows || accessRows.length === 0) {
    return []
  }

  const typedRows = accessRows as Array<{ assessment_id: string; assessment_quota: number | null }>
  const assessmentIds = typedRows.map((r) => r.assessment_id)

  const campaignIds = await getCampaignIdsForOrg(adminClient, organisationId)

  const usageByAssessment = new Map<string, number>()
  if (campaignIds.length > 0) {
    const { data: invitations } = await adminClient
      .from('assessment_invitations')
      .select('assessment_id')
      .in('campaign_id', campaignIds)
      .in('assessment_id', assessmentIds)

    for (const inv of (invitations ?? []) as Array<{ assessment_id: string }>) {
      usageByAssessment.set(inv.assessment_id, (usageByAssessment.get(inv.assessment_id) ?? 0) + 1)
    }
  }

  return typedRows.map((row) => {
    const used = usageByAssessment.get(row.assessment_id) ?? 0
    const limit = row.assessment_quota ?? null
    return {
      assessment_id: row.assessment_id,
      used,
      limit,
      is_exceeded: limit !== null && used >= limit,
    }
  })
}
