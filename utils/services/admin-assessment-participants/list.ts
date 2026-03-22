import { normalizeEmail, normalizeText, pickRelation } from '@/utils/services/participant-identity'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildAdminAssessmentParticipants,
  getParticipantIdentitySource,
  participantMatchesQuery,
  safeDateMax,
} from './aggregate'
import { loadParticipantRecords, loadParticipantSourceRows } from './query'
import type { AdminAssessmentParticipantRow, ParticipantFilters } from './types'

export async function listAdminAssessmentParticipants(input: {
  adminClient: SupabaseClient
  filters?: ParticipantFilters
}) {
  const query = normalizeText(input.filters?.q).toLowerCase()
  const rowsResult = await loadParticipantSourceRows(input)
  if (!rowsResult.ok) return rowsResult
  const participantRecords = await loadParticipantRecords({
    adminClient: input.adminClient,
    participantIds: [
      ...rowsResult.data.submissions.map((row) => row.participant_id ?? ''),
      ...rowsResult.data.invitations.map((row) => row.participant_id ?? ''),
    ],
  })

  const participantMap = buildAdminAssessmentParticipants({
    submissions: rowsResult.data.submissions,
    invitations: rowsResult.data.invitations,
    participantRecords,
  })

  const rows = [...participantMap.values()]
    .filter((participant) => participantMatchesQuery(participant, query))
    .map((participant) => {
      const completedAssessments = new Set(participant.submissions.map((row) => row.assessment_id)).size
      const touchedAssessments = new Set([
        ...participant.submissions.map((row) => row.assessment_id),
        ...participant.invitations.map((row) => row.assessment_id),
      ]).size
      const campaignsInvolved = new Set(
        [...participant.submissions.map((row) => row.campaign_id), ...participant.invitations.map((row) => row.campaign_id)]
          .filter((value): value is string => Boolean(value))
      ).size
      const pendingInvitations = participant.invitations.filter((row) => row.status !== 'completed').length
      const lastActivityAt = safeDateMax([
        participant.submissions[0]?.created_at,
        participant.invitations[0]?.completed_at,
        participant.invitations[0]?.created_at,
      ])
      const latestSubmission = participant.submissions[0]
      const identitySource = getParticipantIdentitySource(participant)

      return {
        participantRecordId: participant.participantRecordId,
        participantKey: participant.participantKey,
        participantName: identitySource === 'anonymous' ? 'Anonymous participant' : participant.participantName,
        email: normalizeEmail(participant.email) || null,
        organisation: participant.organisation,
        role: participant.role,
        identitySource,
        status: participant.participantStatus,
        contactId: participant.contactId,
        contactHref: participant.contactId ? `/dashboard/contacts/${encodeURIComponent(participant.contactId)}` : null,
        assessmentsCompleted: completedAssessments,
        assessmentsTouched: touchedAssessments,
        campaignsInvolved,
        responseCount: participant.submissions.length,
        pendingInvitations,
        lastActivityAt,
        detailHref: `/dashboard/assessment-participants/${encodeURIComponent(participant.participantKey)}`,
        latestSubmission: latestSubmission
          ? {
              submissionId: latestSubmission.id,
              assessmentId: latestSubmission.assessment_id,
              detailHref: `/dashboard/assessments/${encodeURIComponent(latestSubmission.assessment_id)}/responses/${encodeURIComponent(latestSubmission.id)}`,
            }
          : null,
      } satisfies AdminAssessmentParticipantRow
    })
    .sort((left, right) => {
      const leftDate = left.lastActivityAt ?? ''
      const rightDate = right.lastActivityAt ?? ''
      return leftDate < rightDate ? 1 : -1
    })

  const assessmentOptions = new Map<string, { id: string; name: string }>()
  for (const row of rowsResult.data.submissions) {
    const assessment = pickRelation(row.assessments)
    if (assessment?.id && assessment?.name) assessmentOptions.set(assessment.id, { id: assessment.id, name: assessment.name })
  }
  for (const row of rowsResult.data.invitations) {
    const assessment = pickRelation(row.assessments)
    if (assessment?.id && assessment?.name) assessmentOptions.set(assessment.id, { id: assessment.id, name: assessment.name })
  }

  const campaignOptions = new Map<string, { id: string; name: string }>()
  for (const row of rowsResult.data.submissions) {
    const campaign = pickRelation(row.campaigns)
    if (campaign?.id && campaign?.name) campaignOptions.set(campaign.id, { id: campaign.id, name: campaign.name })
  }
  for (const row of rowsResult.data.invitations) {
    const campaign = pickRelation(row.campaigns)
    if (campaign?.id && campaign?.name) campaignOptions.set(campaign.id, { id: campaign.id, name: campaign.name })
  }

  return {
    ok: true as const,
    data: {
      rows,
      filters: {
        assessments: [...assessmentOptions.values()].sort((left, right) => left.name.localeCompare(right.name)),
        campaigns: [...campaignOptions.values()].sort((left, right) => left.name.localeCompare(right.name)),
      },
    },
  }
}
