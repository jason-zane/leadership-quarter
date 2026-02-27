import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'
import { renderTemplate } from '@/utils/email-templates'
import { getRuntimeEmailTemplates } from '@/utils/services/email-templates'

type EmailJobRow = {
  id: string
  status: 'pending' | 'processing' | 'sent' | 'failed'
  job_type: string
  payload: {
    to: string
    reply_to?: string | null
    template_vars: Record<string, string>
    template_kind: 'interest_internal' | 'interest_user'
  }
  attempts: number
  max_attempts: number
}

const MAX_BATCH = 10

function getCronSecret() {
  return process.env.CRON_SECRET?.trim() || null
}

function getDelaySeconds(attempts: number) {
  const base = Math.min(60 * Math.pow(2, Math.max(0, attempts)), 60 * 60)
  return base
}

export async function GET(request: Request) {
  const cronSecret = getCronSecret()
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: 'cron_not_configured' }, { status: 500 })
  }

  const header = request.headers.get('authorization') || request.headers.get('x-cron-secret')
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : header?.trim()
  if (!token || token !== cronSecret) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!resendApiKey || !fromEmail) {
    return NextResponse.json({ ok: false, error: 'email_not_configured' }, { status: 500 })
  }

  const nowIso = new Date().toISOString()
  const { data: jobsRaw, error } = await adminClient
    .from('email_jobs')
    .select('id, status, job_type, payload, attempts, max_attempts')
    .eq('status', 'pending')
    .lte('run_at', nowIso)
    .order('created_at', { ascending: true })
    .limit(MAX_BATCH)

  if (error) {
    return NextResponse.json({ ok: false, error: 'load_failed' }, { status: 500 })
  }

  const jobs = (jobsRaw ?? []) as EmailJobRow[]
  if (jobs.length === 0) {
    return NextResponse.json({ ok: true, processed: 0 })
  }

  const resend = new Resend(resendApiKey)
  const templates = await getRuntimeEmailTemplates(adminClient)

  let processed = 0
  for (const job of jobs) {
    const { data: claimed } = await adminClient
      .from('email_jobs')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle()

    if (!claimed) {
      continue
    }

    const template =
      job.payload.template_kind === 'interest_internal'
        ? templates.interest_internal_notification
        : templates.interest_user_confirmation

    const rendered = renderTemplate(template, job.payload.template_vars, true)

    try {
      const { error: sendError } = await resend.emails.send({
        from: fromEmail,
        to: job.payload.to,
        replyTo: job.payload.reply_to ?? undefined,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text ?? undefined,
      })

      if (sendError) {
        throw new Error(sendError.message)
      }

      await adminClient
        .from('email_jobs')
        .update({ status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', job.id)

      processed += 1
    } catch (sendError) {
      const attempts = job.attempts + 1
      const maxAttempts = job.max_attempts
      const nextStatus = attempts >= maxAttempts ? 'failed' : 'pending'
      const delaySeconds = getDelaySeconds(attempts)
      const runAt = new Date(Date.now() + delaySeconds * 1000).toISOString()
      const message = sendError instanceof Error ? sendError.message : String(sendError)

      await adminClient
        .from('email_jobs')
        .update({
          status: nextStatus,
          attempts,
          last_error: message,
          run_at: nextStatus === 'pending' ? runAt : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id)
    }
  }

  return NextResponse.json({ ok: true, processed })
}
