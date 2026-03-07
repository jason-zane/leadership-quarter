'use client'

import { useRef, useState } from 'react'

const variableTokens = ['{{first_name}}', '{{last_name}}', '{{email}}', '{{source}}']

export function RichTextEditor({
  name,
  id,
  label,
  defaultValue,
  onChange,
}: {
  name: string
  id: string
  label: string
  defaultValue: string
  onChange?: (nextHtml: string) => void
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [html, setHtml] = useState(defaultValue)

  function syncFromEditor() {
    const nextHtml = editorRef.current?.innerHTML ?? ''
    setHtml(nextHtml)
    onChange?.(nextHtml)
  }

  function runCommand(command: string, value?: string) {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    syncFromEditor()
  }

  function insertToken(token: string) {
    runCommand('insertText', token)
  }

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
        {label}
      </label>

      <div className="mb-2 flex flex-wrap gap-1.5">
        <button type="button" onClick={() => runCommand('bold')} className="foundation-btn foundation-btn-secondary px-2 py-1 text-xs">
          Bold
        </button>
        <button type="button" onClick={() => runCommand('italic')} className="foundation-btn foundation-btn-secondary px-2 py-1 text-xs">
          Italic
        </button>
        <button type="button" onClick={() => runCommand('insertUnorderedList')} className="foundation-btn foundation-btn-secondary px-2 py-1 text-xs">
          Bullet list
        </button>
        <button type="button" onClick={() => runCommand('insertOrderedList')} className="foundation-btn foundation-btn-secondary px-2 py-1 text-xs">
          Numbered list
        </button>
        <button type="button" onClick={() => runCommand('formatBlock', '<h2>')} className="foundation-btn foundation-btn-secondary px-2 py-1 text-xs">
          Heading
        </button>
        <button type="button" onClick={() => runCommand('formatBlock', '<p>')} className="foundation-btn foundation-btn-secondary px-2 py-1 text-xs">
          Paragraph
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {variableTokens.map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => insertToken(token)}
            className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-2 py-1 text-xs text-[var(--admin-text-primary)] hover:bg-[var(--admin-surface-strong)]"
          >
            Insert {token}
          </button>
        ))}
      </div>

      <div
        id={id}
        ref={editorRef}
        contentEditable
        onInput={syncFromEditor}
        className="min-h-56 w-full rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2 text-sm text-[var(--admin-text-primary)] shadow-sm focus:outline-none"
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: defaultValue }}
      />

      <input type="hidden" name={name} value={html} />
      <p className="mt-2 text-xs text-[var(--admin-text-muted)]">HTML is saved from the visual editor.</p>
    </div>
  )
}
