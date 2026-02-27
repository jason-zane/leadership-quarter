'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { Resend } from 'resend'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireDashboardUser } from '@/utils/dashboard-auth'
import { assertSameOrigin } from '@/utils/security/origin'

async function ensureDashboardUser() {
  try {
    assertSameOrigin()
  } catch {
    redirect('/dashboard?error=invalid_origin')
  }
  const auth = await requireDashboardUser()
  if (!auth.authorized) {
    redirect('/dashboard')
  }
  return auth
}

function sanitizeTextBody(raw: string) {
  return raw.replaceAll('\r\n', '\n').trim()
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function textToHtml(text: string) {
  return `<p>${escapeHtml(text).replaceAll('\n\n', '</p><p>').replaceAll('\n', '<br />')}</p>`
}

export async function updateContactStatus(formData: FormData) {
  await ensureDashboardUser()

  const contactId = String(formData.get('contact_id') ?? '').trim()
  const nextStatus = String(formData.get('status') ?? '').trim()

  if (!contactId || !nextStatus) {
    redirect('/dashboard/contacts?error=invalid_status_update')
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect(`/dashboard/contacts/${contactId}?error=missing_service_role`)
  }

  const { error } = await adminClient
    .from('contacts')
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contactId)

  if (error) {
    redirect(`/dashboard/contacts/${contactId}?error=status_update_failed`)
  }

  await adminClient.from('contact_events').insert({
    contact_id: contactId,
    event_type: 'status_changed',
    event_data: { status: nextStatus },
  })

  revalidatePath('/dashboard/contacts')
  revalidatePath(`/dashboard/contacts/${contactId}`)
  redirect(`/dashboard/contacts/${contactId}?saved=status`)
}

export async function addContactNote(formData: FormData) {
  await ensureDashboardUser()

  const contactId = String(formData.get('contact_id') ?? '').trim()
  const note = String(formData.get('note') ?? '').trim()

  if (!contactId || !note) {
    redirect(`/dashboard/contacts/${contactId}?error=invalid_note`)
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect(`/dashboard/contacts/${contactId}?error=missing_service_role`)
  }

  const { error: eventError } = await adminClient.from('contact_events').insert({
    contact_id: contactId,
    event_type: 'note',
    event_data: {},
    note,
  })

  if (eventError) {
    redirect(`/dashboard/contacts/${contactId}?error=note_save_failed`)
  }

  await adminClient
    .from('contacts')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', contactId)

  revalidatePath('/dashboard/contacts')
  revalidatePath(`/dashboard/contacts/${contactId}`)
  redirect(`/dashboard/contacts/${contactId}?saved=note`)
}

export async function sendContactEmail(formData: FormData) {
  const auth = await ensureDashboardUser()

  const contactId = String(formData.get('contact_id') ?? '').trim()
  const templateKeyRaw = String(formData.get('template_key') ?? '').trim()
  const templateKey = templateKeyRaw.length > 0 ? templateKeyRaw : null
  const subject = String(formData.get('subject') ?? '').trim()
  const messageRaw = String(formData.get('message') ?? '')
  const message = sanitizeTextBody(messageRaw)

  if (!contactId || !subject || !message) {
    redirect(`/dashboard/contacts/${contactId}?error=invalid_email_fields`)
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    redirect(`/dashboard/contacts/${contactId}?error=missing_service_role`)
  }

  const { data: contactRow, error: contactError } = await adminClient
    .from('contacts')
    .select('email')
    .eq('id', contactId)
    .maybeSingle()

  const contactEmail = (contactRow as { email?: string } | null)?.email?.trim().toLowerCase()
  if (contactError || !contactEmail) {
    redirect(`/dashboard/contacts/${contactId}?error=contact_not_found`)
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.RESEND_FROM_EMAIL
  const replyTo = process.env.RESEND_REPLY_TO?.trim() || undefined

  if (!resendApiKey || !fromEmail) {
    redirect(`/dashboard/contacts/${contactId}?error=email_not_configured`)
  }

  const resend = new Resend(resendApiKey)
  const html = textToHtml(message)
  const { data: sendData, error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: contactEmail,
    subject,
    text: message,
    html,
    replyTo,
  })

  if (sendError) {
    redirect(`/dashboard/contacts/${contactId}?error=email_send_failed`)
  }

  const { error: logError } = await adminClient.from('contact_emails').insert({
    contact_id: contactId,
    direction: 'outbound',
    provider: 'resend',
    provider_message_id: sendData?.id ?? null,
    template_key: templateKey,
    subject,
    text_body: message,
    html_body: html,
    sent_to_email: contactEmail,
    sent_by_user_id: auth.user.id,
  })

  if (logError) {
    redirect(`/dashboard/contacts/${contactId}?error=email_log_failed`)
  }

  await adminClient.from('contact_events').insert({
    contact_id: contactId,
    event_type: 'email_sent',
    event_data: {
      subject,
      to_email: contactEmail,
      provider: 'resend',
      template_key: templateKey,
    },
    actor_user_id: auth.user.id,
  })

  await adminClient
    .from('contacts')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', contactId)

  revalidatePath('/dashboard/contacts')
  revalidatePath(`/dashboard/contacts/${contactId}`)
  redirect(`/dashboard/contacts/${contactId}?saved=email_sent`)
}
