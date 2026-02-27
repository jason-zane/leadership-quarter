import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { addContactNote, sendContactEmail, updateContactStatus } from '@/app/dashboard/contacts/actions'
import { renderTemplate } from '@/utils/email-templates'
import { StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { CopyEmail } from '@/components/ui/copy-email'
import { RelativeTime } from '@/components/ui/relative-time'
import { ActionFeedback } from '@/components/ui/action-feedback'

type Contact = {
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

type ContactStatus = {
  key: string
  label: string
}

type ContactEvent = {
  id: string
  event_type: string
  event_data: Record<string, string | number | boolean | null> | null
  note: string | null
  created_at: string
}

type ContactEmail = {
  id: string
  subject: string
  sent_to_email: string
  sent_at: string
  provider: string
}

type EmailTemplate = {
  key: string
  name: string
  status: string
  subject: string
  html_body: string
  text_body: string | null
}

type ContactSubmission = {
  id: string
  form_key: string
  status: string
  review_status: string
  created_at: string
}

type ActivityItem = {
  id: string
  kind: 'email' | 'submission' | 'event'
  type: 'email' | 'submission' | 'note' | 'status' | 'profile' | 'system'
  title: string
  subtitle: string
  detail: string | null
  createdAt: string
  href: string
}

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

function buildActivityItems(
  contactId: string,
  events: ContactEvent[],
  emails: ContactEmail[],
  submissions: ContactSubmission[]
): ActivityItem[] {
  const eventItems: ActivityItem[] = events
    .filter((event) => !['email_sent', 'submission', 'submission_linked', 'submission_status_changed'].includes(event.event_type))
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

  return [...eventItems, ...emailItems, ...submissionItems].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  )
}

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const query = await searchParams
  const adminClient = createAdminClient()

  if (!adminClient) {
    return (
      <section>
        <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Contact</h1>
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Missing SUPABASE_SERVICE_ROLE_KEY in environment.
        </p>
      </section>
    )
  }

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
      .eq('id', id)
      .maybeSingle(),
    adminClient.from('contact_statuses').select('key, label').order('sort_order', { ascending: true }),
    adminClient
      .from('contact_events')
      .select('id, event_type, event_data, note, created_at')
      .eq('contact_id', id)
      .order('created_at', { ascending: false })
      .limit(200),
    adminClient
      .from('contact_emails')
      .select('id, subject, sent_to_email, sent_at, provider')
      .eq('contact_id', id)
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
      .eq('contact_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  if (contactError || !contactRow) notFound()

  const contact = contactRow as unknown as Contact
  const statusOptions = (statuses ?? []) as ContactStatus[]
  const events = ((eventsError ? [] : eventRows) ?? []) as ContactEvent[]
  const emails = ((emailsError ? [] : emailRows) ?? []) as ContactEmail[]
  const templates = ((templatesError ? [] : templateRows) ?? []) as EmailTemplate[]
  const submissions = ((submissionsError ? [] : submissionRows) ?? []) as ContactSubmission[]

  const fullName = `${contact.first_name} ${contact.last_name}`
  const selectedTemplateKey = typeof query.template === 'string' ? query.template : ''
  const selectedTemplate =
    selectedTemplateKey.length > 0 ? templates.find((template) => template.key === selectedTemplateKey) : null

  const templateVariables = {
    first_name: contact.first_name,
    last_name: contact.last_name,
    full_name: fullName,
    email: contact.email,
    source: contact.source ?? 'Website',
  }

  const renderedTemplate = selectedTemplate
    ? renderTemplate(
        {
          subject: selectedTemplate.subject,
          html: selectedTemplate.html_body,
          text: selectedTemplate.text_body,
        },
        templateVariables,
        false
      )
    : null

  const defaultSubject = renderedTemplate?.subject ?? ''
  const defaultMessage = renderedTemplate?.text?.trim() || (renderedTemplate ? htmlToText(renderedTemplate.html) : '')

  const allItems = buildActivityItems(contact.id, events, emails, submissions)
  const feedFilter = typeof query.feed === 'string' ? query.feed : 'all'
  const validFilter = ['all', 'email', 'submission', 'note', 'status', 'profile', 'system'].includes(feedFilter)
    ? feedFilter
    : 'all'

  const filteredItems =
    validFilter === 'all' ? allItems : allItems.filter((item) => item.type === validFilter)

  const selectedActivity = typeof query.activity === 'string' ? query.activity : ''
  const selectedItem = selectedActivity ? allItems.find((item) => item.id === selectedActivity) : null

  const feedLink = (feed: string) =>
    `/dashboard/contacts/${contact.id}?feed=${feed}${selectedItem ? `&activity=${selectedItem.id}` : ''}`

  return (
    <section>
      <Suspense>
        <ActionFeedback
          messages={{
            note: 'Note saved.',
            status: 'Status updated.',
            email_sent: 'Email sent and logged.',
          }}
          errorMessages={{
            invalid_email_fields: 'Subject and message are required.',
            email_not_configured: 'Email sending is not configured.',
            email_send_failed: 'Could not send email. Check provider settings.',
            email_log_failed: 'Email sent, but CRM logging failed.',
            contact_not_found: 'Could not find this contact record.',
          }}
        />
      </Suspense>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/dashboard/contacts" className="hover:text-zinc-800 dark:hover:text-zinc-200">
              Contacts
            </Link>
            <span className="mx-2">/</span>
            <span>{fullName}</span>
          </div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{fullName}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <CopyEmail email={contact.email} />
            <StatusBadge status={contact.status} />
            {contact.source ? (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {contact.source}
              </span>
            ) : null}
          </div>
        </div>
        <Avatar name={fullName} size="md" />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Profile snapshot
          </h2>
          <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {[
              ['Age range', contact.age_range],
              ['Gender', contact.gender],
              ['Gender details', contact.gender_self_describe],
              ['Runner type', contact.runner_type],
              ['Location', contact.location_label],
              ['Budget range', contact.budget_range],
              ['Retreat style', contact.retreat_style_preference],
              ['Duration preference', contact.duration_preference],
              ['Travel radius', contact.travel_radius],
              ['Accommodation', contact.accommodation_preference],
              ['Community vs performance', contact.community_vs_performance],
              ['Preferred season', contact.preferred_season],
              ['Optional gender', contact.gender_optional],
              ['Life stage', contact.life_stage_optional],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/40">
                <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</dt>
                <dd className="mt-1 text-zinc-800 dark:text-zinc-100">{value || '—'}</dd>
              </div>
            ))}
          </dl>
          {contact.what_would_make_it_great ? (
            <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-100">
              <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">What would make it great</p>
              <p>{contact.what_would_make_it_great}</p>
            </div>
          ) : null}
          {contact.profile_v2_updated_at ? (
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              Profile updated <RelativeTime date={contact.profile_v2_updated_at} />
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Actions
          </h2>

          <details className="mb-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <summary className="cursor-pointer text-sm font-medium">Update status</summary>
            <form action={updateContactStatus} className="mt-3 space-y-2">
              <input type="hidden" name="contact_id" value={contact.id} />
              <select
                name="status"
                defaultValue={contact.status}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                {statusOptions.map((status) => (
                  <option key={status.key} value={status.key}>
                    {status.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded-full bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Save status
              </button>
            </form>
          </details>

          <details className="mb-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <summary className="cursor-pointer text-sm font-medium">Add note</summary>
            <form action={addContactNote} className="mt-3 space-y-2">
              <input type="hidden" name="contact_id" value={contact.id} />
              <textarea
                name="note"
                rows={4}
                required
                placeholder="Write your note"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Save note
              </button>
            </form>
          </details>

          <details className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <summary className="cursor-pointer text-sm font-medium">Send email</summary>
            <form method="get" className="mt-3 flex items-center gap-2">
              <input type="hidden" name="feed" value={validFilter} />
              {selectedItem ? <input type="hidden" name="activity" value={selectedItem.id} /> : null}
              <select
                name="template"
                defaultValue={selectedTemplateKey}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">No template</option>
                {templates.map((template) => (
                  <option key={template.key} value={template.key}>
                    {template.name} {template.status === 'draft' ? '(Draft)' : ''}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-full border border-zinc-300 px-3 py-2 text-xs font-medium dark:border-zinc-700"
              >
                Apply
              </button>
            </form>

            <form action={sendContactEmail} className="mt-3 space-y-2">
              <input type="hidden" name="contact_id" value={contact.id} />
              <input type="hidden" name="template_key" value={selectedTemplate?.key ?? ''} />
              <input
                type="text"
                name="subject"
                required
                maxLength={180}
                defaultValue={defaultSubject}
                placeholder="Email subject"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              <textarea
                name="message"
                rows={6}
                required
                defaultValue={defaultMessage}
                placeholder="Email message"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Send email
              </button>
            </form>
          </details>
        </div>
      </div>

      {selectedItem ? (
        <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{selectedItem.title}</p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{selectedItem.subtitle}</p>
              {selectedItem.detail ? (
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-200">{selectedItem.detail}</p>
              ) : null}
            </div>
            <Link
              href={`/dashboard/contacts/${contact.id}?feed=${validFilter}`}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              Clear selection
            </Link>
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {[
            ['all', 'All'],
            ['email', 'Emails'],
            ['submission', 'Submissions'],
            ['note', 'Notes'],
            ['status', 'Status'],
            ['profile', 'Profile'],
          ].map(([value, label]) => {
            const active = validFilter === value
            return (
              <Link
                key={value}
                href={feedLink(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                }`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {filteredItems.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No activity for this filter.</p>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="block rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:bg-zinc-800"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          item.type === 'email'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                            : item.type === 'submission'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : item.type === 'note'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                : item.type === 'status'
                                  ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300'
                                  : item.type === 'profile'
                                    ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
                                    : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'
                        }`}
                      >
                        {item.type}
                      </span>
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{item.title}</p>
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-500 dark:text-zinc-400">{item.subtitle}</p>
                    {item.detail ? (
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-300">{item.detail}</p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                    <RelativeTime date={item.createdAt} />
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
