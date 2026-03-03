import type { SupabaseClient } from '@supabase/supabase-js'
import {
  defaultEmailTemplates,
  type EmailTemplateKey,
  type EmailTemplateRecord,
  type TemplateRuntimeShape,
} from '@/utils/email-templates'

type RuntimeTemplates = Record<EmailTemplateKey, TemplateRuntimeShape>
type TemplateUsageRow = {
  usage_key: string
  template_key: string | null
}

export async function getRuntimeEmailTemplates(
  client: SupabaseClient | null
): Promise<RuntimeTemplates> {
  if (!client) {
    return defaultEmailTemplates
  }

  const { data: usageRowsRaw, error: usageError } = await client
    .from('email_template_usages')
    .select('usage_key, template_key')
    .in('usage_key', [
      'register_interest.internal_notification',
      'register_interest.user_confirmation',
      'inquiry.internal_notification',
      'inquiry.user_confirmation',
      'lq8_report.internal_notification',
      'lq8_report.user_confirmation',
      'ai_readiness_report.internal_notification',
      'ai_readiness_report.user_confirmation',
      'survey.invitation',
      'survey.completion_confirmation',
    ])

  if (usageError || !usageRowsRaw) {
    return defaultEmailTemplates
  }
  const usageRows = usageRowsRaw as TemplateUsageRow[]

  const templateKeys = usageRows
    .map((row) => row.template_key as string | null)
    .filter((key): key is string => Boolean(key))

  if (templateKeys.length === 0) {
    return defaultEmailTemplates
  }

  const { data: templateRows, error: templatesError } = await client
    .from('email_templates')
    .select('key, subject, html_body, text_body')
    .in('key', templateKeys)

  if (templatesError || !templateRows) {
    return defaultEmailTemplates
  }

  const byKey = new Map(
    (templateRows as EmailTemplateRecord[]).map((row) => [
      row.key,
      {
        subject: row.subject,
        html: row.html_body,
        text: row.text_body,
      },
    ])
  )

  const usageToTemplateKey = new Map(
    usageRows.map((row) => [
      row.usage_key as string,
      row.template_key as EmailTemplateKey | null,
    ])
  )

  const internalTemplateKey =
    usageToTemplateKey.get('register_interest.internal_notification') ??
    'interest_internal_notification'
  const userConfirmationTemplateKey =
    usageToTemplateKey.get('register_interest.user_confirmation') ??
    'interest_user_confirmation'
  const inquiryInternalTemplateKey =
    usageToTemplateKey.get('inquiry.internal_notification') ?? 'inquiry_internal_notification'
  const inquiryUserTemplateKey =
    usageToTemplateKey.get('inquiry.user_confirmation') ?? 'inquiry_user_confirmation'
  const lq8ReportInternalTemplateKey =
    usageToTemplateKey.get('lq8_report.internal_notification') ?? 'lq8_report_internal_notification'
  const lq8ReportUserTemplateKey =
    usageToTemplateKey.get('lq8_report.user_confirmation') ?? 'lq8_report_user_confirmation'
  const aiReadinessInternalTemplateKey =
    usageToTemplateKey.get('ai_readiness_report.internal_notification') ??
    'ai_readiness_report_internal_notification'
  const aiReadinessUserTemplateKey =
    usageToTemplateKey.get('ai_readiness_report.user_confirmation') ??
    'ai_readiness_report_user_confirmation'
  const surveyInvitationTemplateKey = usageToTemplateKey.get('survey.invitation') ?? 'survey_invitation'
  const surveyCompletionTemplateKey =
    usageToTemplateKey.get('survey.completion_confirmation') ?? 'survey_completion_confirmation'

  return {
    interest_internal_notification:
      (internalTemplateKey ? byKey.get(internalTemplateKey) : null) ??
      defaultEmailTemplates.interest_internal_notification,
    interest_user_confirmation:
      (userConfirmationTemplateKey ? byKey.get(userConfirmationTemplateKey) : null) ??
      defaultEmailTemplates.interest_user_confirmation,
    inquiry_internal_notification:
      (inquiryInternalTemplateKey ? byKey.get(inquiryInternalTemplateKey) : null) ??
      defaultEmailTemplates.inquiry_internal_notification,
    inquiry_user_confirmation:
      (inquiryUserTemplateKey ? byKey.get(inquiryUserTemplateKey) : null) ??
      defaultEmailTemplates.inquiry_user_confirmation,
    lq8_report_internal_notification:
      (lq8ReportInternalTemplateKey ? byKey.get(lq8ReportInternalTemplateKey) : null) ??
      defaultEmailTemplates.lq8_report_internal_notification,
    lq8_report_user_confirmation:
      (lq8ReportUserTemplateKey ? byKey.get(lq8ReportUserTemplateKey) : null) ??
      defaultEmailTemplates.lq8_report_user_confirmation,
    ai_readiness_report_internal_notification:
      (aiReadinessInternalTemplateKey ? byKey.get(aiReadinessInternalTemplateKey) : null) ??
      defaultEmailTemplates.ai_readiness_report_internal_notification,
    ai_readiness_report_user_confirmation:
      (aiReadinessUserTemplateKey ? byKey.get(aiReadinessUserTemplateKey) : null) ??
      defaultEmailTemplates.ai_readiness_report_user_confirmation,
    survey_invitation:
      (surveyInvitationTemplateKey ? byKey.get(surveyInvitationTemplateKey) : null) ??
      defaultEmailTemplates.survey_invitation,
    survey_completion_confirmation:
      (surveyCompletionTemplateKey ? byKey.get(surveyCompletionTemplateKey) : null) ??
      defaultEmailTemplates.survey_completion_confirmation,
  }
}
