import { warmPlatformSettings } from '@/utils/services/platform-settings-runtime'
import { getSubmissionTraitAverageMap } from '@/utils/services/response-experience'
import { normalizeText } from '@/utils/services/participant-identity'
import type { AdminClient } from '@/utils/services/admin-campaigns/types'
import {
  getCandidateKey,
  getParticipantEmail,
  getParticipantName,
  getParticipantOrganisation,
  getParticipantRole,
  matchesQuery,
  toCandidateRows,
  toSubmissionListRow,
} from './map'
import {
  loadCampaignAssessmentMap,
  loadCampaignSubmissions,
  loadFlowSteps,
} from './query'
import type {
  AdminCampaignCandidateJourney,
  AdminCampaignCandidateRow,
  AdminCampaignSubmissionRow,
} from './types'

export type {
  AdminCampaignCandidateJourney,
  AdminCampaignCandidateRow,
  AdminCampaignSubmissionRow,
} from './types'

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
  await warmPlatformSettings(input.adminClient)

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
    } satisfies AdminCampaignCandidateJourney,
  }
}

export async function getAdminCampaignSubmission(input: {
  adminClient: AdminClient
  campaignId: string
  submissionId: string
}) {
  await warmPlatformSettings(input.adminClient)

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
