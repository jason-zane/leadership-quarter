import type { SupabaseClient } from '@supabase/supabase-js'

export type AssessmentQuotaStatus = {
  assessment_id: string
  access_id: string | null
  assessment_name: string | null
  assessment_key: string | null
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
    .select('id, assessment_quota')
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

  const typedAccessRow = accessRow as { id: string; assessment_quota: number | null }
  const limit = typedAccessRow.assessment_quota ?? null
  return {
    assessment_id: assessmentId,
    access_id: typedAccessRow.id,
    assessment_name: null,
    assessment_key: null,
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

// ---------------------------------------------------------------------------
// Campaign-level assessment quota
// ---------------------------------------------------------------------------

export type CampaignAssessmentQuotaStatus = {
  campaign_assessment_id: string
  assessment_id: string
  used: number
  limit: number | null
  is_exceeded: boolean
}

export async function getCampaignAssessmentQuotaStatuses(
  adminClient: SupabaseClient,
  campaignId: string
): Promise<CampaignAssessmentQuotaStatus[]> {
  const { data: caRows } = await adminClient
    .from('campaign_assessments')
    .select('id, assessment_id, assessment_quota')
    .eq('campaign_id', campaignId)

  const rows = (caRows ?? []) as Array<{ id: string; assessment_id: string; assessment_quota: number | null }>
  if (rows.length === 0) return []

  const assessmentIds = rows.map((r) => r.assessment_id)
  const { data: invitations } = await adminClient
    .from('assessment_invitations')
    .select('assessment_id')
    .eq('campaign_id', campaignId)
    .in('assessment_id', assessmentIds)

  const usageByAssessment = new Map<string, number>()
  for (const inv of (invitations ?? []) as Array<{ assessment_id: string }>) {
    usageByAssessment.set(inv.assessment_id, (usageByAssessment.get(inv.assessment_id) ?? 0) + 1)
  }

  return rows.map((row) => {
    const used = usageByAssessment.get(row.assessment_id) ?? 0
    const limit = row.assessment_quota ?? null
    return {
      campaign_assessment_id: row.id,
      assessment_id: row.assessment_id,
      used,
      limit,
      is_exceeded: limit !== null && used >= limit,
    }
  })
}

// Single-assessment variant used for enforcement in registration and admin invitation creation.
export async function getCampaignAssessmentQuotaStatus(
  adminClient: SupabaseClient,
  campaignId: string,
  assessmentId: string
): Promise<CampaignAssessmentQuotaStatus | null> {
  const { data: caRow } = await adminClient
    .from('campaign_assessments')
    .select('id, assessment_quota')
    .eq('campaign_id', campaignId)
    .eq('assessment_id', assessmentId)
    .maybeSingle()

  if (!caRow) return null
  const row = caRow as { id: string; assessment_quota: number | null }

  const limit = row.assessment_quota ?? null
  if (limit === null) {
    return { campaign_assessment_id: row.id, assessment_id: assessmentId, used: 0, limit: null, is_exceeded: false }
  }

  const { count } = await adminClient
    .from('assessment_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
    .eq('assessment_id', assessmentId)

  const used = count ?? 0
  return {
    campaign_assessment_id: row.id,
    assessment_id: assessmentId,
    used,
    limit,
    is_exceeded: used >= limit,
  }
}

// ---------------------------------------------------------------------------
// Org-level assessment quota (bulk)
// ---------------------------------------------------------------------------

export async function getOrgAllAssessmentQuotaStatuses(
  adminClient: SupabaseClient,
  organisationId: string
): Promise<AssessmentQuotaStatus[]> {
  const { data: accessRows, error: accessError } = await adminClient
    .from('organisation_assessment_access')
    .select('id, assessment_id, assessment_quota, assessments(name, key)')
    .eq('organisation_id', organisationId)

  if (accessError || !accessRows || accessRows.length === 0) {
    return []
  }

  type AccessRowWithAssessment = {
    id: string
    assessment_id: string
    assessment_quota: number | null
    assessments: { name: string; key: string } | Array<{ name: string; key: string }> | null
  }
  const typedRows = accessRows as AccessRowWithAssessment[]
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
    const assessmentData = Array.isArray(row.assessments) ? (row.assessments[0] ?? null) : (row.assessments ?? null)
    return {
      assessment_id: row.assessment_id,
      access_id: row.id,
      assessment_name: assessmentData?.name ?? null,
      assessment_key: assessmentData?.key ?? null,
      used,
      limit,
      is_exceeded: limit !== null && used >= limit,
    }
  })
}
