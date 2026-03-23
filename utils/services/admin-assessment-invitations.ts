import type { SupabaseClient } from '@supabase/supabase-js'
import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import { sendSurveyInvitationEmail } from '@/utils/assessments/email'
import { getPublicBaseUrl } from '@/utils/hosts'
import { ensureAssessmentParticipant } from '@/utils/services/assessment-participants'
import { getOrgAssessmentQuotaStatus } from '@/utils/services/org-quota'

type AdminClient = RouteAuthSuccess['adminClient']

type InvitationRecord = {
  id: string
  assessment_id: string
  cohort_id: string | null
  token: string
  email: string
  first_name: string | null
  last_name: string | null
  organisation: string | null
  role: string | null
  status: string | null
  sent_at: string | null
  opened_at: string | null
  started_at: string | null
  completed_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

type InsertedInvitationRecord = {
  id: string
  token: string
  email: string
  first_name: string | null
  last_name: string | null
  status: string | null
  assessment_id: string
  created_at: string
}

type BaseInviteInput = {
  email?: string
  first_name?: string
  firstName?: string
  last_name?: string
  lastName?: string
  organisation?: string
  role?: string
}

type NormalizedInviteInput = {
  email: string
  firstName: string | null
  lastName: string | null
  organisation: string | null
  role: string | null
}

type ListResult =
  | {
      ok: true
      data: {
        invitations: InvitationRecord[]
      }
    }
  | {
      ok: false
      error: 'invitations_list_failed'
    }

type AssessmentInvalidRow = {
  row_index: number
  code: 'missing_required'
  message: 'email is required'
}

type CohortInvalidRow = {
  row_index: number
  code: 'missing_email'
  message: 'Email is required.'
}

type CreateAssessmentInvitationsResult =
  | {
      ok: true
      data: {
        invitations: InsertedInvitationRecord[]
        invitation: InsertedInvitationRecord | null
        errors: AssessmentInvalidRow[]
      }
    }
  | {
      ok: false
      error: 'invalid_invitations' | 'invitation_create_failed'
      message?: string
      errors?: AssessmentInvalidRow[]
    }

type CreateCohortInvitationsResult =
  | {
      ok: true
      data: {
        invitations: InsertedInvitationRecord[]
        errors?: CohortInvalidRow[]
      }
    }
  | {
      ok: false
      error: 'invalid_invitations' | 'invitations_create_failed'
      message?: string
      errors?: CohortInvalidRow[]
    }

function normalizeInviteItem(item: BaseInviteInput): NormalizedInviteInput {
  return {
    email: String(item.email ?? '').trim().toLowerCase(),
    firstName: String(item.first_name ?? item.firstName ?? '').trim() || null,
    lastName: String(item.last_name ?? item.lastName ?? '').trim() || null,
    organisation: String(item.organisation ?? '').trim() || null,
    role: String(item.role ?? '').trim() || null,
  }
}

function normalizeAssessmentInvitationPayload(body: unknown) {
  if (!body || typeof body !== 'object') {
    return { sendNow: false, invitations: [] as NormalizedInviteInput[] }
  }

  const input = body as Record<string, unknown>
  const sendNow = input.send_now === true || input.sendNow === true

  if (Array.isArray(input.invitations)) {
    return {
      sendNow,
      invitations: input.invitations.map((row) => normalizeInviteItem((row ?? {}) as BaseInviteInput)),
    }
  }

  const invite = normalizeInviteItem(input as BaseInviteInput)
  return {
    sendNow,
    invitations: invite.email ? [invite] : [],
  }
}

function normalizeCohortInvitationPayload(body: unknown) {
  if (!body || typeof body !== 'object') {
    return { sendNow: false, expiresAt: null as string | null, invitations: [] as NormalizedInviteInput[] }
  }

  const input = body as Record<string, unknown>
  return {
    sendNow: input.send_now === true || input.sendNow === true || input.send === true,
    expiresAt:
      typeof input.expires_at === 'string'
        ? input.expires_at
        : typeof input.expiresAt === 'string'
          ? input.expiresAt
          : null,
    invitations: Array.isArray(input.invitations)
      ? input.invitations.map((row) => normalizeInviteItem((row ?? {}) as BaseInviteInput))
      : [],
  }
}

async function loadAssessmentName(adminClient: AdminClient, assessmentId: string) {
  const { data } = await adminClient.from('assessments').select('external_name').eq('id', assessmentId).maybeSingle()
  return data?.external_name ?? 'Assessment'
}

async function sendInvitationEmails(adminClient: AdminClient, assessmentId: string, rows: InsertedInvitationRecord[]) {
  if (rows.length === 0) return

  const surveyName = await loadAssessmentName(adminClient, assessmentId)
  const baseUrl = getPublicBaseUrl()

  await Promise.all(
    rows.map((row) =>
      sendSurveyInvitationEmail({
        to: row.email,
        firstName: row.first_name,
        surveyName,
        invitationUrl: `${baseUrl}/assess/i/${row.token}`,
      })
    )
  )
}

export async function listAdminAssessmentInvitations(input: {
  adminClient: AdminClient
  assessmentId: string
  cohortId?: string | null
}): Promise<ListResult> {
  let query = input.adminClient
    .from('assessment_invitations')
    .select(
      'id, assessment_id, cohort_id, token, email, first_name, last_name, organisation, role, status, sent_at, opened_at, started_at, completed_at, expires_at, created_at, updated_at'
    )
    .eq('assessment_id', input.assessmentId)
    .order('created_at', { ascending: false })

  query =
    input.cohortId === undefined || input.cohortId === null
      ? query.is('cohort_id', null)
      : query.eq('cohort_id', input.cohortId)

  const { data, error } = await query

  if (error) {
    return { ok: false, error: 'invitations_list_failed' }
  }

  return {
    ok: true,
    data: {
      invitations: (data ?? []) as InvitationRecord[],
    },
  }
}

export async function createAdminAssessmentInvitations(input: {
  adminClient: AdminClient
  userId: string
  assessmentId: string
  payload: unknown
}): Promise<CreateAssessmentInvitationsResult> {
  const normalized = normalizeAssessmentInvitationPayload(input.payload)

  if (normalized.invitations.length === 0) {
    return { ok: false, error: 'invalid_invitations' }
  }

  const invalidRowIndexes: number[] = []
  const nowIso = new Date().toISOString()
  const rowPromises = normalized.invitations
    .map(async (item, index) => {
      if (!item.email) {
        invalidRowIndexes.push(index)
        return null
      }

      const participant = await ensureAssessmentParticipant({
        client: input.adminClient,
        email: item.email,
        firstName: item.firstName,
        lastName: item.lastName,
        organisation: item.organisation,
        role: item.role,
      })

      return {
        assessment_id: input.assessmentId,
        participant_id: participant.data?.id ?? null,
        email: item.email,
        first_name: item.firstName,
        last_name: item.lastName,
        organisation: item.organisation,
        role: item.role,
        status: normalized.sendNow ? 'sent' : 'pending',
        sent_at: normalized.sendNow ? nowIso : null,
        created_by: input.userId,
        updated_at: nowIso,
      }
    })

  const rows = (await Promise.all(rowPromises)).filter((row): row is NonNullable<typeof row> => row !== null)

  const errors = invalidRowIndexes.map(
    (rowIndex) =>
      ({
        row_index: rowIndex,
        code: 'missing_required',
        message: 'email is required',
      }) satisfies AssessmentInvalidRow
  )

  if (rows.length === 0) {
    return {
      ok: false,
      error: 'invalid_invitations',
      errors,
    }
  }

  const { data, error } = await input.adminClient
    .from('assessment_invitations')
    .insert(rows)
    .select('id, token, email, first_name, last_name, status, assessment_id, created_at')

  if (error || !data) {
    return {
      ok: false,
      error: 'invitation_create_failed',
      message: error?.message,
    }
  }

  const invitations = data as InsertedInvitationRecord[]

  if (normalized.sendNow) {
    await sendInvitationEmails(input.adminClient, input.assessmentId, invitations)
  }

  return {
    ok: true,
    data: {
      invitations,
      invitation: invitations[0] ?? null,
      errors,
    },
  }
}

export async function createAdminCohortInvitations(input: {
  adminClient: AdminClient
  userId: string
  assessmentId: string
  cohortId: string
  payload: unknown
}): Promise<CreateCohortInvitationsResult> {
  const normalized = normalizeCohortInvitationPayload(input.payload)

  if (normalized.invitations.length === 0) {
    return { ok: false, error: 'invalid_invitations' }
  }

  const nowIso = new Date().toISOString()
  const invalidRows: CohortInvalidRow[] = []
  const rowPromises = normalized.invitations
    .map(async (item, index) => {
      if (!item.email) {
        invalidRows.push({
          row_index: index,
          code: 'missing_email',
          message: 'Email is required.',
        })
        return null
      }

      const participant = await ensureAssessmentParticipant({
        client: input.adminClient,
        email: item.email,
        firstName: item.firstName,
        lastName: item.lastName,
        organisation: item.organisation,
        role: item.role,
      })

      return {
        assessment_id: input.assessmentId,
        cohort_id: input.cohortId,
        participant_id: participant.data?.id ?? null,
        email: item.email,
        first_name: item.firstName,
        last_name: item.lastName,
        organisation: item.organisation,
        role: item.role,
        status: normalized.sendNow ? 'sent' : 'pending',
        expires_at: normalized.expiresAt,
        sent_at: normalized.sendNow ? nowIso : null,
        created_by: input.userId,
        updated_at: nowIso,
      }
    })

  const rows = (await Promise.all(rowPromises)).filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length === 0) {
    return {
      ok: false,
      error: 'invalid_invitations',
      errors: invalidRows,
    }
  }

  const { data, error } = await input.adminClient
    .from('assessment_invitations')
    .insert(rows)
    .select('id, token, email, first_name, last_name, status, assessment_id, created_at')

  if (error || !data) {
    return {
      ok: false,
      error: 'invitations_create_failed',
      message: error?.message,
    }
  }

  const invitations = data as InsertedInvitationRecord[]

  if (normalized.sendNow) {
    await sendInvitationEmails(input.adminClient, input.assessmentId, invitations)
  }

  return {
    ok: true,
    data: {
      invitations,
      ...(invalidRows.length > 0 ? { errors: invalidRows } : {}),
    },
  }
}

// ---------------------------------------------------------------------------
// Campaign-centric invitations (admin)
// ---------------------------------------------------------------------------

type CampaignAssessmentRow = {
  assessment_id: string
  sort_order: number
  is_active: boolean
  assessments:
    | { id: string; name: string; status: string }
    | Array<{ id: string; name: string; status: string }>
    | null
}

type CreateAdminCampaignInvitationsResult =
  | {
      ok: true
      data: {
        invitations: InsertedInvitationRecord[]
        errors?: Array<{ row_index: number; code: string; message: string }>
      }
    }
  | {
      ok: false
      error: 'validation_error' | 'not_found' | 'internal_error' | 'org_quota_reached'
      message: string
      errors?: Array<{ row_index: number; code: string; message: string }>
    }

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function createAdminCampaignInvitations(input: {
  adminClient: AdminClient | SupabaseClient
  userId: string
  campaignId: string
  publicBaseUrl: string
  payload: unknown
}): Promise<CreateAdminCampaignInvitationsResult> {
  const body = normalizeAdminCampaignPayload(input.payload)

  if (body.invitations.length === 0) {
    return {
      ok: false,
      error: 'validation_error',
      message: 'At least one invitation is required.',
    }
  }

  const { data: campaign } = await (input.adminClient as SupabaseClient)
    .from('campaigns')
    .select(
      'id, organisation_id, name:external_name, campaign_assessments(id, assessment_id, sort_order, is_active, assessments(id, name:external_name, status))'
    )
    .eq('id', input.campaignId)
    .maybeSingle()

  if (!campaign) {
    return {
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    }
  }

  const campaignAssessmentRows = (campaign.campaign_assessments ?? []) as CampaignAssessmentRow[]
  const activeRows = campaignAssessmentRows
    .filter((row) => row.is_active)
    .sort((a, b) => a.sort_order - b.sort_order)

  const defaultAssessment = activeRows[0]
  const defaultAssessmentData = pickRelation(defaultAssessment?.assessments ?? null)

  if (!defaultAssessmentData || defaultAssessmentData.status !== 'active') {
    return {
      ok: false,
      error: 'validation_error',
      message: 'Campaign has no active assessment to invite against.',
    }
  }

  const invalidRows: Array<{ row_index: number; code: string; message: string }> = []
  const timestamp = new Date().toISOString()

  const rowPromises = body.invitations.map(async (item, idx) => {
    if (!item.email || !isValidEmail(item.email)) {
      invalidRows.push({
        row_index: idx,
        code: 'invalid_email',
        message: 'Invalid email address.',
      })
      return null
    }

    const participant = await ensureAssessmentParticipant({
      client: input.adminClient as SupabaseClient,
      email: item.email,
      firstName: item.firstName,
      lastName: item.lastName,
      organisation: item.organisation,
      role: item.role,
    })

    return {
      assessment_id: defaultAssessmentData.id,
      campaign_id: input.campaignId,
      participant_id: participant.data?.id ?? null,
      email: item.email,
      first_name: item.firstName,
      last_name: item.lastName,
      organisation: item.organisation,
      role: item.role,
      status: body.sendNow ? 'sent' : 'pending',
      sent_at: body.sendNow ? timestamp : null,
      created_by: input.userId,
      updated_at: timestamp,
    }
  })

  const rows = (await Promise.all(rowPromises)).filter(
    (row): row is NonNullable<typeof row> => row !== null
  )

  if (rows.length === 0) {
    return {
      ok: false,
      error: 'validation_error',
      message: 'No valid invitations were provided.',
      errors: invalidRows,
    }
  }

  const orgId = (campaign as { organisation_id?: string | null }).organisation_id ?? null
  if (orgId) {
    const quotaStatus = await getOrgAssessmentQuotaStatus(
      input.adminClient as SupabaseClient,
      orgId,
      defaultAssessmentData.id
    )
    if (quotaStatus && quotaStatus.limit !== null && quotaStatus.used + rows.length > quotaStatus.limit) {
      return {
        ok: false,
        error: 'org_quota_reached',
        message: 'This assessment has reached the organisation quota.',
      }
    }
  }

  const { data: insertedRows, error: insertError } = await (input.adminClient as SupabaseClient)
    .from('assessment_invitations')
    .insert(rows)
    .select('id, token, email, first_name, last_name, status, assessment_id, created_at')

  if (insertError || !insertedRows) {
    const errorMsg = `${insertError?.message ?? ''} ${insertError?.details ?? ''}`.toLowerCase()
    if (errorMsg.includes('campaign_limit_reached')) {
      return {
        ok: false,
        error: 'validation_error',
        message: 'Campaign has reached its entry limit.',
      }
    }
    console.error('[admin-campaign-invitations] insert failed', {
      campaignId: input.campaignId,
      assessmentId: defaultAssessmentData.id,
      rowCount: rows.length,
      message: insertError?.message ?? null,
      details: insertError?.details ?? null,
      hint: insertError?.hint ?? null,
      code: insertError?.code ?? null,
    })
    return {
      ok: false,
      error: 'internal_error',
      message: insertError?.message ?? 'Failed to create invitations.',
    }
  }

  const invitations = insertedRows as InsertedInvitationRecord[]

  if (body.sendNow) {
    const campaignName = (campaign as { name?: string }).name ?? 'Assessment'
    await Promise.all(
      invitations.map((row) =>
        sendSurveyInvitationEmail({
          to: row.email,
          firstName: row.first_name,
          surveyName: campaignName,
          invitationUrl: `${input.publicBaseUrl}/assess/i/${row.token}`,
        })
      )
    )
  }

  return {
    ok: true,
    data: {
      invitations,
      ...(invalidRows.length > 0 ? { errors: invalidRows } : undefined),
    },
  }
}

function normalizeAdminCampaignPayload(body: unknown) {
  if (!body || typeof body !== 'object') {
    return { sendNow: false, invitations: [] as NormalizedInviteInput[] }
  }

  const input = body as Record<string, unknown>
  const sendNow = input.send_now === true || input.sendNow === true

  if (Array.isArray(input.invitations)) {
    return {
      sendNow,
      invitations: input.invitations.map((row) => normalizeInviteItem((row ?? {}) as BaseInviteInput)),
    }
  }

  const invite = normalizeInviteItem(input as BaseInviteInput)
  return {
    sendNow,
    invitations: invite.email ? [invite] : [],
  }
}
