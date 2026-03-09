import { addContactNote, sendContactEmail, updateContactStatus } from '@/app/dashboard/contacts/actions'
import type { Contact, ContactStatus, EmailTemplate } from '../_lib/contact-detail'

export function ContactActionsCard({
  contact,
  statusOptions,
  templates,
  selectedTemplateKey,
  appliedTemplateKey,
  selectedActivityId,
  validFilter,
  defaultSubject,
  defaultMessage,
}: {
  contact: Contact
  statusOptions: ContactStatus[]
  templates: EmailTemplate[]
  selectedTemplateKey: string
  appliedTemplateKey: string
  selectedActivityId: string
  validFilter: string
  defaultSubject: string
  defaultMessage: string
}) {
  return (
    <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-solid)] p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--admin-text-soft)]">Actions</h2>

      <details className="mb-2 rounded-lg border border-[var(--admin-border)] p-3">
        <summary className="cursor-pointer text-sm font-medium">Update status</summary>
        <form action={updateContactStatus} className="mt-3 space-y-2">
          <input type="hidden" name="contact_id" value={contact.id} />
          <select
            name="status"
            defaultValue={contact.status}
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-3 py-2 text-sm"
          >
            {statusOptions.map((status) => (
              <option key={status.key} value={status.key}>
                {status.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="w-full rounded-full bg-[var(--admin-accent)] px-3 py-2 text-sm font-medium text-white"
          >
            Save status
          </button>
        </form>
      </details>

      <details className="mb-2 rounded-lg border border-[var(--admin-border)] p-3">
        <summary className="cursor-pointer text-sm font-medium">Add note</summary>
        <form action={addContactNote} className="mt-3 space-y-2">
          <input type="hidden" name="contact_id" value={contact.id} />
          <textarea
            name="note"
            rows={4}
            required
            placeholder="Write your note"
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-full bg-[var(--admin-accent)] px-3 py-2 text-sm font-medium text-white"
          >
            Save note
          </button>
        </form>
      </details>

      <details className="rounded-lg border border-[var(--admin-border)] p-3">
        <summary className="cursor-pointer text-sm font-medium">Send email</summary>
        <form method="get" className="mt-3 flex items-center gap-2">
          <input type="hidden" name="feed" value={validFilter} />
          {selectedActivityId ? <input type="hidden" name="activity" value={selectedActivityId} /> : null}
          <select
            name="template"
            defaultValue={selectedTemplateKey}
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-3 py-2 text-sm"
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
            className="rounded-full border border-[var(--admin-border)] px-3 py-2 text-xs font-medium text-[var(--admin-text-primary)]"
          >
            Apply
          </button>
        </form>

        <form action={sendContactEmail} className="mt-3 space-y-2">
          <input type="hidden" name="contact_id" value={contact.id} />
          <input type="hidden" name="template_key" value={appliedTemplateKey} />
          <input
            type="text"
            name="subject"
            required
            maxLength={180}
            defaultValue={defaultSubject}
            placeholder="Email subject"
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-3 py-2 text-sm"
          />
          <textarea
            name="message"
            rows={6}
            required
            defaultValue={defaultMessage}
            placeholder="Email message"
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-full bg-[var(--admin-accent)] px-3 py-2 text-sm font-medium text-white"
          >
            Send email
          </button>
        </form>
      </details>
    </div>
  )
}
