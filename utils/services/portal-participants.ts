import { reportAccessTtlSeconds } from '@/utils/services/platform-settings-runtime'
import { sanitiseSearchQuery } from '@/utils/sanitise-search-query'
import {
  isAssessmentReportConfig,
  listSubmissionReportOptions,
  normalizeClassicResponseReportOptions,
  type ResponseReportOption,
} from '@/utils/services/response-experience'
import { getSubmissionReportOptions } from '@/utils/services/submission-report-options'
import type { SupabaseClient } from '@supabase/supabase-js'

type CampaignFilterRow = { id: string; name: string }
type AssessmentFilterRow = { id: string; key: string; name: string }

type ParticipantListRow = {
  id: string
  invitation_id: string | null
  campaign_id: string
  assessment_id: string
  created_at: string
  assessments:
    | { id: string; key: string; name: string; report_config?: unknown }
    | Array<{ id: string; key: string; name: string; report_config?: unknown }>
    | null
  assessment_invitations:
    | {
        first_name: string | null
        last_name: string | null
        email: string | null
        organisation: string | null
        role: string | null
        status: string | null
        completed_at: string | null
      }
    | Array<{
        first_name: string | null
        last_name: string | null
        email: string | null
        organisation: string | null
        role: string | null
        status: string | null
        completed_at: string | null
      }>
    | null
}

type ParticipantDetailRow = {
  id: string
  campaign_id: string
  assessment_id: string
  created_at: string
  assessments:
    | { id: string; key: string; name: string; report_config?: unknown }
    | Array<{ id: string; key: string; name: string; report_config?: unknown }>
    | null
  assessment_invitations:
    | {
        first_name: string | null
        last_name: string | null
        email: string | null
        organisation: string | null
        role: string | null
        status: string | null
        completed_at: string | null
      }
    | Array<{
        first_name: string | null
        last_name: string | null
        email: string | null
        organisation: string | null
        role: string | null
        status: string | null
        completed_at: string | null
      }>
    | null
}

function toPositiveInt(input: string | null, fallback: number) {
  const parsed = Number(input)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function parsePortalParticipantsQuery(searchParams: URLSearchParams) {
  return {
    q: String(searchParams.get('q') ?? '').trim().toLowerCase(),
    campaignId: String(searchParams.get('campaign_id') ?? '').trim(),
    assessmentId: String(searchParams.get('assessment_id') ?? '').trim(),
    page: toPositiveInt(searchParams.get('page'), 1),
    pageSize: Math.min(toPositiveInt(searchParams.get('pageSize'), 25), 100),
  }
}

export async function listPortalParticipants(input: {
  adminClient: SupabaseClient
  organisationId: string
  filters: ReturnType<typeof parsePortalParticipantsQuery>
}): Promise<
  | {
      ok: true
      data: {
        participants: Array<{
          submission_id: string
          campaign_id: string
          campaign_name: string
          assessment: AssessmentFilterRow | null
          participant_name: string
          email: string
          status: string | null
          context_line: string | null
          completed_at: string | null
          created_at: string
        }>
        filters: {
          campaigns: CampaignFilterRow[]
          assessments: AssessmentFilterRow[]
        }
        pagination: {
          page: number
          pageSize: number
          total: number
          totalPages: number
        }
      }
    }
  | {
      ok: false
      error: 'forbidden' | 'internal_error'
      message: string
    }
> {
  const { q, campaignId, assessmentId, page, pageSize } = input.filters
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data: campaigns, error: campaignsError } = await input.adminClient
    .from('campaigns')
    .select('id, name:external_name')
    .eq('organisation_id', input.organisationId)
    .order('external_name', { ascending: true })

  if (campaignsError) {
    return {
      ok: false,
      error: 'internal_error',
      message: 'Failed to load participant filters.',
    }
  }

  const campaignRows = (campaigns ?? []) as CampaignFilterRow[]
  const allowedCampaignIds = new Set(campaignRows.map((row) => row.id))
  const campaignNameById = new Map(campaignRows.map((row) => [row.id, row.name]))

  if (campaignId && !allowedCampaignIds.has(campaignId)) {
    return {
      ok: false,
      error: 'forbidden',
      message: 'Campaign does not belong to your organisation.',
    }
  }

  const campaignIds =
    campaignId && allowedCampaignIds.has(campaignId)
      ? [campaignId]
      : campaignRows.map((row) => row.id)

  const { data: assessmentAccessRows, error: assessmentAccessError } = await input.adminClient
    .from('organisation_assessment_access')
    .select('assessment_id, assessments(id, key, name:external_name)')
    .eq('organisation_id', input.organisationId)
    .eq('enabled', true)

  if (assessmentAccessError) {
    return {
      ok: false,
      error: 'internal_error',
      message: 'Failed to load assessment filters.',
    }
  }

  const assessments = ((assessmentAccessRows ?? []) as Array<{ assessments: unknown }>)
    .map((row) => pickRelation(row.assessments as AssessmentFilterRow | AssessmentFilterRow[] | null))
    .filter((value): value is AssessmentFilterRow => Boolean(value))
  const allowedAssessmentIds = new Set(assessments.map((assessment) => assessment.id))

  if (assessmentId && !allowedAssessmentIds.has(assessmentId)) {
    return {
      ok: false,
      error: 'forbidden',
      message: 'Assessment does not belong to your organisation.',
    }
  }

  if (campaignIds.length === 0) {
    return {
      ok: true,
      data: {
        participants: [],
        filters: { campaigns: campaignRows, assessments },
        pagination: { page, pageSize, total: 0, totalPages: 1 },
      },
    }
  }

  const invitationIdsFromSearch = new Set<string>()
  if (q) {
    const { data: invitationRows, error: invitationSearchError } = await input.adminClient
      .from('assessment_invitations')
      .select('id')
      .in('campaign_id', campaignIds)
      .or(`email.ilike.%${sanitiseSearchQuery(q)}%,first_name.ilike.%${sanitiseSearchQuery(q)}%,last_name.ilike.%${sanitiseSearchQuery(q)}%`)
      .limit(1000)

    if (invitationSearchError) {
      return {
        ok: false,
        error: 'internal_error',
        message: 'Failed to search participants.',
      }
    }

    for (const row of invitationRows ?? []) {
      invitationIdsFromSearch.add(row.id as string)
    }

    if (invitationIdsFromSearch.size === 0) {
      return {
        ok: true,
        data: {
          participants: [],
          filters: { campaigns: campaignRows, assessments },
          pagination: { page, pageSize, total: 0, totalPages: 1 },
        },
      }
    }
  }

  let query = input.adminClient
    .from('assessment_submissions')
    .select(
      'id, invitation_id, campaign_id, assessment_id, created_at, assessments(id, key, name:external_name, report_config), assessment_invitations!survey_submissions_invitation_id_fkey(first_name, last_name, email, organisation, role, status, completed_at)',
      { count: 'exact' }
    )
    .in('campaign_id', campaignIds)
    .order('created_at', { ascending: false })

  if (assessmentId) {
    query = query.eq('assessment_id', assessmentId)
  }
  if (invitationIdsFromSearch.size > 0) {
    query = query.in('invitation_id', [...invitationIdsFromSearch])
  }

  const { data, error, count } = await query.range(from, to)
  if (error) {
    return {
      ok: false,
      error: 'internal_error',
      message: 'Failed to load participants.',
    }
  }

  const participants = ((data ?? []) as ParticipantListRow[]).map((row) => {
    const invitation = pickRelation(
      row.assessment_invitations as ParticipantListRow['assessment_invitations']
    )
    const assessment = pickRelation(row.assessments as ParticipantListRow['assessments'])

    return {
      submission_id: row.id,
      campaign_id: row.campaign_id,
      campaign_name: campaignNameById.get(row.campaign_id) ?? 'Unknown campaign',
      assessment,
      participant_name:
        [invitation?.first_name ?? null, invitation?.last_name ?? null].filter(Boolean).join(' ') || '—',
      email: invitation?.email ?? '—',
      status: invitation?.status ?? null,
      context_line: [invitation?.organisation, invitation?.role].filter(Boolean).join(' · ') || null,
      completed_at: invitation?.completed_at ?? null,
      created_at: row.created_at,
    }
  })

  return {
    ok: true,
    data: {
      participants,
      filters: { campaigns: campaignRows, assessments },
      pagination: {
        page,
        pageSize,
        total: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
      },
    },
  }
}

export async function getPortalParticipantResult(input: {
  adminClient: SupabaseClient
  organisationId: string
  submissionId: string
}): Promise<
  | {
      ok: true
      data: {
        result: {
          id: string
          campaign: { id: string; name: string; slug: string }
          assessment: AssessmentFilterRow | null
          participant: {
            first_name: string | null
            last_name: string | null
            email: string | null
            organisation: string | null
            role: string | null
          }
          status: string | null
          completed_at: string | null
          created_at: string
          reportOptions: ResponseReportOption[]
        }
      }
    }
  | { ok: false; error: 'not_found'; message: string }
> {
  const { data: submission, error: submissionError } = await input.adminClient
    .from('assessment_submissions')
    .select(
      'id, campaign_id, assessment_id, created_at, assessments(id, key, name:external_name, report_config), assessment_invitations!survey_submissions_invitation_id_fkey(first_name, last_name, email, organisation, role, status, completed_at)'
    )
    .eq('id', input.submissionId)
    .maybeSingle()

  if (submissionError || !submission) {
    return {
      ok: false,
      error: 'not_found',
      message: 'Participant result was not found.',
    }
  }

  const { data: campaign } = await input.adminClient
    .from('campaigns')
    .select('id, name:external_name, slug')
    .eq('id', submission.campaign_id)
    .eq('organisation_id', input.organisationId)
    .maybeSingle()

  if (!campaign) {
    return {
      ok: false,
      error: 'not_found',
      message: 'Participant result was not found.',
    }
  }

  const row = submission as ParticipantDetailRow
  const invitation = pickRelation(
    row.assessment_invitations as ParticipantDetailRow['assessment_invitations']
  )
  const assessment = pickRelation(row.assessments as ParticipantDetailRow['assessments'])
  const reportOptions = assessment && isAssessmentReportConfig(assessment.report_config)
    ? await listSubmissionReportOptions({
        adminClient: input.adminClient,
        assessmentId: row.assessment_id,
        submissionId: row.id,
        expiresInSeconds: reportAccessTtlSeconds(),
      })
    : normalizeClassicResponseReportOptions(
        await getSubmissionReportOptions({
          adminClient: input.adminClient,
          submissionId: row.id,
          expiresInSeconds: reportAccessTtlSeconds(),
        })
      )

  return {
    ok: true,
    data: {
      result: {
        id: row.id,
        campaign: campaign as { id: string; name: string; slug: string },
        assessment,
        participant: {
          first_name: invitation?.first_name ?? null,
          last_name: invitation?.last_name ?? null,
          email: invitation?.email ?? null,
          organisation: invitation?.organisation ?? null,
          role: invitation?.role ?? null,
        },
        status: invitation?.status ?? null,
        completed_at: invitation?.completed_at ?? null,
        created_at: row.created_at,
        reportOptions,
      },
    },
  }
}
