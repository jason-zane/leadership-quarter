import { reportAccessTtlSeconds } from '@/utils/services/platform-settings-runtime'
import type {
  CampaignFlowStep,
  CampaignScreenStepConfig,
} from '@/utils/assessments/campaign-types'
import type { CampaignDemographics } from '@/utils/assessments/campaign-types'
import { createReportAccessToken } from '@/utils/security/report-access'
import { listAdminCampaignFlowSteps } from '@/utils/services/admin-campaigns/flow-steps'
import { getSubmissionTraitAverageMap } from '@/utils/services/response-experience'
import type { AdminClient } from '@/utils/services/admin-campaigns/types'

type SubmissionAssessmentRelation = {
  id: string
  key: string
  name: string
  status: string
  report_config?: unknown
}

type SubmissionInvitationRelation = {
  id?: string
  status: string | null
  completed_at: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
}

type SubmissionRow = {
  id: string
  invitation_id: string | null
  campaign_id: string
  assessment_id: string
  created_at: string
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
  demographics: CampaignDemographics | null
  scores: Record<string, unknown> | null
  bands: Record<string, string> | null
  classification: { key?: string; label?: string; source?: string } | null
  recommendations: unknown[] | null
  responses: Record<string, number> | null
  normalized_responses: Record<string, number> | null
  report_token?: string | null
  assessments:
    | SubmissionAssessmentRelation
    | SubmissionAssessmentRelation[]
    | null
  assessment_invitations:
    | SubmissionInvitationRelation
    | SubmissionInvitationRelation[]
    | null
}

export type AdminCampaignSubmissionRow = {
  id: string
  candidateKey: string
  assessmentId: string
  assessmentName: string
  assessmentKey: string
  participantName: string
  email: string
  organisation: string | null
  role: string | null
  status: string
  outcomeLabel: string | null
  averageTraitScore: number | null
  submittedAt: string
  completedAt: string | null
  detailHref: string
  reportsHref: string
  currentReportHref: string | null
  candidateHref: string
}

export type AdminCampaignCandidateRow = {
  candidateKey: string
  participantName: string
  email: string
  organisation: string | null
  role: string | null
  status: 'not_started' | 'in_progress' | 'completed'
  completedAssessments: number
  totalAssessments: number
  lastActivityAt: string | null
  submissionCount: number
}

export type AdminCampaignCandidateJourney = {
  candidate: {
    candidateKey: string
    participantName: string
    email: string
    organisation: string | null
    role: string | null
    status: 'not_started' | 'in_progress' | 'completed'
  }
  journey: Array<
    | {
        stepId: string
        stepType: 'screen'
        label: string
        status: 'screen'
        screenConfig: CampaignScreenStepConfig
      }
    | {
        stepId: string
        stepType: 'assessment'
        label: string
        status: 'not_started' | 'completed'
        assessment: {
          id: string
          key: string
          name: string
        } | null
        submission: AdminCampaignSubmissionRow | null
      }
  >
  submissions: AdminCampaignSubmissionRow[]
}

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim()
}

function getParticipantName(row: SubmissionRow) {
  const invitation = pickRelation(row.assessment_invitations)
  const firstName = normalizeText(row.first_name) || normalizeText(invitation?.first_name)
  const lastName = normalizeText(row.last_name) || normalizeText(invitation?.last_name)
  return [firstName, lastName].filter(Boolean).join(' ') || 'Unknown participant'
}

function getParticipantEmail(row: SubmissionRow) {
  const invitation = pickRelation(row.assessment_invitations)
  return normalizeText(row.email) || normalizeText(invitation?.email)
}

function getParticipantOrganisation(row: SubmissionRow) {
  const invitation = pickRelation(row.assessment_invitations)
  return normalizeText(row.organisation) || normalizeText(invitation?.organisation) || null
}

function getParticipantRole(row: SubmissionRow) {
  const invitation = pickRelation(row.assessment_invitations)
  return normalizeText(row.role) || normalizeText(invitation?.role) || null
}

function getCandidateKey(row: SubmissionRow) {
  if (row.invitation_id) return `invitation:${row.invitation_id}`
  const email = getParticipantEmail(row).toLowerCase()
  if (email) return `email:${email}`
  return `submission:${row.id}`
}

function matchesQuery(values: Array<string | null | undefined>, query: string) {
  if (!query) return true
  const haystack = values
    .map((value) => normalizeText(value).toLowerCase())
    .filter(Boolean)
    .join(' ')
  return haystack.includes(query)
}

async function loadCampaignSubmissions(adminClient: AdminClient, campaignId: string) {
  const { data, error } = await adminClient
    .from('assessment_submissions')
    .select(
      `
      id, invitation_id, campaign_id, assessment_id, created_at, first_name, last_name, email, organisation, role,
      demographics, scores, bands, classification, recommendations, responses, normalized_responses, report_token,
      assessments(id, key, name:external_name, status, report_config),
      assessment_invitations!survey_submissions_invitation_id_fkey(id, status, completed_at, first_name, last_name, email, organisation, role)
    `
    )
    .eq('campaign_id', campaignId)
    .eq('is_preview_sample', false)
    .order('created_at', { ascending: false })

  if (error) {
    return { ok: false as const, error: 'responses_list_failed' as const }
  }

  return {
    ok: true as const,
    rows: (data ?? []) as SubmissionRow[],
  }
}

async function loadFlowSteps(adminClient: AdminClient, campaignId: string) {
  const result = await listAdminCampaignFlowSteps({
    adminClient,
    campaignId,
  })

  return result.ok ? result.data.flowSteps : ([] as CampaignFlowStep[])
}

async function loadCampaignAssessmentMap(adminClient: AdminClient, campaignId: string) {
  const { data, error } = await adminClient
    .from('campaign_assessments')
    .select('id, assessment_id, assessments(id, key, name:external_name)')
    .eq('campaign_id', campaignId)

  if (error) {
    return new Map<string, { assessmentId: string; assessment: { id: string; key: string; name: string } | null }>()
  }

  return new Map(
    (data ?? []).map((row) => {
      const assessment = pickRelation(row.assessments as
        | { id: string; key: string; name: string }
        | Array<{ id: string; key: string; name: string }>
        | null)
      return [
        row.id as string,
        {
          assessmentId: row.assessment_id as string,
          assessment: assessment
            ? {
                id: assessment.id,
                key: assessment.key,
                name: assessment.name,
              }
            : null,
        },
      ] as const
    })
  )
}

function toSubmissionListRow(input: {
  row: SubmissionRow
  campaignId: string
  averageTraitScore: number | null
}): AdminCampaignSubmissionRow {
  const row = input.row
  const assessment = pickRelation(row.assessments)
  const invitation = pickRelation(row.assessment_invitations)
  const accessToken = createReportAccessToken({
    report: 'assessment',
    submissionId: row.id,
    expiresInSeconds: reportAccessTtlSeconds(),
  })

  return {
    id: row.id,
    candidateKey: getCandidateKey(row),
    assessmentId: row.assessment_id,
    assessmentName: assessment?.name ?? 'Assessment',
    assessmentKey: assessment?.key ?? '',
    participantName: getParticipantName(row),
    email: getParticipantEmail(row),
    organisation: getParticipantOrganisation(row),
    role: getParticipantRole(row),
    status: invitation?.status ?? 'completed',
    outcomeLabel: row.classification?.label ?? null,
    averageTraitScore: input.averageTraitScore,
    submittedAt: row.created_at,
    completedAt: invitation?.completed_at ?? null,
    detailHref: `/dashboard/campaigns/${input.campaignId}/responses/submissions/${row.id}`,
    reportsHref: `/dashboard/campaigns/${input.campaignId}/responses/submissions/${row.id}?tab=reports`,
    currentReportHref: accessToken
      ? `/assess/r/assessment?access=${encodeURIComponent(accessToken)}`
      : null,
    candidateHref: `/dashboard/campaigns/${input.campaignId}/responses/candidates/${encodeURIComponent(getCandidateKey(row))}`,
  }
}

function toCandidateRows(
  rows: SubmissionRow[],
  flowSteps: CampaignFlowStep[]
) {
  const assessmentStepCount = flowSteps.filter((step) => step.step_type === 'assessment' && step.is_active).length
  const grouped = new Map<string, SubmissionRow[]>()

  for (const row of rows) {
    const key = getCandidateKey(row)
    const current = grouped.get(key) ?? []
    current.push(row)
    grouped.set(key, current)
  }

  return [...grouped.entries()].map(([candidateKey, entries]) => {
    const latest = [...entries].sort((left, right) => right.created_at.localeCompare(left.created_at))[0]
    const completedAssessments = new Set(entries.map((entry) => entry.assessment_id)).size
    const totalAssessments = assessmentStepCount || completedAssessments
    const status =
      completedAssessments >= totalAssessments && totalAssessments > 0
        ? 'completed'
        : completedAssessments > 0
          ? 'in_progress'
          : 'not_started'

    return {
      candidateKey,
      participantName: getParticipantName(latest),
      email: getParticipantEmail(latest),
      organisation: getParticipantOrganisation(latest),
      role: getParticipantRole(latest),
      status,
      completedAssessments,
      totalAssessments,
      lastActivityAt: latest.created_at,
      submissionCount: entries.length,
    } satisfies AdminCampaignCandidateRow
  })
    .sort((left, right) => (right.lastActivityAt ?? '').localeCompare(left.lastActivityAt ?? ''))
}

export async function listAdminCampaignResponses(input: {
  adminClient: AdminClient
  campaignId: string
  filters?: {
    q?: string
    view?: 'candidates' | 'submissions'
    assessmentId?: string
    status?: string
  }
}): Promise<
  | {
      ok: true
      data: {
        view: 'candidates' | 'submissions'
        candidates?: AdminCampaignCandidateRow[]
        submissions?: AdminCampaignSubmissionRow[]
      }
    }
  | {
      ok: false
      error: 'responses_list_failed'
    }
> {
  const submissionResult = await loadCampaignSubmissions(input.adminClient, input.campaignId)
  if (!submissionResult.ok) {
    return submissionResult
  }

  const query = normalizeText(input.filters?.q).toLowerCase()
  const flowSteps = await loadFlowSteps(input.adminClient, input.campaignId)
  const averageTraitScoreBySubmission = await getSubmissionTraitAverageMap(
    input.adminClient,
    submissionResult.rows.map((row) => row.id)
  )
  const filteredRows = submissionResult.rows.filter((row) => {
    const submission = toSubmissionListRow({
      row,
      campaignId: input.campaignId,
      averageTraitScore: averageTraitScoreBySubmission.get(row.id) ?? null,
    })

    if (input.filters?.assessmentId && submission.assessmentId !== input.filters.assessmentId) {
      return false
    }
    if (input.filters?.status && submission.status !== input.filters.status) {
      return false
    }

    return matchesQuery(
      [
        submission.participantName,
        submission.email,
        submission.organisation,
        submission.role,
        submission.assessmentName,
        submission.outcomeLabel,
      ],
      query
    )
  })

  const view = input.filters?.view === 'candidates' ? 'candidates' : 'submissions'
  if (view === 'candidates') {
    return {
      ok: true,
      data: {
        view,
        candidates: toCandidateRows(filteredRows, flowSteps),
      },
    }
  }

  return {
      ok: true,
      data: {
        view,
        submissions: filteredRows.map((row) =>
          toSubmissionListRow({
            row,
            campaignId: input.campaignId,
            averageTraitScore: averageTraitScoreBySubmission.get(row.id) ?? null,
          })
        ),
      },
    }
}

export async function getAdminCampaignCandidateJourney(input: {
  adminClient: AdminClient
  campaignId: string
  candidateKey: string
}) {
  const submissionResult = await loadCampaignSubmissions(input.adminClient, input.campaignId)
  if (!submissionResult.ok) {
    return submissionResult
  }

  const candidateRows = submissionResult.rows.filter((row) => getCandidateKey(row) === input.candidateKey)
  if (candidateRows.length === 0) {
    return { ok: false as const, error: 'candidate_not_found' as const }
  }

  const flowSteps = await loadFlowSteps(input.adminClient, input.campaignId)
  const campaignAssessmentMap = await loadCampaignAssessmentMap(input.adminClient, input.campaignId)
  const latest = [...candidateRows].sort((left, right) => right.created_at.localeCompare(left.created_at))[0]
  const averageTraitScoreBySubmission = await getSubmissionTraitAverageMap(
    input.adminClient,
    candidateRows.map((row) => row.id)
  )
  const submissionsByAssessmentId = new Map<string, AdminCampaignSubmissionRow>()
  for (const row of candidateRows) {
    submissionsByAssessmentId.set(
      row.assessment_id,
      toSubmissionListRow({
        row,
        campaignId: input.campaignId,
        averageTraitScore: averageTraitScoreBySubmission.get(row.id) ?? null,
      })
    )
  }

  const assessmentStepCount = flowSteps.filter((step) => step.step_type === 'assessment' && step.is_active).length
  const completedAssessments = new Set(candidateRows.map((row) => row.assessment_id)).size
  const status =
    completedAssessments >= assessmentStepCount && assessmentStepCount > 0
      ? 'completed'
      : completedAssessments > 0
        ? 'in_progress'
        : 'not_started'

  const journey = flowSteps.map((step) => {
    if (step.step_type === 'screen') {
      return {
        stepId: step.id,
        stepType: 'screen' as const,
        label: step.screen_config.title,
        status: 'screen' as const,
        screenConfig: step.screen_config,
      }
    }

    const mapping = step.campaign_assessment_id
      ? campaignAssessmentMap.get(step.campaign_assessment_id) ?? null
      : null
    const candidateSubmission = mapping
      ? submissionsByAssessmentId.get(mapping.assessmentId) ?? null
      : null

    return {
      stepId: step.id,
      stepType: 'assessment' as const,
      label: mapping?.assessment?.name ?? 'Assessment',
      status: candidateSubmission ? 'completed' as const : 'not_started' as const,
      assessment: mapping?.assessment ?? null,
      submission: candidateSubmission,
    }
  })

  return {
    ok: true as const,
    data: {
      candidate: {
        candidateKey: input.candidateKey,
        participantName: getParticipantName(latest),
        email: getParticipantEmail(latest),
        organisation: getParticipantOrganisation(latest),
        role: getParticipantRole(latest),
        status,
      },
      journey,
      submissions: candidateRows.map((candidateRow) =>
        toSubmissionListRow({
          row: candidateRow,
          campaignId: input.campaignId,
          averageTraitScore: averageTraitScoreBySubmission.get(candidateRow.id) ?? null,
        })
      ),
    },
  }
}

export async function getAdminCampaignSubmission(input: {
  adminClient: AdminClient
  campaignId: string
  submissionId: string
}) {
  const submissionResult = await loadCampaignSubmissions(input.adminClient, input.campaignId)
  if (!submissionResult.ok) {
    return submissionResult
  }

  const row = submissionResult.rows.find((submission) => submission.id === input.submissionId)
  if (!row) {
    return { ok: false as const, error: 'submission_not_found' as const }
  }
  const averageTraitScoreBySubmission = await getSubmissionTraitAverageMap(
    input.adminClient,
    [row.id]
  )

  return {
    ok: true as const,
    data: {
      submission: row,
      summary: toSubmissionListRow({
        row,
        campaignId: input.campaignId,
        averageTraitScore: averageTraitScoreBySubmission.get(row.id) ?? null,
      }),
      candidateKey: getCandidateKey(row),
    },
  }
}
