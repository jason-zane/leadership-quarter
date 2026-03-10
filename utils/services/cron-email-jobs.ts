import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPublicBaseUrl } from '@/utils/hosts'
import { getAiOrientationSurveyReportData } from '@/utils/reports/ai-orientation-report'
import { getAssessmentReportData } from '@/utils/reports/assessment-report'
import { createReportAccessToken } from '@/utils/security/report-access'
import { renderTemplate, type EmailTemplateKey } from '@/utils/email-templates'
import { getRuntimeEmailTemplates } from '@/utils/services/email-templates'
import {
  sendAssessmentReportEmail,
  sendSurveyCompletionEmail,
} from '@/utils/assessments/email'

export const DEFAULT_EMAIL_JOB_BATCH_SIZE = 20

type EmailJobRow = {
  id: string
  job_type: string
  payload: unknown
  attempts: number
  max_attempts: number
}

type TemplatedEmailPayload = {
  to: string
  templateKey: EmailTemplateKey
  variables: Record<string, string>
}

type AssessmentCompletionPayload = {
  to: string
  firstName?: string | null
  surveyName: string
  classificationLabel: string
  reportUrl: string
}

type AssessmentReportEmailPayload = {
  submissionId: string
  to: string
  reportType?: 'assessment' | 'ai_survey'
}

type EmailJobConfig = {
  resendApiKey: string
  fromEmail: string
  replyTo?: string
}

export type RunPendingEmailJobsResult =
  | {
      ok: true
      data: {
        fetched: number
        sent: number
        failed: number
        skipped: number
      }
    }
  | {
      ok: false
      error: 'email_not_configured' | 'job_fetch_failed'
    }

function getEmailJobConfig(): EmailJobConfig | null {
  const resendApiKey = process.env.RESEND_API_KEY?.trim()
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim()
  const replyTo = process.env.RESEND_REPLY_TO?.trim() || undefined

  if (!resendApiKey || !fromEmail) {
    return null
  }

  return { resendApiKey, fromEmail, replyTo }
}

function isTemplatedEmailPayload(value: unknown): value is TemplatedEmailPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return (
    typeof payload.to === 'string' &&
    typeof payload.templateKey === 'string' &&
    !!payload.variables &&
    typeof payload.variables === 'object'
  )
}

function isAssessmentCompletionPayload(value: unknown): value is AssessmentCompletionPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return (
    typeof payload.to === 'string' &&
    typeof payload.surveyName === 'string' &&
    typeof payload.classificationLabel === 'string' &&
    typeof payload.reportUrl === 'string'
  )
}

function isAssessmentReportEmailPayload(value: unknown): value is AssessmentReportEmailPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  const reportType = payload.reportType
  return (
    typeof payload.to === 'string'
    && typeof payload.submissionId === 'string'
    && (
      typeof reportType === 'undefined'
      || reportType === 'assessment'
      || reportType === 'ai_survey'
    )
  )
}

async function claimEmailJob(adminClient: SupabaseClient, job: EmailJobRow, nextAttempt: number) {
  const { data: claimed } = await adminClient
    .from('email_jobs')
    .update({
      status: 'processing',
      attempts: nextAttempt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', job.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  return claimed ?? null
}

async function markEmailJobSent(adminClient: SupabaseClient, jobId: string) {
  await adminClient
    .from('email_jobs')
    .update({
      status: 'sent',
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)
}

async function markEmailJobFailed(input: {
  adminClient: SupabaseClient
  job: EmailJobRow
  nextAttempt: number
  errorMessage: string
  nowIso: string
}) {
  const shouldRetry = input.nextAttempt < input.job.max_attempts
  const retryAt = new Date(Date.now() + input.nextAttempt * 60_000).toISOString()

  await input.adminClient
    .from('email_jobs')
    .update({
      status: shouldRetry ? 'pending' : 'failed',
      run_at: shouldRetry ? retryAt : input.nowIso,
      last_error: input.errorMessage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.job.id)
}

async function processAssessmentCompletionJob(job: EmailJobRow) {
  if (!isAssessmentCompletionPayload(job.payload)) {
    throw new Error('invalid_payload')
  }

  const result = await sendSurveyCompletionEmail({
    to: job.payload.to,
    firstName: job.payload.firstName,
    surveyName: job.payload.surveyName,
    classificationLabel: job.payload.classificationLabel,
    reportUrl: job.payload.reportUrl,
  })

  if (!result.ok) {
    throw new Error(result.error)
  }
}

async function processAssessmentReportEmailJob(input: {
  adminClient: SupabaseClient
  job: EmailJobRow
}) {
  if (!isAssessmentReportEmailPayload(input.job.payload)) {
    throw new Error('invalid_payload')
  }

  const payload = input.job.payload
  const reportType = payload.reportType ?? 'assessment'

  const result = reportType === 'ai_survey'
    ? await (async () => {
        const report = await getAiOrientationSurveyReportData(input.adminClient, payload.submissionId)
        if (!report) {
          throw new Error('report_not_found')
        }

        const reportAccessToken = createReportAccessToken({
          report: 'ai_survey',
          submissionId: report.submissionId,
          expiresInSeconds: 7 * 24 * 60 * 60,
        })

        if (!reportAccessToken) {
          throw new Error('missing_report_secret')
        }

        return sendAssessmentReportEmail({
          to: payload.to,
          firstName: report.firstName,
          assessmentName: 'AI Readiness Orientation Survey',
          classificationLabel: report.classification,
          reportUrl: `${getPublicBaseUrl()}/framework/lq-ai-readiness/orientation-survey/report?access=${encodeURIComponent(reportAccessToken)}`,
        })
      })()
    : await (async () => {
        const report = await getAssessmentReportData(input.adminClient, payload.submissionId)
        if (!report) {
          throw new Error('report_not_found')
        }

        const { data: submissionMeta } = await input.adminClient
          .from('assessment_submissions')
          .select('report_token')
          .eq('id', report.submissionId)
          .maybeSingle()

        let reportUrl: string
        if (submissionMeta?.report_token) {
          reportUrl = `${getPublicBaseUrl()}/assess/r/assessment?token=${submissionMeta.report_token}`
        } else {
          // Fallback to HMAC token if report_token is unavailable
          const reportAccessToken = createReportAccessToken({
            report: 'assessment',
            submissionId: report.submissionId,
            expiresInSeconds: 7 * 24 * 60 * 60,
          })
          if (!reportAccessToken) {
            throw new Error('missing_report_secret')
          }
          reportUrl = `${getPublicBaseUrl()}/assess/r/assessment?access=${encodeURIComponent(reportAccessToken)}`
        }

        return sendAssessmentReportEmail({
          to: payload.to,
          firstName: report.participant.firstName,
          assessmentName: report.assessment.name,
          classificationLabel: report.classification.label ?? 'Assessment complete',
          reportUrl,
        })
      })()

  if (!result.ok) {
    throw new Error(result.error)
  }
}

async function processTemplatedEmailJob(input: {
  resend: Resend
  fromEmail: string
  replyTo?: string
  templates: Awaited<ReturnType<typeof getRuntimeEmailTemplates>>
  job: EmailJobRow
}) {
  if (!isTemplatedEmailPayload(input.job.payload)) {
    throw new Error('invalid_payload')
  }

  const template = input.templates[input.job.payload.templateKey]
  if (!template) {
    throw new Error('template_not_found')
  }

  const rendered = renderTemplate(template, input.job.payload.variables, true)
  const { error: sendError } = await input.resend.emails.send({
    from: input.fromEmail,
    to: input.job.payload.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text ?? undefined,
    replyTo: input.replyTo,
  })

  if (sendError) {
    throw new Error(sendError.message)
  }
}

async function processEmailJob(input: {
  adminClient: SupabaseClient
  resend: Resend
  fromEmail: string
  replyTo?: string
  templates: Awaited<ReturnType<typeof getRuntimeEmailTemplates>>
  job: EmailJobRow
}) {
  if (input.job.job_type === 'assessment_completion') {
    await processAssessmentCompletionJob(input.job)
    return
  }

  if (input.job.job_type === 'assessment_report_email' || input.job.job_type === 'assessment_report_pdf_email') {
    await processAssessmentReportEmailJob({
      adminClient: input.adminClient,
      job: input.job,
    })
    return
  }

  if (input.job.job_type === 'templated_email') {
    await processTemplatedEmailJob({
      resend: input.resend,
      fromEmail: input.fromEmail,
      replyTo: input.replyTo,
      templates: input.templates,
      job: input.job,
    })
    return
  }

  throw new Error('unknown_job_type')
}

export async function runPendingEmailJobs(input: {
  adminClient: SupabaseClient
  batchSize?: number
}): Promise<RunPendingEmailJobsResult> {
  const emailConfig = getEmailJobConfig()
  if (!emailConfig) {
    return { ok: false, error: 'email_not_configured' }
  }

  const nowIso = new Date().toISOString()
  const { data: rows, error: fetchError } = await input.adminClient
    .from('email_jobs')
    .select('id, job_type, payload, attempts, max_attempts')
    .eq('status', 'pending')
    .lte('run_at', nowIso)
    .order('run_at', { ascending: true })
    .limit(input.batchSize ?? DEFAULT_EMAIL_JOB_BATCH_SIZE)

  if (fetchError) {
    return { ok: false, error: 'job_fetch_failed' }
  }

  const jobs = (rows ?? []) as EmailJobRow[]
  const resend = new Resend(emailConfig.resendApiKey)
  const templates = await getRuntimeEmailTemplates(input.adminClient)

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const job of jobs) {
    const nextAttempt = job.attempts + 1
    const claimed = await claimEmailJob(input.adminClient, job, nextAttempt)
    if (!claimed) {
      skipped += 1
      continue
    }

    try {
      await processEmailJob({
        adminClient: input.adminClient,
        resend,
        fromEmail: emailConfig.fromEmail,
        replyTo: emailConfig.replyTo,
        templates,
        job,
      })

      await markEmailJobSent(input.adminClient, job.id)
      sent += 1
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'send_failed'
      await markEmailJobFailed({
        adminClient: input.adminClient,
        job,
        nextAttempt,
        errorMessage,
        nowIso,
      })
      failed += 1
    }
  }

  return {
    ok: true,
    data: {
      fetched: jobs.length,
      sent,
      failed,
      skipped,
    },
  }
}
