import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { CopyEmail } from '@/components/ui/copy-email'
import { ActionFeedback } from '@/components/ui/action-feedback'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { ContactActionsCard } from './_components/contact-actions-card'
import { ContactActivityFeed } from './_components/contact-activity-feed'
import { ContactProfileCard } from './_components/contact-profile-card'
import { ContactSelectedActivityCard } from './_components/contact-selected-activity-card'
import {
  buildActivityItems,
  buildEmailDraft,
  loadContactDetailData,
  resolveActivityFilter,
} from './_lib/contact-detail'

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
      <DashboardPageShell>
        <h1 className="mb-2 text-xl font-semibold text-[var(--admin-text-primary)]">Contact</h1>
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Missing SUPABASE_SERVICE_ROLE_KEY in environment.
        </p>
      </DashboardPageShell>
    )
  }

  const { contact, contactError, statusOptions, events, emails, templates, submissions } =
    await loadContactDetailData(adminClient, id)

  if (contactError || !contact) notFound()

  const fullName = `${contact.first_name} ${contact.last_name}`
  const selectedTemplateKey = typeof query.template === 'string' ? query.template : ''
  const selectedTemplate =
    selectedTemplateKey.length > 0 ? templates.find((template) => template.key === selectedTemplateKey) : null
  const { subject: defaultSubject, message: defaultMessage } = buildEmailDraft(contact, selectedTemplate ?? null)

  const allItems = buildActivityItems(contact.id, events, emails, submissions)
  const validFilter = resolveActivityFilter(typeof query.feed === 'string' ? query.feed : undefined)
  const filteredItems =
    validFilter === 'all' ? allItems : allItems.filter((item) => item.type === validFilter)

  const selectedActivity = typeof query.activity === 'string' ? query.activity : ''
  const selectedItem = selectedActivity ? allItems.find((item) => item.id === selectedActivity) : null

  return (
    <DashboardPageShell>
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

      <nav className="backend-breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard/contacts">Contacts</Link>
        <span>/</span>
        <span className="text-[var(--admin-text-primary)]">{fullName}</span>
      </nav>

      <DashboardPageHeader
        eyebrow="CRM"
        title={fullName}
        description="Contact profile, timeline, and communication workflow."
        actions={(
          <div className="flex items-center gap-2">
            <CopyEmail email={contact.email} />
            <StatusBadge status={contact.status} />
            {contact.source ? (
              <span className="rounded-full bg-[var(--admin-accent-soft)] px-2 py-0.5 text-xs text-[var(--admin-accent-strong)]">
                {contact.source}
              </span>
            ) : null}
            <Avatar name={fullName} size="md" />
          </div>
        )}
      />

      <DashboardKpiStrip
        items={[
          { label: 'Timeline items', value: allItems.length },
          { label: 'Submissions', value: submissions.length },
          { label: 'Emails sent', value: emails.length },
          { label: 'Events', value: events.length },
        ]}
      />

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <ContactProfileCard contact={contact} />
        <ContactActionsCard
          contact={contact}
          statusOptions={statusOptions}
          templates={templates}
          selectedTemplateKey={selectedTemplateKey}
          appliedTemplateKey={selectedTemplate?.key ?? ''}
          selectedActivityId={selectedItem?.id ?? ''}
          validFilter={validFilter}
          defaultSubject={defaultSubject}
          defaultMessage={defaultMessage}
        />
      </div>

      {selectedItem ? (
        <ContactSelectedActivityCard contactId={contact.id} validFilter={validFilter} item={selectedItem} />
      ) : null}

      <ContactActivityFeed
        contactId={contact.id}
        validFilter={validFilter}
        selectedItemId={selectedItem?.id ?? ''}
        items={filteredItems}
      />
    </DashboardPageShell>
  )
}
