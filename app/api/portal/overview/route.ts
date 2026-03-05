import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'

type ScoreMap = Record<string, unknown>

function getSummaryScore(scores: ScoreMap | null): number | null {
  if (!scores) return null
  const values = Object.values(scores)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
  if (values.length === 0) return null
  const avg = values.reduce((acc, value) => acc + value, 0) / values.length
  return Math.round(avg * 10) / 10
}

export async function GET() {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { data: campaigns, error: campaignsError } = await auth.adminClient
    .from('campaigns')
    .select('id, name, status')
    .eq('organisation_id', auth.context.organisationId)
    .order('created_at', { ascending: false })

  if (campaignsError) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to load portal overview.' },
      { status: 500 }
    )
  }

  const campaignRows = campaigns ?? []
  const campaignIds = campaignRows.map((row) => row.id)
  const campaignNameById = new Map(campaignRows.map((row) => [row.id, row.name]))

  if (campaignIds.length === 0) {
    return NextResponse.json({
      ok: true,
      metrics: {
        campaigns_total: 0,
        campaigns_active: 0,
        invitations_total: 0,
        submissions_total: 0,
        average_score: null,
      },
      campaigns_by_status: {
        draft: 0,
        active: 0,
        closed: 0,
        archived: 0,
      },
      recent_results: [],
    })
  }

  const [
    { data: invitationRows, error: invitationError },
    { data: submissionRows, error: submissionError },
    { count: submissionCount, error: submissionCountError },
  ] =
    await Promise.all([
      auth.adminClient.from('assessment_invitations').select('id').in('campaign_id', campaignIds),
      auth.adminClient
        .from('assessment_submissions')
        .select(
          'id, campaign_id, created_at, scores, classification, assessments(id, key, name), assessment_invitations(first_name, last_name, email)'
        )
        .in('campaign_id', campaignIds)
        .order('created_at', { ascending: false })
        .limit(10),
      auth.adminClient
        .from('assessment_submissions')
        .select('id', { count: 'exact', head: true })
        .in('campaign_id', campaignIds),
    ])

  if (invitationError || submissionError || submissionCountError) {
    const campaignsByStatus = {
      draft: campaignRows.filter((row) => row.status === 'draft').length,
      active: campaignRows.filter((row) => row.status === 'active').length,
      closed: campaignRows.filter((row) => row.status === 'closed').length,
      archived: campaignRows.filter((row) => row.status === 'archived').length,
    }

    return NextResponse.json({
      ok: true,
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
    })
  }

  const recentResults = (submissionRows ?? []).map((row) => {
    const invitationRel = row.assessment_invitations as unknown
    const invitation = (Array.isArray(invitationRel) ? invitationRel[0] : invitationRel) as
      | { first_name: string | null; last_name: string | null; email: string | null }
      | null
    const classification = (row.classification as { label?: string } | null)?.label ?? '—'

    return {
      submission_id: row.id,
      campaign_id: row.campaign_id,
      campaign_name: campaignNameById.get(row.campaign_id) ?? 'Unknown campaign',
      participant_name:
        [invitation?.first_name ?? null, invitation?.last_name ?? null].filter(Boolean).join(' ') || '—',
      email: invitation?.email ?? '—',
      assessment: row.assessments,
      classification_label: classification,
      summary_score: getSummaryScore((row.scores as ScoreMap | null) ?? null),
      created_at: row.created_at,
    }
  })

  const allSummaryScores = recentResults
    .map((row) => row.summary_score)
    .filter((value): value is number => value !== null)

  const averageScore =
    allSummaryScores.length > 0
      ? Math.round((allSummaryScores.reduce((acc, value) => acc + value, 0) / allSummaryScores.length) * 10) / 10
      : null

  const campaignsByStatus = {
    draft: campaignRows.filter((row) => row.status === 'draft').length,
    active: campaignRows.filter((row) => row.status === 'active').length,
    closed: campaignRows.filter((row) => row.status === 'closed').length,
    archived: campaignRows.filter((row) => row.status === 'archived').length,
  }

  return NextResponse.json({
    ok: true,
    metrics: {
      campaigns_total: campaignRows.length,
      campaigns_active: campaignsByStatus.active,
      invitations_total: (invitationRows ?? []).length,
      submissions_total: submissionCount ?? 0,
      average_score: averageScore,
    },
    campaigns_by_status: campaignsByStatus,
    recent_results: recentResults,
  })
}
