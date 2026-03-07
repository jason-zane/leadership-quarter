'use client'

import { useMemo, useState } from 'react'
import sanitizeHtml from 'sanitize-html'
import { RichTextEditor } from '@/components/dashboard/emails/rich-text-editor'

type PreviewMode = 'desktop' | 'mobile'
type EditorTab = 'content' | 'mapping' | 'test'

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
  const [tab, setTab] = useState<EditorTab>('content')
  const [usageKey, setUsageKey] = useState(selectedUsageKey)
  const [status, setStatus] = useState<'draft' | 'active'>(defaultStatus)
  const canSave = subject.trim().length > 0 && htmlBody.trim().length > 0

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
    <form action={saveAction}>
      <input type="hidden" name="key" value={templateKey} />
      <input type="hidden" name="subject" value={subject} />
      <input type="hidden" name="html_body" value={htmlBody} />
      <input type="hidden" name="text_body" value={textBody} />
      <input type="hidden" name="usage_key" value={usageKey} />
      <input type="hidden" name="status" value={status} />

      <div className="backend-tab-bar">
        <button
          type="button"
          onClick={() => setTab('content')}
          className={['backend-tab-link', tab === 'content' ? 'backend-tab-link-active' : ''].join(' ')}
        >
          Content
        </button>
        <button
          type="button"
          onClick={() => setTab('mapping')}
          className={['backend-tab-link', tab === 'mapping' ? 'backend-tab-link-active' : ''].join(' ')}
        >
          Variables + Mapping
        </button>
        <button
          type="button"
          onClick={() => setTab('test')}
          className={['backend-tab-link', tab === 'test' ? 'backend-tab-link-active' : ''].join(' ')}
        >
          Test + Preview
        </button>
      </div>
      <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
        Edits in all tabs are part of one draft. Use <strong>Save template</strong> when ready.
      </p>

      {tab === 'content' ? (
        <div className="mt-4 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Subject</span>
            <input
              id={`${templateKey}-subject`}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="foundation-field"
              placeholder="Your AI Readiness invitation"
              required
            />
          </label>

          <div>
            <RichTextEditor
              id={`${templateKey}-html-body`}
              name="html_body"
              label="Email body"
              defaultValue={defaultHtmlBody}
              onChange={setHtmlBody}
            />
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Plain text fallback</span>
            <textarea
              id={`${templateKey}-text-body`}
              value={textBody}
              onChange={(event) => setTextBody(event.target.value)}
              className="foundation-field min-h-32"
              placeholder="Optional plain text fallback for email clients that block HTML."
            />
          </label>
        </div>
      ) : null}

      {tab === 'mapping' ? (
        <div className="mt-4 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Attached website flow</span>
            <select
              id={`${templateKey}-usage-key`}
              value={usageKey}
              onChange={(event) => setUsageKey(event.target.value)}
              className="foundation-field"
            >
              <option value="">Not attached</option>
              {usageOptions.map((usage) => (
                <option key={usage.usage_key} value={usage.usage_key}>
                  {usage.usage_name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Status</span>
            <select
              id={`${templateKey}-status`}
              value={status}
              onChange={(event) => setStatus(event.target.value === 'active' ? 'active' : 'draft')}
              className="foundation-field"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
            <p className="text-xs text-[var(--admin-text-muted)]">
              Draft templates are not used in live flows. Active templates are.
            </p>
          </label>

          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-3 text-sm text-[var(--admin-text-muted)]">
            <p className="font-semibold text-[var(--admin-text-primary)]">Available variables</p>
            <p className="mt-1">
              <code>{'{{first_name}}'}</code>, <code>{'{{last_name}}'}</code>, <code>{'{{email}}'}</code>, <code>{'{{source}}'}</code>
            </p>
          </div>
        </div>
      ) : null}

      {tab === 'test' ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
            <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Send test</h3>
            <p className="mt-1 text-xs text-[var(--admin-text-muted)]">Sends this draft including unsaved changes.</p>
            <label className="mt-3 block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Test recipient</span>
              <input
                id={`${templateKey}-test-to`}
                name="test_to"
                type="email"
                value={testTo}
                onChange={(event) => setTestTo(event.target.value)}
                placeholder="you@example.com"
                className="foundation-field"
              />
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                formAction={testAction}
                name="send_to_me"
                value="1"
                className="foundation-btn foundation-btn-secondary px-4 py-2 text-xs"
                disabled={!canSave}
              >
                Send test to me
              </button>
              <button
                type="submit"
                formAction={testAction}
                className="foundation-btn foundation-btn-secondary px-4 py-2 text-xs"
                disabled={!canSave}
              >
                Send test to recipient
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Live preview</h3>
              <div className="admin-toggle-group">
                <button
                  type="button"
                  onClick={() => setPreviewMode('desktop')}
                  className={['admin-toggle-chip', previewMode === 'desktop' ? 'admin-toggle-chip-active' : ''].join(' ')}
                >
                  Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className={['admin-toggle-chip', previewMode === 'mobile' ? 'admin-toggle-chip-active' : ''].join(' ')}
                >
                  Mobile
                </button>
              </div>
            </div>

            <div
              className={[
                'rounded-lg border border-[var(--admin-border)] bg-white p-4',
                previewMode === 'mobile' ? 'mx-auto max-w-sm' : '',
              ].join(' ')}
            >
              <p className="mb-3 text-xs text-[var(--admin-text-muted)]">
                <strong>Subject:</strong> {previewSubject || '(empty)'}
              </p>
              <div className="prose prose-sm max-w-none text-zinc-800" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
            <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
              Preview uses sample data: Alex Walker ({'{{first_name}}'}, {'{{last_name}}'}, {'{{email}}'}, {'{{source}}'}).
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-[var(--admin-border)] pt-4">
        <button type="submit" disabled={!canSave} className="foundation-btn foundation-btn-primary px-4 py-2 text-sm">
          Save template
        </button>
        {!canSave ? (
          <p className="text-xs text-[var(--admin-text-muted)]">Subject and HTML body are required to save.</p>
        ) : null}
      </div>
    </form>
  )
}
