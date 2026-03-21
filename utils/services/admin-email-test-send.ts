import { Resend } from 'resend'
import { defaultEmailTemplates, renderTemplate, type EmailTemplateKey } from '@/utils/email-templates'
import { getRuntimeEmailTemplates } from '@/utils/services/email-templates'
import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'

type AdminClient = RouteAuthSuccess['adminClient']

const PLACEHOLDER_VARS: Record<string, string> = {
  first_name: 'Test',
  last_name: 'User',
  email: 'test@example.com',
  survey_name: 'Test Assessment',
  invitation_url: 'https://leadershipquarter.com/assess/i/test-token',
  classification_label: 'Emerging',
  report_url: 'https://leadershipquarter.com/assess/r/assessment?access=test-token',
  organisation: 'Test Organisation',
  role: 'Manager',
  topic: 'General enquiry',
  message: 'This is a test message.',
  source: 'test',
  notes: '',
}

export async function sendAdminTestEmail(input: {
  adminClient: AdminClient
  payload: Record<string, unknown> | null
}): Promise<
  | { ok: true; data: { messageId: string | null | undefined } }
  | { ok: false; error: string; status: number }
> {
  const templateKey = input.payload?.templateKey
  if (typeof templateKey !== 'string' || !templateKey) {
    return { ok: false, error: 'template_key_required', status: 400 }
  }

  const allKeys = Object.keys(defaultEmailTemplates) as EmailTemplateKey[]
  if (!allKeys.includes(templateKey as EmailTemplateKey)) {
    return { ok: false, error: 'template_not_found', status: 400 }
  }

  const resendApiKey = process.env.RESEND_API_KEY?.trim()
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim()
  const notificationTo =
    (typeof input.payload?.to === 'string' ? input.payload.to.trim() : '') ||
    process.env.RESEND_NOTIFICATION_TO?.trim()

  if (!resendApiKey || !fromEmail) {
    return { ok: false, error: 'email_not_configured', status: 500 }
  }

  if (!notificationTo) {
    return {
      ok: false,
      error: 'no_recipient: set RESEND_NOTIFICATION_TO or pass "to" in body',
      status: 400,
    }
  }

  const templates = await getRuntimeEmailTemplates(input.adminClient)
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
    return { ok: false, error: error.message, status: 502 }
  }

  return {
    ok: true,
    data: {
      messageId: data?.id,
    },
  }
}
