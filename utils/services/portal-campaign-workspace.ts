import type { SupabaseClient } from '@supabase/supabase-js'

type ScoreMap = Record<string, unknown>

type ScopedCampaignRow = {
  id: string
  slug?: string
  name?: string
  status?: string
}

type AnalyticsInvitationRow = {
  id: string
  status: string | null
  sent_at: string | null
  opened_at: string | null
  started_at: string | null
  completed_at: string | null
}

type AnalyticsSubmissionRow = {
  id: string
  scores: ScoreMap | null
  created_at: string
}

type ResponseInvitationRow = {
  status: string | null
  completed_at: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
}

type ResponsesRow = {
  id: string
  assessment_id: string
  created_at: string
  assessments:
    | { id?: string; name?: string | null; key?: string | null }
    | Array<{ id?: string; name?: string | null; key?: string | null }>
    | null
  assessment_invitations: ResponseInvitationRow | ResponseInvitationRow[] | null
}

type ExportAssessmentRow = {
  key: string
  name: string
}

type ExportInvitationRow = {
  email: string | null
  first_name: string | null
  last_name: string | null
  organisation: string | null
  role: string | null
  completed_at: string | null
}

type ExportRow = {
  id: string
  assessment_id: string
  created_at: string
  scores: Record<string, unknown> | null
  bands: Record<string, unknown> | null
  classification: Record<string, unknown> | null
  recommendations: unknown[] | null
  demographics: Record<string, unknown> | null
  assessments: ExportAssessmentRow | ExportAssessmentRow[] | null
  assessment_invitations: ExportInvitationRow | ExportInvitationRow[] | null
}

type PortalCampaignWorkspaceFailure = {
  ok: false
  error: 'not_found' | 'internal_error'
  message: string
}

export type PortalCampaignAnalyticsResult =
  | {
      ok: true
      data: {
        campaign: {
          id: string
          name: string
          status: string
        }
        analytics: {
          totals: {
            invitations: number
            sent: number
            opened: number
            started: number
            completed: number
            submissions: number
          }
          rates: {
            open_rate: number
            start_rate: number
            completion_rate: number
          }
          scores: {
            average: number | null
            sample_size: number
          }
        }
      }
    }
  | PortalCampaignWorkspaceFailure

export type PortalCampaignResponsesResult =
  | {
      ok: true
      data: {
        responses: Array<{
          id: string
          assessment_id: string
          assessment_name: string | null
          status: string
          created_at: string
          completed_at: string | null
          participant_name: string
          email: string | null
          context_line: string | null
        }>
      }
    }
  | PortalCampaignWorkspaceFailure

export type PortalCampaignResponsesCsvResult =
  | {
      ok: true
      data: {
        csv: string
        filename: string
      }
    }
  | PortalCampaignWorkspaceFailure

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function csvEscape(value: unknown) {
  const text = String(value ?? '')
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
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

async function loadScopedCampaign(input: {
  adminClient: SupabaseClient
  organisationId: string
  campaignId: string
  select: string
}): Promise<ScopedCampaignRow | null> {
  const { data } = await input.adminClient
    .from('campaigns')
    .select(input.select)
    .eq('id', input.campaignId)
    .eq('organisation_id', input.organisationId)
    .maybeSingle()

  return (data as ScopedCampaignRow | null) ?? null
}

function notFound(): PortalCampaignWorkspaceFailure {
  return {
    ok: false,
    error: 'not_found',
    message: 'Campaign was not found.',
  }
}

function internalError(message: string): PortalCampaignWorkspaceFailure {
  return {
    ok: false,
    error: 'internal_error',
    message,
  }
}

export async function getPortalCampaignAnalytics(input: {
  adminClient: SupabaseClient
  organisationId: string
  campaignId: string
}): Promise<PortalCampaignAnalyticsResult> {
  const campaign = await loadScopedCampaign({
    adminClient: input.adminClient,
    organisationId: input.organisationId,
    campaignId: input.campaignId,
    select: 'id, name:external_name, status',
  })

  if (!campaign?.id || !campaign.name || !campaign.status) {
    return notFound()
  }

  const [{ data: invitationRows, error: invitationError }, { data: submissionRows, error: submissionError }] =
    await Promise.all([
      input.adminClient
        .from('assessment_invitations')
        .select('id, status, sent_at, opened_at, started_at, completed_at')
        .eq('campaign_id', input.campaignId),
      input.adminClient
        .from('assessment_submissions')
        .select('id, scores, created_at')
        .eq('campaign_id', input.campaignId)
        .eq('is_preview_sample', false),
    ])

  if (invitationError || submissionError) {
    return internalError('Failed to load campaign analytics.')
  }

  const invitations = (invitationRows ?? []) as AnalyticsInvitationRow[]
  const submissions = (submissionRows ?? []) as AnalyticsSubmissionRow[]

  const totalInvites = invitations.length
  const sent = invitations.filter((item) => item.status === 'sent' || item.sent_at).length
  const opened = invitations.filter((item) => item.opened_at).length
  const started = invitations.filter((item) => item.started_at).length
  const completed = invitations.filter(
    (item) => item.completed_at || item.status === 'completed'
  ).length

  const summaryScores = submissions
    .map((item) => getSummaryScore(item.scores ?? null))
    .filter((item): item is number => item !== null)

  const averageScore =
    summaryScores.length > 0
      ? Math.round((summaryScores.reduce((acc, value) => acc + value, 0) / summaryScores.length) * 10) /
        10
      : null

  return {
    ok: true,
    data: {
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
    },
  }
}

export async function listPortalCampaignResponses(input: {
  adminClient: SupabaseClient
  organisationId: string
  campaignId: string
}): Promise<PortalCampaignResponsesResult> {
  const campaign = await loadScopedCampaign({
    adminClient: input.adminClient,
    organisationId: input.organisationId,
    campaignId: input.campaignId,
    select: 'id',
  })

  if (!campaign?.id) {
    return notFound()
  }

  const { data, error } = await input.adminClient
    .from('assessment_submissions')
    .select(
      'id, assessment_id, created_at, assessments(id, name:external_name, key), assessment_invitations!survey_submissions_invitation_id_fkey(status, completed_at, first_name, last_name, email, organisation, role)'
    )
    .eq('campaign_id', input.campaignId)
    .eq('is_preview_sample', false)
    .order('created_at', { ascending: false })

  if (error) {
    return internalError('Failed to load campaign responses.')
  }

  const responses = ((data ?? []) as ResponsesRow[]).map((row) => {
    const assessment = pickRelation(row.assessments)
    const invitation = pickRelation(row.assessment_invitations)
    return {
      id: row.id,
      assessment_id: row.assessment_id,
      assessment_name: assessment?.name ?? null,
      status: invitation?.status ?? 'completed',
      created_at: row.created_at,
      completed_at: invitation?.completed_at ?? null,
      participant_name:
        [invitation?.first_name ?? '', invitation?.last_name ?? ''].filter(Boolean).join(' ') || 'Participant',
      email: invitation?.email ?? null,
      context_line: [invitation?.organisation, invitation?.role].filter(Boolean).join(' · ') || null,
    }
  })

  return {
    ok: true,
    data: { responses },
  }
}

export async function exportPortalCampaignResponsesCsv(input: {
  adminClient: SupabaseClient
  organisationId: string
  campaignId: string
}): Promise<PortalCampaignResponsesCsvResult> {
  const campaign = await loadScopedCampaign({
    adminClient: input.adminClient,
    organisationId: input.organisationId,
    campaignId: input.campaignId,
    select: 'id, slug',
  })

  if (!campaign?.id || !campaign.slug) {
    return notFound()
  }

  const { data, error } = await input.adminClient
    .from('assessment_submissions')
    .select(
      'id, assessment_id, created_at, scores, bands, classification, recommendations, demographics, assessments(name:external_name, key), assessment_invitations!survey_submissions_invitation_id_fkey(email, first_name, last_name, organisation, role, completed_at)'
    )
    .eq('campaign_id', input.campaignId)
    .eq('is_preview_sample', false)
    .order('created_at', { ascending: false })

  if (error) {
    return internalError('Failed to export campaign responses.')
  }

  const header = [
    'submission_id',
    'assessment_id',
    'assessment_key',
    'assessment_name',
    'email',
    'first_name',
    'last_name',
    'organisation',
    'role',
    'submitted_at',
    'completed_at',
    'scores_json',
    'bands_json',
    'classification_json',
    'recommendations_json',
    'demographics_json',
  ]

  const lines = [header.join(',')]

  for (const row of (data ?? []) as ExportRow[]) {
    const assessment = pickRelation(row.assessments)
    const invitation = pickRelation(row.assessment_invitations)

    const values = [
      row.id,
      row.assessment_id,
      assessment?.key ?? '',
      assessment?.name ?? '',
      invitation?.email ?? '',
      invitation?.first_name ?? '',
      invitation?.last_name ?? '',
      invitation?.organisation ?? '',
      invitation?.role ?? '',
      row.created_at,
      invitation?.completed_at ?? '',
      JSON.stringify(row.scores ?? {}),
      JSON.stringify(row.bands ?? {}),
      JSON.stringify(row.classification ?? {}),
      JSON.stringify(row.recommendations ?? []),
      JSON.stringify(row.demographics ?? {}),
    ]

    lines.push(values.map(csvEscape).join(','))
  }

  return {
    ok: true,
    data: {
      csv: lines.join('\n'),
      filename: `campaign-${campaign.slug}-responses.csv`,
    },
  }
}
