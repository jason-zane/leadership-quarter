import { reportAccessTtlSeconds } from '@/utils/services/platform-settings-runtime'
import { createReportAccessToken } from '@/utils/security/report-access'
import {
  getSubmissionParticipantEmail,
  getSubmissionParticipantName,
  getSubmissionParticipantOrganisation,
  getSubmissionParticipantRole,
  normalizeText,
  pickRelation,
} from '@/utils/services/participant-identity'
import type {
  AdminCampaignCandidateRow,
  AdminCampaignSubmissionRow,
  CampaignFlowStep,
  SubmissionRow,
} from './types'

export function getParticipantName(row: SubmissionRow) {
  return getSubmissionParticipantName(row)
}

export function getParticipantEmail(row: SubmissionRow) {
  return getSubmissionParticipantEmail(row)
}

export function getParticipantOrganisation(row: SubmissionRow) {
  return getSubmissionParticipantOrganisation(row)
}

export function getParticipantRole(row: SubmissionRow) {
  return getSubmissionParticipantRole(row)
}

export function getCandidateKey(row: SubmissionRow) {
  if (row.invitation_id) return `invitation:${row.invitation_id}`
  const email = getParticipantEmail(row).toLowerCase()
  if (email) return `email:${email}`
  return `submission:${row.id}`
}

export function matchesQuery(values: Array<string | null | undefined>, query: string) {
  if (!query) return true
  const haystack = values
    .map((value) => normalizeText(value).toLowerCase())
    .filter(Boolean)
    .join(' ')
  return haystack.includes(query)
}

export function toSubmissionListRow(input: {
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

export function toCandidateRows(
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
