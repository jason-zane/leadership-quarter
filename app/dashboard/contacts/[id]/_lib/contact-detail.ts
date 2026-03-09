import type { SupabaseClient } from '@supabase/supabase-js'
import { renderTemplate } from '@/utils/email-templates'

export type Contact = {
  id: string
  first_name: string
  last_name: string
  email: string
  source: string | null
  status: string
  age_range: string | null
  gender: string | null
  gender_self_describe: string | null
  runner_type: string | null
  location_label: string | null
  retreat_slug: string | null
  retreat_name: string | null
  budget_range: string | null
  retreat_style_preference: string | null
  duration_preference: string | null
  travel_radius: string | null
  accommodation_preference: string | null
  community_vs_performance: string | null
  preferred_season: string | null
  gender_optional: string | null
  life_stage_optional: string | null
  what_would_make_it_great: string | null
  profile_v2_updated_at: string | null
  created_at: string
  updated_at: string
}

export type ContactStatus = {
  key: string
  label: string
}

export type ContactEvent = {
  id: string
  event_type: string
  event_data: Record<string, string | number | boolean | null> | null
  note: string | null
  created_at: string
}

export type ContactEmail = {
  id: string
  subject: string
  sent_to_email: string
  sent_at: string
  provider: string
}

export type EmailTemplate = {
  key: string
  name: string
  status: string
  subject: string
  html_body: string
  text_body: string | null
}

export type ContactSubmission = {
  id: string
  form_key: string
  status: string
  review_status: string
  created_at: string
}

export type ActivityItem = {
  id: string
  kind: 'email' | 'submission' | 'event'
  type: 'email' | 'submission' | 'note' | 'status' | 'profile' | 'system'
  title: string
  subtitle: string
  detail: string | null
  createdAt: string
  href: string
}

export type ActivityFeedFilter = ActivityItem['type'] | 'all'

export const ACTIVITY_FILTER_OPTIONS: Array<{ value: ActivityFeedFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'email', label: 'Emails' },
  { value: 'submission', label: 'Submissions' },
  { value: 'note', label: 'Notes' },
  { value: 'status', label: 'Status' },
  { value: 'profile', label: 'Profile' },
]

const EVENT_LABELS: Record<string, { type: ActivityItem['type']; title: string }> = {
  note: { type: 'note', title: 'Internal note added' },
  status_changed: { type: 'status', title: 'Contact status updated' },
  profile_synced: { type: 'profile', title: 'Contact profile updated' },
  profile_backfilled: { type: 'profile', title: 'Profile fields backfilled' },
  submission_profile_autofill: { type: 'profile', title: 'Profile autofilled from submission' },
  submission_review_applied: { type: 'profile', title: 'Reviewed submission field applied' },
  contact_created: { type: 'system', title: 'Contact record created' },
}

function htmlToText(html: string) {
  return html
    .replaceAll(/<br\s*\/?>/gi, '\n')
    .replaceAll(/<\/p>/gi, '\n\n')
    .replaceAll(/<[^>]+>/g, '')
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .trim()
}

function formLabel(formKey: string) {
  if (formKey === 'retreat_registration_v1') return 'Retreat registration'
  if (formKey === 'general_registration_v1') return 'General registration'
  if (formKey === 'retreat_profile_optional_v1') return 'Optional profile'
  if (formKey === 'register_interest') return 'Interest registration'
  return 'Submission'
}

function statusLabel(status: string) {
  return status.replaceAll('_', ' ')
}

function makeEventDetail(event: ContactEvent) {
  if (event.note?.trim()) return event.note.trim()
  if (!event.event_data || Object.keys(event.event_data).length === 0) return null

  const labels: Record<string, string> = {
    source: 'Source',
    form_key: 'Form',
    status: 'Status',
    changed_fields: 'Changed fields',
    message: 'Message',
    to_email: 'Recipient',
    subject: 'Subject',
  }

  return Object.entries(event.event_data)
    .filter(([, value]) => value !== null && String(value).trim().length > 0)
    .map(([key, value]) => `${labels[key] ?? key.replaceAll('_', ' ')}: ${String(value)}`)
    .join(' • ')
}

export function buildActivityItems(
  contactId: string,
  events: ContactEvent[],
  emails: ContactEmail[],
  submissions: ContactSubmission[]
) {
  const eventItems: ActivityItem[] = events
    .filter(
      (event) =>
        !['email_sent', 'submission', 'submission_linked', 'submission_status_changed'].includes(event.event_type)
    )
    .map((event) => {
      const config = EVENT_LABELS[event.event_type] ?? {
        type: 'system' as const,
        title: statusLabel(event.event_type),
      }

      return {
        id: `event:${event.id}`,
        kind: 'event',
        type: config.type,
        title: config.title,
        subtitle: 'Contact activity',
        detail: makeEventDetail(event),
        createdAt: event.created_at,
        href: `/dashboard/contacts/${contactId}?activity=event:${event.id}`,
      }
    })

  const emailItems: ActivityItem[] = emails.map((email) => ({
    id: `email:${email.id}`,
    kind: 'email',
    type: 'email',
    title: email.subject,
    subtitle: `Email sent to ${email.sent_to_email}`,
    detail: `Provider: ${email.provider}`,
    createdAt: email.sent_at,
    href: `/dashboard/contacts/${contactId}/emails/${email.id}`,
  }))

  const submissionItems: ActivityItem[] = submissions.map((submission) => ({
    id: `submission:${submission.id}`,
    kind: 'submission',
    type: 'submission',
    title: formLabel(submission.form_key),
    subtitle: `${statusLabel(submission.status)} • ${statusLabel(submission.review_status)}`,
    detail: `Submission ${submission.id.slice(0, 8)}`,
    createdAt: submission.created_at,
    href: `/dashboard/submissions/${submission.id}`,
  }))

  return [...eventItems, ...emailItems, ...submissionItems].sort((left, right) =>
    left.createdAt < right.createdAt ? 1 : -1
  )
}

export function resolveActivityFilter(value: string | undefined): ActivityFeedFilter {
  const filter = value ?? 'all'
  return ['all', 'email', 'submission', 'note', 'status', 'profile', 'system'].includes(filter)
    ? (filter as ActivityFeedFilter)
    : 'all'
}

export function buildEmailDraft(contact: Contact, template: EmailTemplate | null) {
  if (!template) {
    return {
      subject: '',
      message: '',
    }
  }

  const fullName = `${contact.first_name} ${contact.last_name}`
  const templateVariables = {
    first_name: contact.first_name,
    last_name: contact.last_name,
    full_name: fullName,
    email: contact.email,
    source: contact.source ?? 'Website',
  }

  const rendered = renderTemplate(
    {
      subject: template.subject,
      html: template.html_body,
      text: template.text_body,
    },
    templateVariables,
    false
  )

  return {
    subject: rendered.subject ?? '',
    message: rendered.text?.trim() || htmlToText(rendered.html),
  }
}

export async function loadContactDetailData(adminClient: SupabaseClient, contactId: string) {
  const [
    { data: contactRow, error: contactError },
    { data: statuses },
    { data: eventRows, error: eventsError },
    { data: emailRows, error: emailsError },
    { data: templateRows, error: templatesError },
    { data: submissionRows, error: submissionsError },
  ] = await Promise.all([
    adminClient
      .from('contacts')
      .select(
        [
          'id',
          'first_name',
          'last_name',
          'email',
          'source',
          'status',
          'age_range',
          'gender',
          'gender_self_describe',
          'runner_type',
          'location_label',
          'retreat_slug',
          'retreat_name',
          'budget_range',
          'retreat_style_preference',
          'duration_preference',
          'travel_radius',
          'accommodation_preference',
          'community_vs_performance',
          'preferred_season',
          'gender_optional',
          'life_stage_optional',
          'what_would_make_it_great',
          'profile_v2_updated_at',
          'created_at',
          'updated_at',
        ].join(', ')
      )
      .eq('id', contactId)
      .maybeSingle(),
    adminClient.from('contact_statuses').select('key, label').order('sort_order', { ascending: true }),
    adminClient
      .from('contact_events')
      .select('id, event_type, event_data, note, created_at')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(200),
    adminClient
      .from('contact_emails')
      .select('id, subject, sent_to_email, sent_at, provider')
      .eq('contact_id', contactId)
      .eq('direction', 'outbound')
      .order('sent_at', { ascending: false })
      .limit(100),
    adminClient
      .from('email_templates')
      .select('key, name, status, subject, html_body, text_body')
      .eq('channel', 'email')
      .order('updated_at', { ascending: false })
      .limit(100),
    adminClient
      .from('interest_submissions')
      .select('id, form_key, status, review_status, created_at')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  return {
    contact: contactRow as Contact | null,
    contactError,
    statusOptions: (statuses ?? []) as ContactStatus[],
    events: ((eventsError ? [] : eventRows) ?? []) as ContactEvent[],
    emails: ((emailsError ? [] : emailRows) ?? []) as ContactEmail[],
    templates: ((templatesError ? [] : templateRows) ?? []) as EmailTemplate[],
    submissions: ((submissionsError ? [] : submissionRows) ?? []) as ContactSubmission[],
  }
}
