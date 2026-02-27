import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

type CheckResult = {
  ok: boolean
  message: string
}

function envCheck(value: string | undefined, required = true): CheckResult {
  if (!required) {
    return {
      ok: true,
      message: value ? 'set (optional)' : 'not set (optional)',
    }
  }

  return {
    ok: Boolean(value),
    message: value ? 'set' : 'missing',
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function checkTable(supabase: any, tableName: string, columnName: string): Promise<CheckResult> {
  const { error } = await supabase.from(tableName).select(columnName, { count: 'exact', head: true })

  if (!error) {
    return {
      ok: true,
      message: 'table is reachable',
    }
  }

  const message = error.message.toLowerCase()
  if (message.includes('relation') && message.includes(tableName)) {
    return {
      ok: false,
      message: 'missing table; run `npm run db:push`',
    }
  }

  return {
    ok: false,
    message: `database error: ${error.message}`,
  }
}

export async function GET() {
  const token = process.env.HEALTHCHECK_TOKEN
  if (token) {
    const reqHeaders = await headers()
    const authHeader = reqHeaders.get('authorization')
    const customHeader = reqHeaders.get('x-health-token')
    const isAuthorized =
      authHeader === `Bearer ${token}` || customHeader === token
    if (!isAuthorized) {
      return NextResponse.json({ ok: false }, { status: 401 })
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const resendApiKey = process.env.RESEND_API_KEY
  const resendFromEmail = process.env.RESEND_FROM_EMAIL
  const resendNotificationTo = process.env.RESEND_NOTIFICATION_TO
  const resendReplyTo = process.env.RESEND_REPLY_TO

  const checks: Record<string, CheckResult> = {
    NEXT_PUBLIC_SUPABASE_URL: envCheck(supabaseUrl),
    SUPABASE_SERVICE_ROLE_KEY: envCheck(supabaseServiceRoleKey),
    RESEND_API_KEY: envCheck(resendApiKey),
    RESEND_FROM_EMAIL: envCheck(resendFromEmail),
    RESEND_NOTIFICATION_TO: envCheck(resendNotificationTo),
    RESEND_REPLY_TO: envCheck(resendReplyTo, false),
  }

  if (supabaseUrl && supabaseServiceRoleKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
    const [
      interestTableCheck,
      templatesTableCheck,
      profilesTableCheck,
      statusesTableCheck,
      contactsTableCheck,
      contactEventsTableCheck,
    ] = await Promise.all([
      checkTable(supabase, 'interest_submissions', 'id'),
      checkTable(supabase, 'email_templates', 'key'),
      checkTable(supabase, 'profiles', 'user_id'),
      checkTable(supabase, 'contact_statuses', 'key'),
      checkTable(supabase, 'contacts', 'id'),
      checkTable(supabase, 'contact_events', 'id'),
    ])

    checks.interest_submissions_table = interestTableCheck
    checks.email_templates_table = templatesTableCheck
    checks.profiles_table = profilesTableCheck
    checks.contact_statuses_table = statusesTableCheck
    checks.contacts_table = contactsTableCheck
    checks.contact_events_table = contactEventsTableCheck
  } else {
    checks.interest_submissions_table = {
      ok: false,
      message: 'skipped (missing Supabase env)',
    }
    checks.email_templates_table = {
      ok: false,
      message: 'skipped (missing Supabase env)',
    }
    checks.profiles_table = {
      ok: false,
      message: 'skipped (missing Supabase env)',
    }
    checks.contact_statuses_table = {
      ok: false,
      message: 'skipped (missing Supabase env)',
    }
    checks.contacts_table = {
      ok: false,
      message: 'skipped (missing Supabase env)',
    }
    checks.contact_events_table = {
      ok: false,
      message: 'skipped (missing Supabase env)',
    }
  }

  const ok = Object.values(checks).every((check) => check.ok)

  return NextResponse.json(
    {
      ok,
      checkedAt: new Date().toISOString(),
      checks,
    },
    { status: ok ? 200 : 500 }
  )
}
