import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'
import { renderTemplate, type EmailTemplateKey } from '@/utils/email-templates'
import { getRuntimeEmailTemplates } from '@/utils/services/email-templates'

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

const BATCH_SIZE = 20

function getCronSecret() {
  return process.env.CRON_SECRET?.trim() || null
}

function getTokenFromRequest(request: Request) {
  const header = request.headers.get('authorization') || request.headers.get('x-cron-secret')
  if (!header) return null
  if (header.startsWith('Bearer ')) return header.slice('Bearer '.length).trim()
  return header.trim()
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

export async function GET(request: Request) {
  const cronSecret = getCronSecret()
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: 'cron_not_configured' }, { status: 500 })
  }

  const token = getTokenFromRequest(request)
  if (!token || token !== cronSecret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  const replyTo = process.env.RESEND_REPLY_TO?.trim() || undefined
  if (!resendApiKey || !fromEmail) {
    return NextResponse.json({ ok: false, error: 'email_not_configured' }, { status: 500 })
  }

  const nowIso = new Date().toISOString()
  const { data: rows, error: fetchError } = await adminClient
    .from('email_jobs')
    .select('id, job_type, payload, attempts, max_attempts')
    .eq('status', 'pending')
    .lte('run_at', nowIso)
    .order('run_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (fetchError) {
    return NextResponse.json({ ok: false, error: 'job_fetch_failed' }, { status: 500 })
  }

  const jobs = (rows ?? []) as EmailJobRow[]
  const resend = new Resend(resendApiKey)
  const templates = await getRuntimeEmailTemplates(adminClient)

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const job of jobs) {
    const nextAttempt = job.attempts + 1
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

    if (!claimed) {
      skipped += 1
      continue
    }

    try {
      if (job.job_type !== 'templated_email' || !isTemplatedEmailPayload(job.payload)) {
        throw new Error('invalid_payload')
      }

      const template = templates[job.payload.templateKey]
      if (!template) {
        throw new Error('template_not_found')
      }

      const rendered = renderTemplate(template, job.payload.variables, true)
      const { error: sendError } = await resend.emails.send({
        from: fromEmail,
        to: job.payload.to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text ?? undefined,
        replyTo,
      })

      if (sendError) {
        throw new Error(sendError.message)
      }

      await adminClient
        .from('email_jobs')
        .update({
          status: 'sent',
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      sent += 1
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'send_failed'
      const shouldRetry = nextAttempt < job.max_attempts
      const retryAt = new Date(Date.now() + nextAttempt * 60_000).toISOString()

      await adminClient
        .from('email_jobs')
        .update({
          status: shouldRetry ? 'pending' : 'failed',
          run_at: shouldRetry ? retryAt : nowIso,
          last_error: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)

      failed += 1
    }
  }

  return NextResponse.json({
    ok: true,
    fetched: jobs.length,
    sent,
    failed,
    skipped,
  })
}
