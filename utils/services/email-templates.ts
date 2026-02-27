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

  return {
    interest_internal_notification:
      (internalTemplateKey ? byKey.get(internalTemplateKey) : null) ??
      defaultEmailTemplates.interest_internal_notification,
    interest_user_confirmation:
      (userConfirmationTemplateKey ? byKey.get(userConfirmationTemplateKey) : null) ??
      defaultEmailTemplates.interest_user_confirmation,
  }
}
