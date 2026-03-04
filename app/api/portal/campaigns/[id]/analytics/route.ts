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

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { id: campaignId } = await params

  const { data: campaign } = await auth.adminClient
    .from('campaigns')
    .select('id, name, status')
    .eq('id', campaignId)
    .eq('organisation_id', auth.context.organisationId)
    .maybeSingle()

  if (!campaign) {
    return NextResponse.json(
      { ok: false, error: 'not_found', message: 'Campaign was not found.' },
      { status: 404 }
    )
  }

  const [{ data: invitationRows, error: invitationError }, { data: submissionRows, error: submissionError }] =
    await Promise.all([
      auth.adminClient
        .from('assessment_invitations')
        .select('id, status, sent_at, opened_at, started_at, completed_at')
        .eq('campaign_id', campaignId),
      auth.adminClient
        .from('assessment_submissions')
        .select('id, scores, created_at')
        .eq('campaign_id', campaignId),
    ])

  if (invitationError || submissionError) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to load campaign analytics.' },
      { status: 500 }
    )
  }

  const invitations = invitationRows ?? []
  const submissions = submissionRows ?? []

  const totalInvites = invitations.length
  const sent = invitations.filter((item) => item.status === 'sent' || item.sent_at).length
  const opened = invitations.filter((item) => item.opened_at).length
  const started = invitations.filter((item) => item.started_at).length
  const completed = invitations.filter((item) => item.completed_at || item.status === 'completed').length

  const summaryScores = submissions
    .map((item) => getSummaryScore((item.scores as ScoreMap | null) ?? null))
    .filter((item): item is number => item !== null)

  const averageScore =
    summaryScores.length > 0
      ? Math.round((summaryScores.reduce((acc, value) => acc + value, 0) / summaryScores.length) * 10) / 10
      : null

  return NextResponse.json({
    ok: true,
    campaign: {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
    },
    analytics: {
      totals: {
        invitations: totalInvites,
        sent,
        opened,
        started,
        completed,
        submissions: submissions.length,
      },
      rates: {
        open_rate: sent > 0 ? Math.round((opened / sent) * 1000) / 10 : 0,
        start_rate: opened > 0 ? Math.round((started / opened) * 1000) / 10 : 0,
        completion_rate: totalInvites > 0 ? Math.round((completed / totalInvites) * 1000) / 10 : 0,
      },
      scores: {
        average: averageScore,
        sample_size: summaryScores.length,
      },
    },
  })
}
