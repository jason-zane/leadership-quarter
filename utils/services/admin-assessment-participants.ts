import { reportAccessTtlSeconds } from '@/utils/services/platform-settings-runtime'
import { sanitiseSearchQuery } from '@/utils/sanitise-search-query'
import { createReportAccessToken } from '@/utils/security/report-access'
import { updateAssessmentParticipantStatus } from '@/utils/services/assessment-participants'
import {
  buildDemographicEntries,
  buildItemResponses,
  buildResponseCompleteness,
  getSubmissionTraitAverageMap,
  isAssessmentReportConfig,
  listSubmissionReportOptions,
  normalizeClassicResponseReportOptions,
  type ResponseReportOption,
} from '@/utils/services/response-experience'
import { getSubmissionReportOptions } from '@/utils/services/submission-report-options'
import { getSubmissionReport } from '@/utils/services/submission-report'
import type { SupabaseClient } from '@supabase/supabase-js'

type SubmissionAssessmentRelation = {
  id?: string
  key?: string
  name?: string
  report_config?: unknown
}

type InvitationAssessmentRelation = {
  id?: string
  key?: string
  name?: string
}

type CampaignRelation = {
  id?: string
  name?: string
  slug?: string
}

type SubmissionInvitationRelation = {
  id?: string
  contact_id?: string | null
  status?: string | null
  completed_at?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  organisation?: string | null
  role?: string | null
}

type SubmissionRow = {
  id: string
  assessment_id: string
  campaign_id: string | null
  invitation_id: string | null
  participant_id: string | null
  contact_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
  demographics: Record<string, unknown> | null
  created_at: string
  assessments:
    | SubmissionAssessmentRelation
    | SubmissionAssessmentRelation[]
    | null
  campaigns:
    | CampaignRelation
    | CampaignRelation[]
    | null
  assessment_invitations:
    | SubmissionInvitationRelation
    | SubmissionInvitationRelation[]
    | null
}

type InvitationRow = {
  id: string
  assessment_id: string
  campaign_id: string | null
  participant_id: string | null
  contact_id: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
  status: string | null
  completed_at: string | null
  created_at: string
  expires_at: string | null
  assessments:
    | InvitationAssessmentRelation
    | InvitationAssessmentRelation[]
    | null
  campaigns:
    | CampaignRelation
    | CampaignRelation[]
    | null
}

type ContactRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  status: string
}

type ParticipantRecordRow = {
  id: string
  status: 'active' | 'archived'
  contact_id: string | null
  email: string | null
  first_name: string | null
  last_name: string | null
  organisation: string | null
  role: string | null
}

export type AdminAssessmentParticipantRow = {
  participantRecordId: string | null
  participantKey: string
  participantName: string
  email: string | null
  organisation: string | null
  role: string | null
  identitySource: 'contact' | 'email' | 'anonymous'
  status: 'active' | 'archived'
  contactId: string | null
  contactHref: string | null
  assessmentsCompleted: number
  assessmentsTouched: number
  campaignsInvolved: number
  responseCount: number
  pendingInvitations: number
  lastActivityAt: string | null
  detailHref: string
  latestSubmission:
    | {
        submissionId: string
        assessmentId: string
        detailHref: string
      }
    | null
}

export type AdminAssessmentParticipantSubmissionRow = {
  submissionId: string
  assessmentId: string
  assessmentKey: string
  assessmentName: string
  campaignId: string | null
  campaignName: string | null
  campaignSlug: string | null
  participantName: string
  email: string | null
  organisation: string | null
  role: string | null
  submittedAt: string
  demographics: Array<{ key: string; label: string; value: string }>
  detailHref: string
  reportsHref: string
  currentReportHref: string | null
}

export type AdminAssessmentParticipantInvitationRow = {
  invitationId: string
  assessmentId: string
  assessmentName: string
  campaignId: string | null
  campaignName: string | null
  status: string | null
  completedAt: string | null
  createdAt: string
  expiresAt: string | null
}

export type AdminAssessmentParticipantProfile = {
  participantRecordId: string | null
  participantKey: string
  participantName: string
  email: string | null
  organisation: string | null
  role: string | null
  identitySource: 'contact' | 'email' | 'anonymous'
  status: 'active' | 'archived'
  contact: {
    id: string
    name: string
    email: string
    status: string
    href: string
  } | null
  counts: {
    responses: number
    completedAssessments: number
    assessmentsTouched: number
    campaignsInvolved: number
    pendingInvitations: number
  }
  lastActivityAt: string | null
  submissions: AdminAssessmentParticipantSubmissionRow[]
  invitations: AdminAssessmentParticipantInvitationRow[]
}

export type AdminAssessmentParticipantSubmissionDetail = {
  submissionId: string
  assessmentId: string
  detailData: {
    participantName: string
    email: string | null
    contextLine: string
    submittedLabel: string
    demographics: Array<{ key: string; label: string; value: string }>
    completeness: {
      answeredItems: number
      totalItems: number
      completionPercent: number
    }
    traitScores: Array<{
      key: string
      label: string
      groupLabel: string | null
      value: number
      band: string | null
      meaning: string | null
    }>
    itemResponses: Array<{
      key: string
      text: string
      rawValue: number | null
      normalizedValue: number | null
      reverseCoded: boolean
      mappedTraits: string[]
    }>
    reportOptions: ResponseReportOption[]
  }
}

export type AdminAssessmentParticipantAccumulator = {
  participantRecordId: string | null
  participantStatus: 'active' | 'archived'
  participantKey: string
  contactId: string | null
  email: string
  participantName: string
  organisation: string | null
  role: string | null
  submissions: SubmissionRow[]
  invitations: InvitationRow[]
}

type ParticipantFilters = {
  q?: string
  assessmentId?: string
  campaignId?: string
}

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '').trim()
}

function normalizeEmail(value: string | null | undefined) {
  return normalizeText(value).toLowerCase()
}

function participantDisplayName(parts: Array<string | null | undefined>) {
  const value = parts.map((part) => normalizeText(part)).filter(Boolean).join(' ')
  return value || 'Unknown participant'
}

function safeDateMax(values: Array<string | null | undefined>) {
  const filtered = values.filter((value): value is string => Boolean(value))
  return filtered.sort((left, right) => (left < right ? 1 : -1))[0] ?? null
}

function formatSubmittedLabel(value: string) {
  return `Submitted ${new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))}`
}

function makeParticipantKey(input: {
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

function getSubmissionContactId(row: SubmissionRow) {
  return row.contact_id ?? pickRelation(row.assessment_invitations)?.contact_id ?? null
}

function getSubmissionParticipantId(row: SubmissionRow) {
  return row.participant_id ?? null
}

function getSubmissionEmail(row: SubmissionRow) {
  return normalizeEmail(row.email) || normalizeEmail(pickRelation(row.assessment_invitations)?.email)
}

function getSubmissionName(row: SubmissionRow) {
  const invitation = pickRelation(row.assessment_invitations)
  const firstName = normalizeText(row.first_name) || normalizeText(invitation?.first_name)
  const lastName = normalizeText(row.last_name) || normalizeText(invitation?.last_name)
  return participantDisplayName([firstName, lastName])
}

function getSubmissionOrganisation(row: SubmissionRow) {
  return normalizeText(row.organisation) || normalizeText(pickRelation(row.assessment_invitations)?.organisation) || null
}

function getSubmissionRole(row: SubmissionRow) {
  return normalizeText(row.role) || normalizeText(pickRelation(row.assessment_invitations)?.role) || null
}

function getInvitationEmail(row: InvitationRow) {
  return normalizeEmail(row.email)
}

function getInvitationParticipantId(row: InvitationRow) {
  return row.participant_id ?? null
}

function getInvitationName(row: InvitationRow) {
  return participantDisplayName([row.first_name, row.last_name])
}

function getParticipantIdentityValues(participant: AdminAssessmentParticipantAccumulator) {
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

function getParticipantIdentitySource(participant: AdminAssessmentParticipantAccumulator): 'contact' | 'email' | 'anonymous' {
  // Anonymous rows are legitimate today for campaign flows that intentionally
  // defer registration until after assessment completion.
  if (participant.contactId) return 'contact'
  if (normalizeEmail(participant.email)) return 'email'
  return 'anonymous'
}

function toSubmissionSummaryRow(row: SubmissionRow): AdminAssessmentParticipantSubmissionRow {
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

function toInvitationSummaryRow(row: InvitationRow): AdminAssessmentParticipantInvitationRow {
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

function participantMatchesQuery(participant: AdminAssessmentParticipantAccumulator, query: string) {
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

async function loadParticipantSourceRows(input: {
  adminClient: SupabaseClient
  filters?: ParticipantFilters
}) {
  const query = normalizeText(input.filters?.q).toLowerCase()
  const assessmentId = normalizeText(input.filters?.assessmentId) || null
  const campaignId = normalizeText(input.filters?.campaignId) || null

  let submissionsQuery = input.adminClient
    .from('assessment_submissions')
    .select(`
      id, assessment_id, campaign_id, invitation_id, participant_id, contact_id, first_name, last_name, email, organisation, role, demographics, created_at,
      assessments(id, key, name:external_name, report_config),
      campaigns(id, name:external_name, slug),
      assessment_invitations!survey_submissions_invitation_id_fkey(id, contact_id, status, completed_at, first_name, last_name, email, organisation, role)
    `)
    .eq('is_preview_sample', false)
    .order('created_at', { ascending: false })

  let invitationsQuery = input.adminClient
    .from('assessment_invitations')
    .select(`
      id, assessment_id, campaign_id, participant_id, contact_id, first_name, last_name, email, organisation, role, status, completed_at, created_at, expires_at,
      assessments(id, key, name:external_name),
      campaigns(id, name:external_name, slug)
    `)
    .order('created_at', { ascending: false })

  if (assessmentId) {
    submissionsQuery = submissionsQuery.eq('assessment_id', assessmentId)
    invitationsQuery = invitationsQuery.eq('assessment_id', assessmentId)
  }
  if (campaignId) {
    submissionsQuery = submissionsQuery.eq('campaign_id', campaignId)
    invitationsQuery = invitationsQuery.eq('campaign_id', campaignId)
  }
  if (query) {
    const sq = sanitiseSearchQuery(query)
    if (sq) {
      const orClause = `email.ilike.%${sq}%,first_name.ilike.%${sq}%,last_name.ilike.%${sq}%,organisation.ilike.%${sq}%,role.ilike.%${sq}%`
      submissionsQuery = submissionsQuery.or(orClause)
      invitationsQuery = invitationsQuery.or(orClause)
    }
  }

  const [{ data: submissionRows, error: submissionsError }, { data: invitationRows, error: invitationsError }] = await Promise.all([
    submissionsQuery,
    invitationsQuery,
  ])

  if (submissionsError || invitationsError) {
    return { ok: false as const, error: 'participants_list_failed' as const }
  }

  return {
    ok: true as const,
    data: {
      submissions: (submissionRows ?? []) as SubmissionRow[],
      invitations: (invitationRows ?? []) as InvitationRow[],
    },
  }
}

async function loadParticipantRecords(input: {
  adminClient: SupabaseClient
  participantIds: string[]
}) {
  const ids = [...new Set(input.participantIds.filter(Boolean))]
  if (ids.length === 0) {
    return new Map<string, ParticipantRecordRow>()
  }

  const table = input.adminClient.from('assessment_participants') as unknown as {
    select?: (columns: string) => {
      in: (field: string, values: string[]) => Promise<{ data: unknown; error: { message: string } | null }>
    }
  }
  if (typeof table.select !== 'function') {
    return new Map<string, ParticipantRecordRow>()
  }

  const { data, error } = await table
    .select('id, status, contact_id, email, first_name, last_name, organisation, role')
    .in('id', ids)

  if (error) {
    return new Map<string, ParticipantRecordRow>()
  }

  return new Map(((data ?? []) as ParticipantRecordRow[]).map((row) => [row.id, row]))
}

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

async function loadLinkedContact(input: {
  adminClient: SupabaseClient
  contactId: string | null
  email: string
}) {
  if (input.contactId) {
    const { data } = await input.adminClient
      .from('contacts')
      .select('id, first_name, last_name, email, status')
      .eq('id', input.contactId)
      .maybeSingle()

    if (data) return data as ContactRow
  }

  const normalizedEmail = normalizeEmail(input.email)
  if (!normalizedEmail) return null

  const { data } = await input.adminClient
    .from('contacts')
    .select('id, first_name, last_name, email, status')
    .eq('email_normalized', normalizedEmail)
    .maybeSingle()

  return (data as ContactRow | null) ?? null
}

export async function getAdminAssessmentParticipantProfile(input: {
  adminClient: SupabaseClient
  participantKey: string
}) {
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

export async function getAdminAssessmentParticipantSubmissionDetail(input: {
  adminClient: SupabaseClient
  submissionId: string
  assessmentId: string
}) {
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

export async function updateAdminAssessmentParticipantLifecycle(input: {
  adminClient: SupabaseClient
  participantId: string
  action: 'archive' | 'restore'
}) {
  const nextStatus = input.action === 'archive' ? 'archived' : 'active'
  return updateAssessmentParticipantStatus({
    client: input.adminClient,
    participantId: input.participantId,
    status: nextStatus,
  })
}
