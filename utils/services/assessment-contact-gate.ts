import { reportAccessTtlSeconds, warmPlatformSettings } from '@/utils/services/platform-settings-runtime'
import {
  createReportAccessToken,
  hasReportAccessTokenSecret,
  verifyGateAccessToken,
} from '@/utils/security/report-access'
import { ensureAssessmentParticipant } from '@/utils/services/assessment-participants'
import { createContactEvent, upsertContactByEmail } from '@/utils/services/contacts'
import { createAdminClient } from '@/utils/supabase/admin'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>
type GateTokenPayload = NonNullable<ReturnType<typeof verifyGateAccessToken>>

type SubmissionRow = {
  id: string
  campaign_id: string
  assessment_id: string
  campaigns: { name?: string } | { name?: string }[] | null
  assessments: { name?: string } | { name?: string }[] | null
}

export type AssessmentContactGateUnlockPayload = {
  firstName?: string
  lastName?: string
  workEmail?: string
  organisation?: string
  role?: string
  consent?: boolean
}

type ContactGateFailure = {
  ok: false
  error: string
}

export type GetAssessmentContactGateResult =
  | {
      ok: true
      data: {
        context: {
          campaignName: string | null
          assessmentName: string
        }
      }
    }
  | ContactGateFailure

export type UnlockAssessmentContactGateResult =
  | {
      ok: true
      data: {
        reportPath: '/assess/r/assessment'
        reportAccessToken: string
      }
    }
  | ContactGateFailure

function pickRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function loadGateSubmission(
  adminClient: AdminClient,
  payload: GateTokenPayload
): Promise<
  | {
      ok: true
      submission: SubmissionRow
      campaignName: string | null
      assessmentName: string
    }
  | ContactGateFailure
> {
  const { data: submissionRow, error } = await adminClient
    .from('assessment_submissions')
    .select('id, campaign_id, assessment_id, campaigns(name:external_name), assessments(name:external_name)')
    .eq('id', payload.submissionId)
    .maybeSingle()

  if (error || !submissionRow) {
    return { ok: false, error: 'submission_not_found' }
  }

  const submission = submissionRow as SubmissionRow
  if (
    submission.campaign_id !== payload.campaignId ||
    submission.assessment_id !== payload.assessmentId
  ) {
    return { ok: false, error: 'gate_invalid' }
  }

  const campaign = pickRelation(submission.campaigns)
  const assessment = pickRelation(submission.assessments)

  return {
    ok: true,
    submission,
    campaignName: campaign?.name ?? null,
    assessmentName: assessment?.name ?? 'Assessment',
  }
}

export async function getAssessmentContactGate(input: {
  token: string
}): Promise<GetAssessmentContactGateResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return { ok: false, error: 'missing_service_role' }
  }

  await warmPlatformSettings(adminClient)

  const payload = verifyGateAccessToken(input.token)
  if (!payload) {
    return { ok: false, error: 'gate_expired' }
  }

  const submissionResult = await loadGateSubmission(adminClient, payload)
  if (!submissionResult.ok) {
    return submissionResult
  }

  return {
    ok: true,
    data: {
      context: {
        campaignName: submissionResult.campaignName,
        assessmentName: submissionResult.assessmentName,
      },
    },
  }
}

export async function unlockAssessmentContactGate(input: {
  token: string
  payload: AssessmentContactGateUnlockPayload | null
}): Promise<UnlockAssessmentContactGateResult> {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return { ok: false, error: 'missing_service_role' }
  }

  if (process.env.NODE_ENV !== 'development' && !hasReportAccessTokenSecret()) {
    return { ok: false, error: 'missing_report_secret' }
  }

  const gatePayload = verifyGateAccessToken(input.token)
  if (!gatePayload) {
    return { ok: false, error: 'gate_expired' }
  }

  const firstName = String(input.payload?.firstName ?? '').trim()
  const lastName = String(input.payload?.lastName ?? '').trim()
  const email = String(input.payload?.workEmail ?? '').trim().toLowerCase()
  const organisation = String(input.payload?.organisation ?? '').trim()
  const role = String(input.payload?.role ?? '').trim()
  const consent = input.payload?.consent === true

  if (!firstName || !lastName || !organisation || !role || !consent || !isValidEmail(email)) {
    return { ok: false, error: 'invalid_fields' }
  }

  const submissionResult = await loadGateSubmission(adminClient, gatePayload)
  if (!submissionResult.ok) {
    return submissionResult
  }

  const source = `campaign:${gatePayload.campaignId}:contact_gate`
  const contactResult = await upsertContactByEmail(adminClient, {
    firstName,
    lastName,
    email,
    source,
  })

  if (!contactResult.data?.id) {
    return { ok: false, error: contactResult.error ?? 'contact_upsert_failed' }
  }

  const nowIso = new Date().toISOString()
  const participantRecord = await ensureAssessmentParticipant({
    client: adminClient,
    contactId: contactResult.data.id,
    email,
    firstName,
    lastName,
    organisation,
    role,
  })
  const { error: updateError } = await adminClient
    .from('assessment_submissions')
    .update({
      participant_id: participantRecord.data?.id ?? null,
      contact_id: contactResult.data.id,
      first_name: firstName,
      last_name: lastName,
      email,
      organisation,
      role,
      consent: true,
      updated_at: nowIso,
    })
    .eq('id', submissionResult.submission.id)

  if (updateError) {
    return { ok: false, error: 'submission_update_failed' }
  }

  await createContactEvent(adminClient, {
    contactId: contactResult.data.id,
    eventType: 'assessment_contact_gate_completed',
    eventData: {
      submission_id: submissionResult.submission.id,
      campaign_id: gatePayload.campaignId,
      assessment_id: gatePayload.assessmentId,
    },
  })

  const reportAccessToken = createReportAccessToken({
    report: 'assessment',
    submissionId: submissionResult.submission.id,
    expiresInSeconds: reportAccessTtlSeconds(),
  })

  if (!reportAccessToken) {
    return { ok: false, error: 'missing_report_secret' }
  }

  return {
    ok: true,
    data: {
      reportPath: '/assess/r/assessment',
      reportAccessToken,
    },
  }
}
