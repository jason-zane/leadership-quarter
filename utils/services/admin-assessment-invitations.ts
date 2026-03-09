import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import { sendSurveyInvitationEmail } from '@/utils/assessments/email'
import { getPortalBaseUrl } from '@/utils/hosts'

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
  const baseUrl = getPortalBaseUrl()

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
  const rows = normalized.invitations
    .map((item, index) => {
      if (!item.email) {
        invalidRowIndexes.push(index)
        return null
      }

      return {
        assessment_id: input.assessmentId,
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
    .filter((row): row is NonNullable<typeof row> => row !== null)

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
  const rows = normalized.invitations
    .map((item, index) => {
      if (!item.email) {
        invalidRows.push({
          row_index: index,
          code: 'missing_email',
          message: 'Email is required.',
        })
        return null
      }

      return {
        assessment_id: input.assessmentId,
        cohort_id: input.cohortId,
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
    .filter((row): row is NonNullable<typeof row> => row !== null)

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
