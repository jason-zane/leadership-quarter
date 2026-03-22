import { reportAccessTtlSeconds, warmPlatformSettings } from '@/utils/services/platform-settings-runtime'
import {
  buildDemographicEntries,
  buildItemResponses,
  buildResponseCompleteness,
  getSubmissionTraitAverageMap,
  isAssessmentReportConfig,
  listSubmissionReportOptions,
  normalizeClassicResponseReportOptions,
} from '@/utils/services/response-experience'
import { getSubmissionReportOptions } from '@/utils/services/submission-report-options'
import { getSubmissionReport } from '@/utils/services/submission-report'
import { participantDisplayName } from '@/utils/services/participant-identity'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildAdminAssessmentParticipants,
  formatSubmittedLabel,
  toInvitationSummaryRow,
  toSubmissionSummaryRow,
} from './aggregate'
import { listAdminAssessmentParticipants } from './list'
import { loadLinkedContact, loadParticipantRecords, loadParticipantSourceRows } from './query'
import type {
  AdminAssessmentParticipantProfile,
  AdminAssessmentParticipantSubmissionDetail,
} from './types'

async function loadAdminParticipantRecords(input: {
  adminClient: SupabaseClient
  participantKey: string
}) {
  const rowsResult = await loadParticipantSourceRows({
    adminClient: input.adminClient,
  })
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
  const participant = participantMap.get(input.participantKey)

  if (!participant) {
    return { ok: false as const, error: 'participant_not_found' as const }
  }

  return {
    ok: true as const,
    data: {
      contactId: participant.contactId,
      email: participant.email,
      submissions: participant.submissions,
      invitations: participant.invitations,
    },
  }
}

export async function getAdminAssessmentParticipantProfile(input: {
  adminClient: SupabaseClient
  participantKey: string
}) {
  await warmPlatformSettings(input.adminClient)

  const base = await listAdminAssessmentParticipants({
    adminClient: input.adminClient,
  })

  if (!base.ok) {
    return base
  }

  const row = base.data.rows.find((candidate) => candidate.participantKey === input.participantKey)
  if (!row) {
    return { ok: false as const, error: 'participant_not_found' as const }
  }

  const all = await loadAdminParticipantRecords({
    adminClient: input.adminClient,
    participantKey: input.participantKey,
  })

  if (!all.ok) {
    return all
  }

  const linkedContact = await loadLinkedContact({
    adminClient: input.adminClient,
    contactId: all.data.contactId,
    email: all.data.email,
  })

  return {
    ok: true as const,
    data: {
      participantRecordId: row.participantRecordId,
      participantKey: row.participantKey,
      participantName: row.participantName,
      email: row.email,
      organisation: row.organisation,
      role: row.role,
      identitySource: row.identitySource,
      status: row.status,
      contact: linkedContact
        ? {
            id: linkedContact.id,
            name: participantDisplayName([linkedContact.first_name, linkedContact.last_name]),
            email: linkedContact.email,
            status: linkedContact.status,
            href: `/dashboard/contacts/${encodeURIComponent(linkedContact.id)}`,
          }
        : null,
      counts: {
        responses: row.responseCount,
        completedAssessments: row.assessmentsCompleted,
        assessmentsTouched: row.assessmentsTouched,
        campaignsInvolved: row.campaignsInvolved,
        pendingInvitations: row.pendingInvitations,
      },
      lastActivityAt: row.lastActivityAt,
      submissions: all.data.submissions.map(toSubmissionSummaryRow),
      invitations: all.data.invitations.map(toInvitationSummaryRow),
    } satisfies AdminAssessmentParticipantProfile,
  }
}

export async function getAdminAssessmentParticipantSubmissionDetail(input: {
  adminClient: SupabaseClient
  submissionId: string
  assessmentId: string
}) {
  await warmPlatformSettings(input.adminClient)

  const [submissionResult, reportResult, runtimeModule] = await Promise.all([
    input.adminClient
      .from('assessment_submissions')
      .select(
        'id, assessment_id, first_name, last_name, email, organisation, role, demographics, responses, normalized_responses, created_at'
      )
      .eq('assessment_id', input.assessmentId)
      .eq('is_preview_sample', false)
      .eq('id', input.submissionId)
      .maybeSingle(),
    getSubmissionReport({
      adminClient: input.adminClient,
      submissionId: input.submissionId,
    }),
    import('@/utils/services/assessment-runtime'),
  ])

  if (!submissionResult.data || !reportResult.ok) {
    return { ok: false as const, error: 'submission_not_found' as const }
  }

  const runtimeResult = await runtimeModule.getAssessmentRuntime({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
  })

  if (!runtimeResult.ok) {
    return { ok: false as const, error: 'submission_not_found' as const }
  }

  const submission = submissionResult.data as {
    id: string
    assessment_id: string
    first_name: string | null
    last_name: string | null
    email: string | null
    organisation: string | null
    role: string | null
    demographics: Record<string, unknown> | null
    responses: Record<string, number> | null
    normalized_responses: Record<string, number> | null
    created_at: string
  }

  const reportConfig = runtimeResult.data.reportConfig
  const reportOptions = isAssessmentReportConfig(reportConfig)
    ? await listSubmissionReportOptions({
        adminClient: input.adminClient,
        assessmentId: input.assessmentId,
        submissionId: input.submissionId,
        expiresInSeconds: reportAccessTtlSeconds(),
      })
    : normalizeClassicResponseReportOptions(
        await getSubmissionReportOptions({
          adminClient: input.adminClient,
          submissionId: input.submissionId,
          expiresInSeconds: reportAccessTtlSeconds(),
        })
      )
  const completeness = buildResponseCompleteness({
    questionBank: runtimeResult.data.definition.questionBank,
    rawResponses: submission.responses,
  })

  return {
    ok: true as const,
    data: {
      submissionId: submission.id,
      assessmentId: submission.assessment_id,
      detailData: {
        participantName: participantDisplayName([submission.first_name, submission.last_name]),
        email: submission.email,
        contextLine: [submission.organisation, submission.role].filter(Boolean).join(' · ') || 'No organisation or role stored',
        submittedLabel: formatSubmittedLabel(submission.created_at),
        demographics: buildDemographicEntries(submission.demographics),
        completeness,
        traitScores: reportResult.data.context.v2Report.trait_scores.map((item) => ({
          key: item.key,
          label: item.label,
          groupLabel: null,
          value: item.value,
          band: null,
          meaning: null,
        })),
        itemResponses: buildItemResponses({
          questionBank: runtimeResult.data.definition.questionBank,
          rawResponses: submission.responses,
          normalizedResponses: submission.normalized_responses,
        }),
        reportOptions,
      },
    } satisfies AdminAssessmentParticipantSubmissionDetail,
  }
}

export async function getAdminAssessmentParticipantMetrics(input: {
  adminClient: SupabaseClient
  submissionIds: string[]
}) {
  return getSubmissionTraitAverageMap(input.adminClient, input.submissionIds)
}
