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
    <form
      action={action}
      className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Template Name</label>
        <input
          name="name"
          required
          placeholder="Retreat booking confirmation"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        />
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Description</label>
        <input
          name="description"
          placeholder="Sent when a user finishes checkout."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        />
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Attach to Website Flow (optional)
        </label>
        <select
          name="usage_key"
          defaultValue=""
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        >
          <option value="">Not attached yet</option>
          {usageOptions.map((usage) => (
            <option key={usage.usage_key} value={usage.usage_key}>
              {usage.usage_name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Subject</label>
        <input
          name="subject"
          required
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Your retreat registration is confirmed"
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        />
      </div>

      <div className="mb-4">
        <RichTextEditor
          id="new-template-html-body"
          name="html_body"
          label="Email Body"
          defaultValue="<p>Hi {{first_name}},</p><p>Thanks for your interest.</p>"
        />
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Plain Text Fallback (optional)
        </label>
        <textarea
          name="text_body"
          className="min-h-28 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        />
      </div>

      <button
        type="submit"
        className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Create Template
      </button>
    </form>
  )
}
