import type { EmailTemplateKey } from '@/utils/email-templates'
import { createReportAccessToken, hasReportAccessTokenSecret } from '@/utils/security/report-access'
import { createContactEvent, upsertContactByEmail } from '@/utils/services/contacts'
import { enqueueTemplatedEmailJob } from '@/utils/services/email-jobs'
import {
  createInterestSubmission,
  createSubmissionEvent,
  linkSubmissionToContact,
} from '@/utils/services/submissions'
import { reportAccessTtlSeconds } from '@/utils/services/platform-settings-runtime'
import { createAdminClient } from '@/utils/supabase/admin'

export type FrameworkReportDownloadPayload = {
  firstName?: string
  lastName?: string
  workEmail?: string
  organisation?: string
  role?: string
  consent?: boolean
}

type FrameworkReportDownloadKind = 'ai' | 'lq8'

type NormalizedFrameworkReportDownloadPayload = {
  firstName: string
  lastName: string
  email: string
  organisation: string
  role: string
  consent: true
}

type FrameworkReportDownloadConfig = {
  source: string
  formKey: string
  eventType: string
  internalTemplateKey: EmailTemplateKey
  report: 'ai' | 'lq8'
  reportPath: string
}

type FrameworkReportDownloadFailure = {
  ok: false
  error: string
  message?: string
}

type FrameworkReportDownloadSuccess = {
  ok: true
  data: {
    submissionId: string
    reportPath: string
    reportAccessToken: string
  }
}

export type FrameworkReportDownloadResult =
  | FrameworkReportDownloadSuccess
  | FrameworkReportDownloadFailure


const FRAMEWORK_REPORT_CONFIG: Record<FrameworkReportDownloadKind, FrameworkReportDownloadConfig> = {
  ai: {
    source: 'site:ai_readiness_report_download',
    formKey: 'report_download_ai_readiness_v1',
    eventType: 'ai_readiness_report_requested',
    internalTemplateKey: 'ai_readiness_report_internal_notification',
    report: 'ai',
    reportPath: '/framework/lq-ai-readiness/report',
  },
  lq8: {
    source: 'site:lq8_report_download',
    formKey: 'report_download_lq8_v1',
    eventType: 'lq8_report_requested',
    internalTemplateKey: 'lq8_report_internal_notification',
    report: 'lq8',
    reportPath: '/framework/lq8/report',
  },
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function parseFrameworkReportDownloadPayload(
  payload: FrameworkReportDownloadPayload | null
):
  | {
      ok: true
      data: NormalizedFrameworkReportDownloadPayload
    }
  | {
      ok: false
      error: 'invalid_payload' | 'invalid_fields'
    } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'invalid_payload' }
  }

  const firstName = String(payload.firstName ?? '').trim()
  const lastName = String(payload.lastName ?? '').trim()
  const email = String(payload.workEmail ?? '')
    .trim()
    .toLowerCase()
  const organisation = String(payload.organisation ?? '').trim()
  const role = String(payload.role ?? '').trim()
  const consent = payload.consent === true

  if (!firstName || !lastName || !organisation || !role || !consent || !isValidEmail(email)) {
    return { ok: false, error: 'invalid_fields' }
  }

  return {
    ok: true,
    data: {
      firstName,
      lastName,
      email,
      organisation,
      role,
      consent: true,
    },
  }
}

async function requestFrameworkReportDownload(
  kind: FrameworkReportDownloadKind,
  input: {
    payload: FrameworkReportDownloadPayload | null
    ipAddress: string
    userAgent: string | null
  }
): Promise<FrameworkReportDownloadResult> {
  const parsed = parseFrameworkReportDownloadPayload(input.payload)
  if (!parsed.ok) {
    return parsed
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return {
      ok: false,
      error: 'missing_service_role',
      message: 'Supabase admin credentials are not configured.',
    }
  }

  if (process.env.NODE_ENV !== 'development' && !hasReportAccessTokenSecret()) {
    return {
      ok: false,
      error: 'missing_report_secret',
      message: 'Report access token secret is not configured.',
    }
  }

  const config = FRAMEWORK_REPORT_CONFIG[kind]
  const { firstName, lastName, email, organisation, role, consent } = parsed.data
  const answers = {
    first_name: firstName,
    last_name: lastName,
    email,
    organisation,
    role,
    consent,
  }

  const submissionResult = await createInterestSubmission(adminClient, {
    firstName,
    lastName,
    email,
    source: config.source,
    formKey: config.formKey,
    schemaVersion: 1,
    answers,
    rawPayload: answers,
    reviewStatus: 'pending_review',
    priority: 'normal',
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  })

  if (!submissionResult.data?.id || submissionResult.error) {
    return {
      ok: false,
      error: submissionResult.error ?? 'submission_failed',
    }
  }

  const submissionId = submissionResult.data.id
  await createSubmissionEvent(adminClient, {
    submissionId,
    eventType: config.eventType,
    eventData: { source: config.source, form_key: config.formKey },
  })

  const contactResult = await upsertContactByEmail(adminClient, {
    firstName,
    lastName,
    email,
    source: config.source,
  })

  if (contactResult.data?.id) {
    const contactId = contactResult.data.id
    await linkSubmissionToContact(adminClient, submissionId, contactId)
    await createContactEvent(adminClient, {
      contactId,
      eventType: config.eventType,
      eventData: { submission_id: submissionId, source: config.source },
    })
  }

  const variables = {
    first_name: firstName,
    last_name: lastName,
    email,
    organisation,
    role,
    source: config.source,
  }

  const internalTo = process.env.RESEND_NOTIFICATION_TO?.trim().toLowerCase()
  if (internalTo && isValidEmail(internalTo)) {
    await enqueueTemplatedEmailJob(adminClient, {
      to: internalTo,
      templateKey: config.internalTemplateKey,
      variables,
    })
  }

  const reportAccessToken = createReportAccessToken({
    report: config.report,
    submissionId,
    expiresInSeconds: reportAccessTtlSeconds(),
  })
  if (!reportAccessToken) {
    return {
      ok: false,
      error: 'missing_report_secret',
      message: 'Report access token could not be generated.',
    }
  }

  return {
    ok: true,
    data: {
      submissionId,
      reportPath: config.reportPath,
      reportAccessToken,
    },
  }
}

export async function requestAiReadinessReportDownload(input: {
  payload: FrameworkReportDownloadPayload | null
  ipAddress: string
  userAgent: string | null
}) {
  return requestFrameworkReportDownload('ai', input)
}

export async function requestLq8ReportDownload(input: {
  payload: FrameworkReportDownloadPayload | null
  ipAddress: string
  userAgent: string | null
}) {
  return requestFrameworkReportDownload('lq8', input)
}
