import type { SupabaseClient } from '@supabase/supabase-js'

type ScoreMap = Record<string, unknown>

type CampaignRow = {
  id: string
  name: string
  status: string
}

type OverviewSubmissionRow = {
  id: string
  campaign_id: string
  created_at: string
  scores: ScoreMap | null
  classification: { label?: string } | null
  assessments: unknown
  assessment_invitations:
    | { first_name: string | null; last_name: string | null; email: string | null }
    | Array<{ first_name: string | null; last_name: string | null; email: string | null }>
    | null
}

export type PortalOverviewResult =
  | {
      ok: true
      data: {
        metrics: {
          campaigns_total: number
          campaigns_active: number
          invitations_total: number
          submissions_total: number
          average_score: number | null
        }
        campaigns_by_status: {
          draft: number
          active: number
          closed: number
          archived: number
        }
        recent_results: Array<{
          submission_id: string
          campaign_id: string
          campaign_name: string
          participant_name: string
          email: string
          assessment: unknown
          classification_label: string
          summary_score: number | null
          created_at: string
        }>
        warning?: 'partial_overview'
      }
    }
  | {
      ok: false
      error: 'internal_error'
      message: string
    }

function getSummaryScore(scores: ScoreMap | null): number | null {
  if (!scores) return null

  const values = Object.values(scores)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
  if (values.length === 0) return null

  const avg = values.reduce((acc, value) => acc + value, 0) / values.length
  return Math.round(avg * 10) / 10
}

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function getCampaignsByStatus(campaignRows: CampaignRow[]) {
  return {
    draft: campaignRows.filter((row) => row.status === 'draft').length,
    active: campaignRows.filter((row) => row.status === 'active').length,
    closed: campaignRows.filter((row) => row.status === 'closed').length,
    archived: campaignRows.filter((row) => row.status === 'archived').length,
  }
}

export async function getPortalOverview(input: {
  adminClient: SupabaseClient
  organisationId: string
}): Promise<PortalOverviewResult> {
  const { data: campaigns, error: campaignsError } = await input.adminClient
    .from('campaigns')
    .select('id, name:external_name, status')
    .eq('organisation_id', input.organisationId)
    .order('created_at', { ascending: false })

  if (campaignsError) {
    return {
      ok: false,
      error: 'internal_error',
      message: 'Failed to load portal overview.',
    }
  }

  const campaignRows = (campaigns ?? []) as CampaignRow[]
  const campaignsByStatus = getCampaignsByStatus(campaignRows)
  const campaignIds = campaignRows.map((row) => row.id)
  const campaignNameById = new Map(campaignRows.map((row) => [row.id, row.name]))

  if (campaignIds.length === 0) {
    return {
      ok: true,
      data: {
        metrics: {
          campaigns_total: 0,
          campaigns_active: 0,
          invitations_total: 0,
          submissions_total: 0,
          average_score: null,
        },
        campaigns_by_status: campaignsByStatus,
        recent_results: [],
      },
    }
  }

  const [
    { data: invitationRows, error: invitationError },
    { data: submissionRows, error: submissionError },
    { count: submissionCount, error: submissionCountError },
  ] = await Promise.all([
    input.adminClient.from('assessment_invitations').select('id').in('campaign_id', campaignIds),
    input.adminClient
      .from('assessment_submissions')
      .select(
        'id, campaign_id, created_at, scores, classification, assessments(id, key, name:external_name), assessment_invitations!survey_submissions_invitation_id_fkey(first_name, last_name, email)'
      )
      .in('campaign_id', campaignIds)
      .eq('is_preview_sample', false)
      .order('created_at', { ascending: false })
      .limit(10),
    input.adminClient
      .from('assessment_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('is_preview_sample', false)
      .in('campaign_id', campaignIds),
  ])

  if (invitationError || submissionError || submissionCountError) {
    return {
      ok: true,
      data: {
        warning: 'partial_overview',
        metrics: {
          campaigns_total: campaignRows.length,
          campaigns_active: campaignsByStatus.active,
          invitations_total: 0,
          submissions_total: 0,
          average_score: null,
        },
        campaigns_by_status: campaignsByStatus,
        recent_results: [],
      },
    }
  }

  const recentResults = ((submissionRows ?? []) as OverviewSubmissionRow[]).map((row) => {
    const invitation = pickRelation(row.assessment_invitations)
    return {
      submission_id: row.id,
      campaign_id: row.campaign_id,
      campaign_name: campaignNameById.get(row.campaign_id) ?? 'Unknown campaign',
      participant_name:
        [invitation?.first_name ?? null, invitation?.last_name ?? null]
          .filter(Boolean)
          .join(' ') || '—',
      email: invitation?.email ?? '—',
      assessment: row.assessments,
      classification_label: row.classification?.label ?? '—',
      summary_score: getSummaryScore(row.scores ?? null),
      created_at: row.created_at,
    }
  })

  const allSummaryScores = recentResults
    .map((row) => row.summary_score)
    .filter((value): value is number => value !== null)
  const averageScore =
    allSummaryScores.length > 0
      ? Math.round(
          (allSummaryScores.reduce((acc, value) => acc + value, 0) / allSummaryScores.length) * 10
        ) / 10
      : null

  return {
    ok: true,
    data: {
      metrics: {
        campaigns_total: campaignRows.length,
        campaigns_active: campaignsByStatus.active,
        invitations_total: (invitationRows ?? []).length,
        submissions_total: submissionCount ?? 0,
        average_score: averageScore,
      },
      campaigns_by_status: campaignsByStatus,
      recent_results: recentResults,
    },
  }
}
