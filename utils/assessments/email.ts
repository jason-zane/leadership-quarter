import { Resend } from 'resend'
import { renderTemplate } from '@/utils/email-templates'
import { getRuntimeEmailTemplates } from '@/utils/services/email-templates'
import { createAdminClient } from '@/utils/supabase/admin'

function getEmailConfig() {
  const resendApiKey = process.env.RESEND_API_KEY?.trim()
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim()       // fallback
  const fromAssessments = process.env.RESEND_FROM_ASSESSMENTS?.trim() ?? fromEmail
  const fromReports = process.env.RESEND_FROM_REPORTS?.trim() ?? fromEmail
  const replyTo = process.env.RESEND_REPLY_TO?.trim() || undefined

  if (!resendApiKey || !fromEmail) {
    return null
  }

  return { resendApiKey, fromEmail, fromAssessments, fromReports, replyTo }
}

export async function sendSurveyInvitationEmail(input: {
  to: string
  firstName?: string | null
  surveyName: string
  invitationUrl: string
}) {
  const config = getEmailConfig()
  if (!config) {
    return { ok: false as const, error: 'email_not_configured' }
  }

  const adminClient = createAdminClient()
  const templates = await getRuntimeEmailTemplates(adminClient)
  const template = templates.survey_invitation
  const rendered = renderTemplate(
    template,
    {
      first_name: input.firstName?.trim() || 'there',
      survey_name: input.surveyName,
      invitation_url: input.invitationUrl,
    },
    true
  )

  const resend = new Resend(config.resendApiKey)
  const { error } = await resend.emails.send({
    from: config.fromAssessments ?? config.fromEmail,
    to: input.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text ?? undefined,
    replyTo: config.replyTo,
  })

  if (error) {
    return { ok: false as const, error: error.message }
  }

  return { ok: true as const }
}

export async function sendSurveyCompletionEmail(input: {
  to: string
  firstName?: string | null
  surveyName: string
  classificationLabel: string
  reportUrl: string
}) {
  const config = getEmailConfig()
  if (!config) {
    return { ok: false as const, error: 'email_not_configured' }
  }

  const adminClient = createAdminClient()
  const templates = await getRuntimeEmailTemplates(adminClient)
  const template = templates.survey_completion_confirmation
  const rendered = renderTemplate(
    template,
    {
      first_name: input.firstName?.trim() || 'there',
      survey_name: input.surveyName,
      classification_label: input.classificationLabel,
      report_url: input.reportUrl,
    },
    true
  )

  const resend = new Resend(config.resendApiKey)
  const { error } = await resend.emails.send({
    from: config.fromReports ?? config.fromEmail,
    to: input.to,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text ?? undefined,
    replyTo: config.replyTo,
  })

  if (error) {
    return { ok: false as const, error: error.message }
  }

  return { ok: true as const }
}

export async function sendAssessmentReportPdfEmail(input: {
  to: string
  firstName?: string | null
  assessmentName: string
  classificationLabel: string
  pdfFilename: string
  pdfBuffer: Buffer
}) {
  const config = getEmailConfig()
  if (!config) {
    return { ok: false as const, error: 'email_not_configured' }
  }

  const resend = new Resend(config.resendApiKey)
  const subject = `Your ${input.assessmentName} PDF report`
  const recipientName = input.firstName?.trim() || 'there'
  const html = `
    <p>Hi ${recipientName},</p>
    <p>Your ${input.assessmentName} report is attached as a PDF.</p>
    <p><strong>Profile:</strong> ${input.classificationLabel}</p>
    <p>Leadership Quarter</p>
  `
  const text = [
    `Hi ${recipientName},`,
    '',
    `Your ${input.assessmentName} report is attached as a PDF.`,
    `Profile: ${input.classificationLabel}`,
    '',
    'Leadership Quarter',
  ].join('\n')

  const { error } = await resend.emails.send({
    from: config.fromReports ?? config.fromEmail,
    to: input.to,
    subject,
    html,
    text,
    replyTo: config.replyTo,
    attachments: [
      {
        filename: input.pdfFilename,
        content: input.pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  })

  if (error) {
    return { ok: false as const, error: error.message }
  }

  return { ok: true as const }
}
