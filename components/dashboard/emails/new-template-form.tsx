'use client'

import { useState } from 'react'
import { RichTextEditor } from '@/components/dashboard/emails/rich-text-editor'

export function NewTemplateForm({
  usageOptions,
  action,
}: {
  usageOptions: Array<{ usage_key: string; usage_name: string }>
  action: (formData: FormData) => void | Promise<void>
}) {
  const [subject, setSubject] = useState('')

  return (
    <form action={action} className="foundation-surface foundation-surface-admin p-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Template name</span>
          <input name="name" required placeholder="Retreat booking confirmation" className="foundation-field" />
        </label>

        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Attach flow (optional)</span>
          <select name="usage_key" defaultValue="" className="foundation-field">
            <option value="">Not attached yet</option>
            {usageOptions.map((usage) => (
              <option key={usage.usage_key} value={usage.usage_key}>
                {usage.usage_name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-4 block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Description</span>
        <input name="description" placeholder="Sent when a user finishes checkout." className="foundation-field" />
      </label>

      <label className="mt-4 block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Subject</span>
        <input
          name="subject"
          required
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Your registration is confirmed"
          className="foundation-field"
        />
      </label>

      <div className="mt-5">
        <RichTextEditor
          id="new-template-html-body"
          name="html_body"
          label="Email body"
          defaultValue="<p>Hi {{first_name}},</p><p>Thanks for your interest.</p>"
        />
      </div>

      <label className="mt-5 block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Plain text fallback</span>
        <textarea name="text_body" className="foundation-field min-h-28" />
      </label>

      <div className="mt-6 flex items-center gap-2">
        <button type="submit" className="foundation-btn foundation-btn-primary px-4 py-2 text-sm">
          Create template
        </button>
      </div>
    </form>
  )
}
