import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'

type AdminClient = RouteAuthSuccess['adminClient']

export type NormGroupFilters = {
  campaign_ids?: string[]
  cohort_ids?: string[]
  created_at_from?: string
  created_at_to?: string
  demographics?: Record<string, string | string[]>
}

type SubmissionRow = {
  id: string
  invitation_id: string | null
  campaign_id: string | null
  demographics: Record<string, unknown> | null
  created_at: string
}

function normalizeFilters(filters: Record<string, unknown> | null | undefined): NormGroupFilters {
  if (!filters || typeof filters !== 'object') return {}
  return {
    campaign_ids: Array.isArray(filters.campaign_ids)
      ? filters.campaign_ids.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : undefined,
    cohort_ids: Array.isArray(filters.cohort_ids)
      ? filters.cohort_ids.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : undefined,
    created_at_from:
      typeof filters.created_at_from === 'string' && filters.created_at_from.trim().length > 0
        ? filters.created_at_from
        : undefined,
    created_at_to:
      typeof filters.created_at_to === 'string' && filters.created_at_to.trim().length > 0
        ? filters.created_at_to
        : undefined,
    demographics:
      filters.demographics && typeof filters.demographics === 'object'
        ? (filters.demographics as Record<string, string | string[]>)
        : undefined,
  }
}

function matchesDemographics(
  submission: SubmissionRow,
  demographics: Record<string, string | string[]>
) {
  const values = submission.demographics ?? {}

  return Object.entries(demographics).every(([key, expected]) => {
    const actual = values[key]
    if (typeof actual !== 'string') return false

    if (Array.isArray(expected)) {
      return expected.includes(actual)
    }

    return actual === expected
  })
}

export async function resolveNormGroupSubmissionIds(input: {
  adminClient: AdminClient
  assessmentId: string
  filters: Record<string, unknown> | null | undefined
}) {
  const filters = normalizeFilters(input.filters)

  const { data: submissions, error: submissionsError } = await input.adminClient
    .from('assessment_submissions')
    .select('id, invitation_id, campaign_id, demographics, created_at')
    .eq('assessment_id', input.assessmentId)
    .eq('excluded_from_analysis', false)

  if (submissionsError) {
    return { ok: false as const, error: 'submission_fetch_failed' as const }
  }

  const rows = (submissions ?? []) as SubmissionRow[]

  let cohortByInvitation = new Map<string, string | null>()
  if (filters.cohort_ids && filters.cohort_ids.length > 0) {
    const invitationIds = rows
      .map((submission) => submission.invitation_id)
      .filter((value): value is string => Boolean(value))

    if (invitationIds.length > 0) {
      const { data: invitations, error: invitationsError } = await input.adminClient
        .from('assessment_invitations')
        .select('id, cohort_id')
        .in('id', invitationIds)

      if (invitationsError) {
        return { ok: false as const, error: 'invitation_fetch_failed' as const }
      }

      cohortByInvitation = new Map(
        (invitations ?? []).map((invitation) => [
          invitation.id as string,
          (invitation.cohort_id as string | null) ?? null,
        ])
      )
    }
  }

  const createdAtFrom = filters.created_at_from ? new Date(filters.created_at_from) : null
  const createdAtTo = filters.created_at_to ? new Date(filters.created_at_to) : null

  const matchedIds = rows
    .filter((submission) => {
      if (filters.campaign_ids?.length && !filters.campaign_ids.includes(submission.campaign_id ?? '')) {
        return false
      }

      if (filters.cohort_ids?.length) {
        if (!submission.invitation_id) return false
        const cohortId = cohortByInvitation.get(submission.invitation_id) ?? null
        if (!cohortId || !filters.cohort_ids.includes(cohortId)) return false
      }

      if (createdAtFrom && new Date(submission.created_at).getTime() < createdAtFrom.getTime()) {
        return false
      }

      if (createdAtTo && new Date(submission.created_at).getTime() > createdAtTo.getTime()) {
        return false
      }

      if (filters.demographics && !matchesDemographics(submission, filters.demographics)) {
        return false
      }

      return true
    })
    .map((submission) => submission.id)

  return { ok: true as const, data: { submissionIds: matchedIds, filters } }
}
