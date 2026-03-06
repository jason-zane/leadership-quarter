import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { defaultEmailTemplates, renderTemplate, type EmailTemplateKey } from '@/utils/email-templates'
import { getRuntimeEmailTemplates } from '@/utils/services/email-templates'

const PLACEHOLDER_VARS: Record<string, string> = {
  first_name: 'Test',
  last_name: 'User',
  email: 'test@example.com',
  survey_name: 'Test Assessment',
  invitation_url: 'https://leadershipquarter.com/survey/test-token',
  classification_label: 'Emerging',
  report_url: 'https://leadershipquarter.com/report/test-token',
  organisation: 'Test Organisation',
  role: 'Manager',
  topic: 'General enquiry',
  message: 'This is a test message.',
  source: 'test',
  notes: '',
}

export async function POST(req: NextRequest) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const body = await req.json().catch(() => ({}))
  const templateKey = body.templateKey as string | undefined

  if (!templateKey) {
    return NextResponse.json({ ok: false, error: 'template_key_required' }, { status: 400 })
  }

  const allKeys = Object.keys(defaultEmailTemplates) as EmailTemplateKey[]
  if (!allKeys.includes(templateKey as EmailTemplateKey)) {
    return NextResponse.json({ ok: false, error: 'template_not_found' }, { status: 400 })
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim()
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim()
  const notificationTo =
    (body.to as string | undefined)?.trim() ||
    process.env.RESEND_NOTIFICATION_TO?.trim()

  if (!resendApiKey || !fromEmail) {
    return NextResponse.json({ ok: false, error: 'email_not_configured' }, { status: 500 })
  }

  if (!notificationTo) {
    return NextResponse.json(
      { ok: false, error: 'no_recipient: set RESEND_NOTIFICATION_TO or pass "to" in body' },
      { status: 400 }
    )
  }

  const templates = await getRuntimeEmailTemplates(auth.adminClient)
  const template = templates[templateKey as EmailTemplateKey]
  const rendered = renderTemplate(template, PLACEHOLDER_VARS, true)

  const resend = new Resend(resendApiKey)
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: notificationTo,
    subject: `[TEST] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text ?? undefined,
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 502 })
  }

  return NextResponse.json({ ok: true, messageId: data?.id })
}
