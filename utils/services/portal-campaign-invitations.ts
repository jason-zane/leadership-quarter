import type { SupabaseClient } from '@supabase/supabase-js'
import { sendSurveyInvitationEmail } from '@/utils/assessments/email'

type InviteInput = {
  assessment_id?: string
  email?: string
  first_name?: string
  firstName?: string
  last_name?: string
  lastName?: string
  organisation?: string
  role?: string
}

type CampaignAssessmentRow = {
  assessment_id: string
  sort_order: number
  is_active: boolean
  assessments:
    | { id: string; name: string; status: string }
    | Array<{ id: string; name: string; status: string }>
    | null
}

type PortalCampaignInvitationListResult =
  | {
      ok: true
      data: {
        invitations: unknown[]
      }
    }
  | {
      ok: false
      error: 'not_found' | 'internal_error'
      message: string
    }

type PortalCampaignInvitationCreateResult =
  | {
      ok: true
      data: {
        invitations: unknown[]
        errors?: Array<{ row_index: number; code: string; message: string }>
      }
    }
  | {
      ok: false
      error: 'validation_error' | 'not_found' | 'internal_error'
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

export function parsePortalCampaignInvitationsPayload(body: unknown): {
  sendNow: boolean
  expiresAt: string | null
  invitations: InviteInput[]
} {
  if (!body || typeof body !== 'object') {
    return { sendNow: false, expiresAt: null, invitations: [] }
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
    invitations: Array.isArray(input.invitations) ? (input.invitations as InviteInput[]) : [],
  }
}

export async function listPortalCampaignInvitations(input: {
  adminClient: SupabaseClient
  organisationId: string
  campaignId: string
}): Promise<PortalCampaignInvitationListResult> {
  const { data: campaign } = await input.adminClient
    .from('campaigns')
    .select('id')
    .eq('id', input.campaignId)
    .eq('organisation_id', input.organisationId)
    .maybeSingle()

  if (!campaign) {
    return {
      ok: false,
      error: 'not_found',
      message: 'Campaign was not found.',
    }
  }

  const { data, error } = await input.adminClient
    .from('assessment_invitations')
    .select(
      'id, campaign_id, assessment_id, email, first_name, last_name, organisation, role, status, sent_at, opened_at, started_at, completed_at, expires_at, token, created_at, updated_at, assessments(id, key, name:external_name)'
    )
    .eq('campaign_id', input.campaignId)
    .order('created_at', { ascending: false })

  if (error) {
    return {
      ok: false,
      error: 'internal_error',
      message: 'Failed to load invitations.',
    }
  }

  return {
    ok: true,
    data: {
      invitations: data ?? [],
    },
  }
}

export async function createPortalCampaignInvitations(input: {
  adminClient: SupabaseClient
  organisationId: string
  userId: string
  campaignId: string
  portalBaseUrl: string
  payload: unknown
}): Promise<PortalCampaignInvitationCreateResult> {
  const body = parsePortalCampaignInvitationsPayload(input.payload)

  if (body.invitations.length === 0) {
    return {
      ok: false,
      error: 'validation_error',
      message: 'At least one invitation is required.',
    }
  }

  const { data: campaign } = await input.adminClient
    .from('campaigns')
    .select(
      'id, name:external_name, campaign_assessments(id, assessment_id, sort_order, is_active, assessments(id, name:external_name, status))'
    )
    .eq('id', input.campaignId)
    .eq('organisation_id', input.organisationId)
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

  const assessmentNameById = new Map(
    activeRows
      .map((row) => {
        const assessment = pickRelation(row.assessments)
        return assessment ? [row.assessment_id, assessment.name] : null
      })
      .filter((entry): entry is [string, string] => Boolean(entry))
  )
  const allowedAssessmentIds = new Set(activeRows.map((row) => row.assessment_id))
  const invalidRows: Array<{ row_index: number; code: string; message: string }> = []
  const timestamp = new Date().toISOString()

  const rows = body.invitations
    .map((item, idx) => {
      const email = String(item.email ?? '').trim().toLowerCase()
      const assessmentId = String(item.assessment_id ?? defaultAssessmentData.id).trim()

      if (!isValidEmail(email)) {
        invalidRows.push({
          row_index: idx,
          code: 'invalid_email',
          message: 'Invalid email address.',
        })
        return null
      }

      if (!allowedAssessmentIds.has(assessmentId)) {
        invalidRows.push({
          row_index: idx,
          code: 'invalid_assessment',
          message: 'Assessment is not active for this campaign.',
        })
        return null
      }

      return {
        assessment_id: assessmentId,
        campaign_id: input.campaignId,
        email,
        first_name: String(item.first_name ?? item.firstName ?? '').trim() || null,
        last_name: String(item.last_name ?? item.lastName ?? '').trim() || null,
        organisation:
          typeof item.organisation === 'string' ? item.organisation.trim() || null : null,
        role: typeof item.role === 'string' ? item.role.trim() || null : null,
        status: body.sendNow ? 'sent' : 'pending',
        expires_at: body.expiresAt,
        sent_at: body.sendNow ? timestamp : null,
        created_by: input.userId,
        updated_at: timestamp,
      }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)

  if (rows.length === 0) {
    return {
      ok: false,
      error: 'validation_error',
      message: 'No valid invitations were provided.',
      errors: invalidRows,
    }
  }

  const { data: insertedRows, error: insertError } = await input.adminClient
    .from('assessment_invitations')
    .insert(rows)
    .select('id, token, email, first_name, last_name, status, assessment_id, created_at')

  if (insertError || !insertedRows) {
    return {
      ok: false,
      error: 'internal_error',
      message: 'Failed to create invitations.',
    }
  }

  if (body.sendNow) {
    await Promise.all(
      insertedRows.map((row) =>
        sendSurveyInvitationEmail({
          to: row.email,
          firstName: row.first_name,
          surveyName: assessmentNameById.get(row.assessment_id) ?? defaultAssessmentData.name,
          invitationUrl: `${input.portalBaseUrl}/assess/i/${row.token}`,
        })
      )
    )
  }

  return {
    ok: true,
    data: {
      invitations: insertedRows,
      errors: invalidRows.length > 0 ? invalidRows : undefined,
    },
  }
}
