'use client'

import { useMemo, useState } from 'react'
import sanitizeHtml from 'sanitize-html'
import { RichTextEditor } from '@/components/dashboard/emails/rich-text-editor'

type PreviewMode = 'desktop' | 'mobile'

function applyVariables(template: string, vars: Record<string, string>) {
  return template.replaceAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, varName: string) => {
    return vars[varName] ?? ''
  })
}

export function TemplateEditorForm({
  templateKey,
  defaultSubject,
  defaultHtmlBody,
  defaultTextBody,
  defaultStatus,
  selectedUsageKey,
  usageOptions,
  saveAction,
  testAction,
  defaultTestTo,
}: {
  templateKey: string
  defaultSubject: string
  defaultHtmlBody: string
  defaultTextBody: string
  defaultStatus: 'draft' | 'active'
  selectedUsageKey: string
  usageOptions: Array<{
    usage_key: string
    usage_name: string
  }>
  saveAction: (formData: FormData) => void | Promise<void>
  testAction: (formData: FormData) => void | Promise<void>
  defaultTestTo: string
}) {
  const [subject, setSubject] = useState(defaultSubject)
  const [htmlBody, setHtmlBody] = useState(defaultHtmlBody)
  const [textBody, setTextBody] = useState(defaultTextBody)
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop')
  const [testTo, setTestTo] = useState(defaultTestTo)

  const sampleVars = useMemo(
    () => ({
      first_name: 'Alex',
      last_name: 'Walker',
      email: 'alex@example.com',
      source: 'Website',
    }),
    []
  )

  const previewSubject = useMemo(() => applyVariables(subject, sampleVars), [subject, sampleVars])
  const previewHtml = useMemo(() => {
    const withVars = applyVariables(htmlBody, sampleVars)
    return sanitizeHtml(withVars, {
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
  }, [htmlBody, sampleVars])

  return (
    <form
      action={saveAction}
      className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    >
      <input type="hidden" name="key" value={templateKey} />

      <div className="mb-4">
        <label
          htmlFor={`${templateKey}-subject`}
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Subject
        </label>
        <input
          id={`${templateKey}-subject`}
          name="subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
          required
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor={`${templateKey}-usage-key`}
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Attached Website Flow
        </label>
        <select
          id={`${templateKey}-usage-key`}
          name="usage_key"
          defaultValue={selectedUsageKey}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        >
          <option value="">Not attached</option>
          {usageOptions.map((usage) => (
            <option key={usage.usage_key} value={usage.usage_key}>
              {usage.usage_name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label
          htmlFor={`${templateKey}-status`}
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Status
        </label>
        <select
          id={`${templateKey}-status`}
          name="status"
          defaultValue={defaultStatus}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        >
          <option value="draft">Draft</option>
          <option value="active">Active</option>
        </select>
      </div>

      <div className="mb-4">
        <RichTextEditor
          id={`${templateKey}-html-body`}
          name="html_body"
          label="Email Body"
          defaultValue={defaultHtmlBody}
          onChange={setHtmlBody}
        />
      </div>

      <div className="mb-6">
        <label
          htmlFor={`${templateKey}-text-body`}
          className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Plain Text Fallback (optional)
        </label>
        <textarea
          id={`${templateKey}-text-body`}
          name="text_body"
          value={textBody}
          onChange={(event) => setTextBody(event.target.value)}
          className="min-h-32 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        />
      </div>

      <div className="mb-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">Send Test</h3>
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Sends this current draft (including unsaved changes) to a real inbox.
        </p>
        <div>
          <label
            htmlFor={`${templateKey}-test-to`}
            className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300"
          >
            Test recipient
          </label>
          <input
            id={`${templateKey}-test-to`}
            name="test_to"
            type="email"
            value={testTo}
            onChange={(event) => setTestTo(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
          />
        </div>
      </div>

      <p className="mb-4 text-xs text-zinc-500 dark:text-zinc-400">
        Variables available: <code>{'{{first_name}}'}</code>, <code>{'{{last_name}}'}</code>,{' '}
        <code>{'{{email}}'}</code>, <code>{'{{source}}'}</code>
      </p>

      <div className="mb-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Live Preview</h3>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setPreviewMode('desktop')}
              className={`rounded px-2 py-1 text-xs ${
                previewMode === 'desktop'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('mobile')}
              className={`rounded px-2 py-1 text-xs ${
                previewMode === 'mobile'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border border-zinc-300 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300'
              }`}
            >
              Mobile
            </button>
          </div>
        </div>

        <div
          className={`rounded border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/30 ${
            previewMode === 'mobile' ? 'mx-auto max-w-sm' : ''
          }`}
        >
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            <strong>Subject:</strong> {previewSubject || '(empty)'}
          </p>
          <div
            className="prose prose-sm max-w-none text-zinc-800 dark:prose-invert dark:text-zinc-200"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Save Template
        </button>
        <button
          type="submit"
          formAction={testAction}
          name="send_to_me"
          value="1"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Send Test to Me
        </button>
        <button
          type="submit"
          formAction={testAction}
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Send Test Email
        </button>
      </div>
    </form>
  )
}
