'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import sanitizeHtml from 'sanitize-html'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireDashboardUser } from '@/utils/dashboard-auth'
import { renderTemplate } from '@/utils/email-templates'
import { assertSameOrigin } from '@/utils/security/origin'

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

type TemplateRow = {
  key: string
  slug: string
  description: string | null
  subject: string
  html_body: string
  text_body: string | null
}

async function getTemplateByKey(key: string) {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return { template: null as TemplateRow | null, error: 'missing_service_role' as const }
  }

  const { data, error } = await adminClient
    .from('email_templates')
    .select('key, slug, description, subject, html_body, text_body')
    .eq('key', key)
    .maybeSingle()

  if (error) {
    return { template: null as TemplateRow | null, error: 'load_failed' as const }
  }

  return { template: (data as TemplateRow | null) ?? null, error: null }
}

async function snapshotTemplateVersion(
  templateKey: string,
  actorUserId: string,
  snapshot: {
    subject: string
    html_body: string
    text_body: string | null
  },
  changeNote: string
) {
  const adminClient = createAdminClient()
  if (!adminClient) return

  const { data: latest } = await adminClient
    .from('email_template_versions')
    .select('version')
    .eq('template_key', templateKey)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextVersion = ((latest as { version?: number } | null)?.version ?? 0) + 1

  await adminClient.from('email_template_versions').insert({
    template_key: templateKey,
    version: nextVersion,
    subject: snapshot.subject,
    html_body: snapshot.html_body,
    text_body: snapshot.text_body,
    created_by_user_id: actorUserId,
    change_note: changeNote,
  })
}

async function syncUsageMapping(usageKey: string | null, templateKey: string) {
  const adminClient = createAdminClient()
  if (!adminClient) return

  await adminClient
    .from('email_template_usages')
    .update({ template_key: null, updated_at: new Date().toISOString() })
    .eq('template_key', templateKey)

  if (!usageKey) return

  await adminClient
    .from('email_template_usages')
    .update({ template_key: templateKey, updated_at: new Date().toISOString() })
    .eq('usage_key', usageKey)
}

async function ensureUsageSlotAvailable(usageKey: string | null, templateKey: string) {
  if (!usageKey) return
  const adminClient = createAdminClient()
  if (!adminClient) return

  await adminClient
    .from('email_template_usages')
    .update({ template_key: null, updated_at: new Date().toISOString() })
    .eq('usage_key', usageKey)
    .neq('template_key', templateKey)
}

async function getUsageName(usageKey: string | null) {
  if (!usageKey) return null
  const adminClient = createAdminClient()
  if (!adminClient) return usageKey
  const { data } = await adminClient
    .from('email_template_usages')
    .select('usage_name')
    .eq('usage_key', usageKey)
    .maybeSingle()
  return (data as { usage_name?: string } | null)?.usage_name ?? usageKey
}

async function appendAttachmentNote(description: string | null, usageKey: string | null) {
  const usageName = await getUsageName(usageKey)
  if (!usageName) return description
  const note = `Attached to: ${usageName}`
  if (!description) return note
  if (description.includes(note)) return description
  return `${description}\n${note}`
}

function sanitizeEmailHtml(input: string) {
  return sanitizeHtml(input, {
    allowedTags: [
      'a',
      'b',
      'blockquote',
      'br',
      'code',
      'div',
      'em',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'hr',
      'i',
      'img',
      'li',
      'ol',
      'p',
      'pre',
      'span',
      'strong',
      'table',
      'tbody',
      'td',
      'th',
      'thead',
      'tr',
      'u',
      'ul',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height'],
      '*': ['style'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
  })
}

function ensureSameOrigin() {
  try {
    assertSameOrigin()
  } catch {
    redirect('/dashboard?error=invalid_origin')
  }
}

export async function createEmailTemplate(formData: FormData) {
  ensureSameOrigin()
  const auth = await requireDashboardUser()
  if (!auth.authorized) {
    redirect('/dashboard')
  }

  const name = String(formData.get('name') ?? '').trim()
  const descriptionRaw = String(formData.get('description') ?? '').trim()
  const description = descriptionRaw.length > 0 ? descriptionRaw : null
  const subject = String(formData.get('subject') ?? '').trim()
  const htmlBodyRaw = String(formData.get('html_body') ?? '').trim()
  const htmlBody = sanitizeEmailHtml(htmlBodyRaw)
  const textBodyRaw = String(formData.get('text_body') ?? '').trim()
  const textBody = textBodyRaw.length > 0 ? textBodyRaw : null
  const usageKeyRaw = String(formData.get('usage_key') ?? '').trim()
  const usageKey = usageKeyRaw.length > 0 ? usageKeyRaw : null

  if (!name || !subject || !htmlBody) {
    redirect('/dashboard/emails/new?error=missing_fields')
  }

  const baseSlug = slugify(name) || `template-${Date.now()}`
  const templateKey = `${baseSlug}_${Date.now()}`

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect('/dashboard/emails/new?error=missing_service_role')
  }

  const { error } = await adminClient.from('email_templates').insert({
    key: templateKey,
    slug: baseSlug,
    name,
    description,
    subject,
    html_body: htmlBody,
    text_body: textBody,
    category: 'operations',
    status: 'draft',
    channel: 'email',
    updated_by_user_id: auth.user.id,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    redirect('/dashboard/emails/new?error=create_failed')
  }

  await snapshotTemplateVersion(
    templateKey,
    auth.user.id,
    { subject, html_body: htmlBody, text_body: textBody },
    'Template created'
  )
  await ensureUsageSlotAvailable(usageKey, templateKey)
  await syncUsageMapping(usageKey, templateKey)

  revalidatePath('/dashboard/emails')
  redirect(`/dashboard/emails/${templateKey}?saved=created`)
}

export async function updateEmailTemplate(formData: FormData) {
  ensureSameOrigin()
  const auth = await requireDashboardUser()
  if (!auth.authorized) {
    redirect('/dashboard')
  }

  const key = String(formData.get('key') ?? '').trim()
  const subject = String(formData.get('subject') ?? '').trim()
  const htmlBodyRaw = String(formData.get('html_body') ?? '').trim()
  const htmlBody = sanitizeEmailHtml(htmlBodyRaw)
  const textBodyRaw = String(formData.get('text_body') ?? '').trim()
  const textBody = textBodyRaw.length > 0 ? textBodyRaw : null
  const usageKeyRaw = String(formData.get('usage_key') ?? '').trim()
  const usageKey = usageKeyRaw.length > 0 ? usageKeyRaw : null
  const statusRaw = String(formData.get('status') ?? '').trim().toLowerCase()
  const status = statusRaw === 'active' ? 'active' : 'draft'

  if (!key || !subject || !htmlBody) {
    redirect(`/dashboard/emails/${key || ''}?error=missing_fields`)
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect(`/dashboard/emails/${key}?error=missing_service_role`)
  }

  const { template } = await getTemplateByKey(key)
  if (!template) {
    redirect('/dashboard/emails?error=invalid_template')
  }

  const nextDescription = await appendAttachmentNote(template.description ?? null, usageKey)

  const { error } = await adminClient
    .from('email_templates')
    .update({
      subject,
      html_body: htmlBody,
      text_body: textBody,
      description: nextDescription,
      status,
      updated_by_user_id: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('key', key)

  if (error) {
    redirect(`/dashboard/emails/${key}?error=save_failed`)
  }

  await snapshotTemplateVersion(
    key,
    auth.user.id,
    { subject, html_body: htmlBody, text_body: textBody },
    'Template updated'
  )
  await ensureUsageSlotAvailable(usageKey, key)
  await syncUsageMapping(usageKey, key)

  revalidatePath('/dashboard/emails')
  revalidatePath(`/dashboard/emails/${key}`)
  redirect(`/dashboard/emails/${key}?saved=1`)
}

export async function sendTestEmailTemplate(formData: FormData) {
  ensureSameOrigin()
  const auth = await requireDashboardUser()
  if (!auth.authorized) {
    redirect('/dashboard')
  }

  const key = String(formData.get('key') ?? '')
  const subject = String(formData.get('subject') ?? '').trim()
  const htmlBodyRaw = String(formData.get('html_body') ?? '').trim()
  const htmlBody = sanitizeEmailHtml(htmlBodyRaw)
  const textBodyRaw = String(formData.get('text_body') ?? '').trim()
  const textBody = textBodyRaw.length > 0 ? textBodyRaw : null
  const sendToMe = String(formData.get('send_to_me') ?? '') === '1'
  const explicitTo = String(formData.get('test_to') ?? '')
    .trim()
    .toLowerCase()

  if (!subject || !htmlBody) {
    redirect(`/dashboard/emails/${key}?error=missing_fields`)
  }

  const to = sendToMe
    ? auth.user.email?.toLowerCase() || ''
    : explicitTo || auth.user.email?.toLowerCase() || ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    redirect(`/dashboard/emails/${key}?error=invalid_test_email`)
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  if (!resendApiKey || !fromEmail) {
    redirect(`/dashboard/emails/${key}?error=test_email_not_configured`)
  }

  const resend = new Resend(resendApiKey)
  const rendered = renderTemplate(
    {
      subject,
      html: htmlBody,
      text: textBody,
    },
    {
      first_name: 'Alex',
      last_name: 'Walker',
      email: 'alex@example.com',
      source: 'Website',
    },
    true
  )

  const { error } = await resend.emails.send({
    from: fromEmail,
    to,
    subject: `[Test] ${rendered.subject}`,
    html: rendered.html,
    text: rendered.text ?? undefined,
  })

  if (error) {
    redirect(`/dashboard/emails/${key}?error=test_send_failed`)
  }

  redirect(`/dashboard/emails/${key}?saved=test_sent`)
}
