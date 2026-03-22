import { reportAccessTtlSeconds } from '@/utils/services/platform-settings-runtime'
import { createReportAccessToken } from '@/utils/security/report-access'
import { buildDemographicEntries } from '@/utils/services/response-experience'
import {
  getInvitationParticipantEmail,
  getInvitationParticipantName,
  getSubmissionParticipantEmail,
  getSubmissionParticipantName,
  getSubmissionParticipantOrganisation,
  getSubmissionParticipantRole,
  normalizeEmail,
  normalizeText,
  pickRelation,
} from '@/utils/services/participant-identity'
import type {
  AdminAssessmentParticipantAccumulator,
  AdminAssessmentParticipantInvitationRow,
  AdminAssessmentParticipantSubmissionRow,
  InvitationRow,
  ParticipantRecordRow,
  SubmissionRow,
} from './types'

export function safeDateMax(values: Array<string | null | undefined>) {
  const filtered = values.filter((value): value is string => Boolean(value))
  return filtered.sort((left, right) => (left < right ? 1 : -1))[0] ?? null
}

export function formatSubmittedLabel(value: string) {
  return `Submitted ${new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))}`
}

export function makeParticipantKey(input: {
  participantRecordId?: string | null
  contactId: string | null
  email: string | null
  fallbackId: string
}) {
  if (input.participantRecordId) return `participant:${input.participantRecordId}`
  if (input.contactId) return `contact:${input.contactId}`
  const email = normalizeEmail(input.email)
  if (email) return `email:${email}`
  return `orphan:${input.fallbackId}`
}

export function getSubmissionContactId(row: SubmissionRow) {
  return row.contact_id ?? pickRelation(row.assessment_invitations)?.contact_id ?? null
}

export function getSubmissionParticipantId(row: SubmissionRow) {
  return row.participant_id ?? null
}

export function getSubmissionEmail(row: SubmissionRow) {
  return getSubmissionParticipantEmail(row)
}

export function getSubmissionName(row: SubmissionRow) {
  return getSubmissionParticipantName(row)
}

export function getSubmissionOrganisation(row: SubmissionRow) {
  return getSubmissionParticipantOrganisation(row)
}

export function getSubmissionRole(row: SubmissionRow) {
  return getSubmissionParticipantRole(row)
}

export function getInvitationEmail(row: InvitationRow) {
  return getInvitationParticipantEmail(row)
}

export function getInvitationParticipantId(row: InvitationRow) {
  return row.participant_id ?? null
}

export function getInvitationName(row: InvitationRow) {
  return getInvitationParticipantName(row)
}

export function getParticipantIdentityValues(participant: AdminAssessmentParticipantAccumulator) {
  const latestSubmission = participant.submissions[0] ?? null
  const latestInvitation = participant.invitations[0] ?? null

  const participantName =
    latestSubmission
      ? getSubmissionName(latestSubmission)
      : latestInvitation
        ? getInvitationName(latestInvitation)
        : 'Unknown participant'

  const email =
    latestSubmission
      ? getSubmissionEmail(latestSubmission)
      : latestInvitation
        ? getInvitationEmail(latestInvitation)
        : ''

  const organisation =
    latestSubmission
      ? getSubmissionOrganisation(latestSubmission)
      : normalizeText(latestInvitation?.organisation) || null

  const role =
    latestSubmission
      ? getSubmissionRole(latestSubmission)
      : normalizeText(latestInvitation?.role) || null

  return {
    participantName,
    email: email || null,
    organisation,
    role,
  }
}

export function getParticipantIdentitySource(participant: AdminAssessmentParticipantAccumulator): 'contact' | 'email' | 'anonymous' {
  if (participant.contactId) return 'contact'
  if (normalizeEmail(participant.email)) return 'email'
  return 'anonymous'
}

export function toSubmissionSummaryRow(row: SubmissionRow): AdminAssessmentParticipantSubmissionRow {
  const assessment = pickRelation(row.assessments)
  const campaign = pickRelation(row.campaigns)
  const accessToken = createReportAccessToken({
    report: 'assessment',
    submissionId: row.id,
    expiresInSeconds: reportAccessTtlSeconds(),
  })
  return {
    submissionId: row.id,
    assessmentId: row.assessment_id,
    assessmentKey: assessment?.key ?? '',
    assessmentName: assessment?.name ?? 'Assessment',
    campaignId: row.campaign_id,
    campaignName: campaign?.name ?? null,
    campaignSlug: campaign?.slug ?? null,
    participantName: getSubmissionName(row),
    email: getSubmissionEmail(row) || null,
    organisation: getSubmissionOrganisation(row),
    role: getSubmissionRole(row),
    submittedAt: row.created_at,
    demographics: buildDemographicEntries(row.demographics),
    detailHref: `/dashboard/assessments/${encodeURIComponent(row.assessment_id)}/responses/${encodeURIComponent(row.id)}`,
    reportsHref: `/dashboard/assessments/${encodeURIComponent(row.assessment_id)}/responses/${encodeURIComponent(row.id)}?tab=reports`,
    currentReportHref: accessToken
      ? `/assess/r/assessment?access=${encodeURIComponent(accessToken)}`
      : null,
  }
}

export function toInvitationSummaryRow(row: InvitationRow): AdminAssessmentParticipantInvitationRow {
  return {
    invitationId: row.id,
    assessmentId: row.assessment_id,
    assessmentName: pickRelation(row.assessments)?.name ?? 'Assessment',
    campaignId: row.campaign_id,
    campaignName: pickRelation(row.campaigns)?.name ?? null,
    status: row.status,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }
}

export function buildAdminAssessmentParticipants(input: {
  submissions: SubmissionRow[]
  invitations: InvitationRow[]
  participantRecords?: Map<string, ParticipantRecordRow>
}): Map<string, AdminAssessmentParticipantAccumulator> {
  const participants = new Map<string, AdminAssessmentParticipantAccumulator>()

  function ensureParticipant(args: {
    participantRecordId: string | null
    participantKey: string
    contactId: string | null
    email: string
  }) {
    const existing = participants.get(args.participantKey)
    if (existing) return existing
    const participantRecord = input.participantRecords?.get(args.participantRecordId ?? '') ?? null

    const created: AdminAssessmentParticipantAccumulator = {
      participantRecordId: args.participantRecordId,
      participantStatus: participantRecord?.status ?? 'active',
      participantKey: args.participantKey,
      contactId: args.contactId ?? participantRecord?.contact_id ?? null,
      email: args.email || normalizeEmail(participantRecord?.email) || '',
      participantName: 'Unknown participant',
      organisation: null,
      role: null,
      submissions: [],
      invitations: [],
    }
    participants.set(args.participantKey, created)
    return created
  }

  for (const row of input.submissions) {
    const participantKey = makeParticipantKey({
      participantRecordId: getSubmissionParticipantId(row),
      contactId: getSubmissionContactId(row),
      email: getSubmissionEmail(row),
      fallbackId: row.id,
    })
    ensureParticipant({
      participantRecordId: getSubmissionParticipantId(row),
      participantKey,
      contactId: getSubmissionContactId(row),
      email: getSubmissionEmail(row),
    }).submissions.push(row)
  }

  for (const row of input.invitations) {
    const participantKey = makeParticipantKey({
      participantRecordId: getInvitationParticipantId(row),
      contactId: row.contact_id,
      email: getInvitationEmail(row),
      fallbackId: row.id,
    })
    ensureParticipant({
      participantRecordId: getInvitationParticipantId(row),
      participantKey,
      contactId: row.contact_id,
      email: getInvitationEmail(row),
    }).invitations.push(row)
  }

  for (const participant of participants.values()) {
    participant.submissions.sort((left, right) => (left.created_at < right.created_at ? 1 : -1))
    participant.invitations.sort((left, right) => (left.created_at < right.created_at ? 1 : -1))
    const identity = getParticipantIdentityValues(participant)
    participant.participantName = identity.participantName
    participant.email = identity.email ?? ''
    participant.organisation = identity.organisation
    participant.role = identity.role
  }

  return participants
}

export function participantMatchesQuery(participant: AdminAssessmentParticipantAccumulator, query: string) {
  if (!query) return true
  const haystack = [
    participant.participantName,
    participant.email,
    participant.organisation,
    participant.role,
    ...participant.submissions.flatMap((row) => [
      pickRelation(row.assessments)?.name ?? '',
      pickRelation(row.campaigns)?.name ?? '',
    ]),
    ...participant.invitations.flatMap((row) => [
      pickRelation(row.assessments)?.name ?? '',
      pickRelation(row.campaigns)?.name ?? '',
    ]),
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}
