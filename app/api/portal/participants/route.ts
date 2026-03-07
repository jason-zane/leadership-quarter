import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'

type ScoreMap = Record<string, unknown>

function toPositiveInt(input: string | null, fallback: number) {
  const parsed = Number(input)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
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

export async function GET(request: Request) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const q = String(searchParams.get('q') ?? '').trim().toLowerCase()
  const campaignIdFilter = String(searchParams.get('campaign_id') ?? '').trim()
  const assessmentIdFilter = String(searchParams.get('assessment_id') ?? '').trim()
  const page = toPositiveInt(searchParams.get('page'), 1)
  const pageSize = Math.min(toPositiveInt(searchParams.get('pageSize'), 25), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: campaigns, error: campaignsError } = await auth.adminClient
    .from('campaigns')
    .select('id, name')
    .eq('organisation_id', auth.context.organisationId)
    .order('name', { ascending: true })

  if (campaignsError) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to load participant filters.' },
      { status: 500 }
    )
  }

  const campaignRows = campaigns ?? []
  const allowedCampaignIds = new Set(campaignRows.map((row) => row.id))
  const campaignNameById = new Map(campaignRows.map((row) => [row.id, row.name]))

  if (campaignIdFilter && !allowedCampaignIds.has(campaignIdFilter)) {
    return NextResponse.json(
      { ok: false, error: 'forbidden', message: 'Campaign does not belong to your organisation.' },
      { status: 403 }
    )
  }

  const campaignIds =
    campaignIdFilter && allowedCampaignIds.has(campaignIdFilter)
      ? [campaignIdFilter]
      : campaignRows.map((row) => row.id)

  if (campaignIds.length === 0) {
    return NextResponse.json({
      ok: true,
      participants: [],
      filters: { campaigns: [], assessments: [] },
      pagination: { page, pageSize, total: 0, totalPages: 1 },
    })
  }

  const { data: assessmentAccessRows, error: assessmentAccessError } = await auth.adminClient
    .from('organisation_assessment_access')
    .select('assessment_id, assessments(id, key, name)')
    .eq('organisation_id', auth.context.organisationId)
    .eq('enabled', true)

  if (assessmentAccessError) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to load assessment filters.' },
      { status: 500 }
    )
  }

  const invitationIdsFromSearch = new Set<string>()
  if (q) {
    const { data: invitationRows, error: invitationSearchError } = await auth.adminClient
      .from('assessment_invitations')
      .select('id')
      .in('campaign_id', campaignIds)
      .or(`email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
      .limit(1000)

    if (invitationSearchError) {
      return NextResponse.json(
        { ok: false, error: 'internal_error', message: 'Failed to search participants.' },
        { status: 500 }
      )
    }

    for (const row of invitationRows ?? []) {
      invitationIdsFromSearch.add(row.id)
    }

    if (invitationIdsFromSearch.size === 0) {
      return NextResponse.json({
        ok: true,
        participants: [],
        filters: {
          campaigns: campaignRows,
          assessments: (assessmentAccessRows ?? []).map((row) => {
            const assessmentRel = row.assessments as unknown
            const assessment = (Array.isArray(assessmentRel) ? assessmentRel[0] : assessmentRel) as
              | { id: string; key: string; name: string }
              | null
            return assessment
          }).filter(Boolean),
        },
        pagination: { page, pageSize, total: 0, totalPages: 1 },
      })
    }
  }

  let query = auth.adminClient
    .from('assessment_submissions')
    .select(
      'id, invitation_id, campaign_id, assessment_id, created_at, scores, classification, assessments(id, key, name), assessment_invitations!survey_submissions_invitation_id_fkey(first_name, last_name, email, completed_at)',
      { count: 'exact' }
    )
    .in('campaign_id', campaignIds)
    .order('created_at', { ascending: false })

  if (assessmentIdFilter) {
    query = query.eq('assessment_id', assessmentIdFilter)
  }
  if (invitationIdsFromSearch.size > 0) {
    query = query.in('invitation_id', [...invitationIdsFromSearch])
  }

  const { data, error, count } = await query.range(from, to)
  if (error) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to load participants.' },
      { status: 500 }
    )
  }

  const participants = (data ?? []).map((row) => {
    const invitationRel = row.assessment_invitations as unknown
    const invitation = (Array.isArray(invitationRel) ? invitationRel[0] : invitationRel) as
      | {
          first_name: string | null
          last_name: string | null
          email: string | null
          completed_at: string | null
        }
      | null
    const classification = (row.classification as { label?: string } | null)?.label ?? '—'
    const assessmentRel = row.assessments as unknown
    const assessment = (Array.isArray(assessmentRel) ? assessmentRel[0] : assessmentRel) as
      | { id: string; key: string; name: string }
      | null

    return {
      submission_id: row.id,
      campaign_id: row.campaign_id,
      campaign_name: campaignNameById.get(row.campaign_id) ?? 'Unknown campaign',
      assessment,
      participant_name:
        [invitation?.first_name ?? null, invitation?.last_name ?? null].filter(Boolean).join(' ') || '—',
      email: invitation?.email ?? '—',
      classification_label: classification,
      summary_score: getSummaryScore((row.scores as ScoreMap | null) ?? null),
      completed_at: invitation?.completed_at ?? null,
      created_at: row.created_at,
    }
  })

  const assessments = (assessmentAccessRows ?? [])
    .map((row) => {
      const assessmentRel = row.assessments as unknown
      return (Array.isArray(assessmentRel) ? assessmentRel[0] : assessmentRel) as
        | { id: string; key: string; name: string }
        | null
    })
    .filter((value): value is { id: string; key: string; name: string } => Boolean(value))

  return NextResponse.json({
    ok: true,
    participants,
    filters: {
      campaigns: campaignRows,
      assessments,
    },
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  })
}
