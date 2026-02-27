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
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>

      <div className="mb-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => runCommand('bold')}
          className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() => runCommand('italic')}
          className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Italic
        </button>
        <button
          type="button"
          onClick={() => runCommand('insertUnorderedList')}
          className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Bullet list
        </button>
        <button
          type="button"
          onClick={() => runCommand('insertOrderedList')}
          className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Numbered list
        </button>
        <button
          type="button"
          onClick={() => runCommand('formatBlock', '<h2>')}
          className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Heading
        </button>
        <button
          type="button"
          onClick={() => runCommand('formatBlock', '<p>')}
          className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Paragraph
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        {variableTokens.map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => insertToken(token)}
            className="rounded border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
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
        className="min-h-56 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: defaultValue }}
      />

      <input type="hidden" name={name} value={html} />
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        Tip: You can style text visually; HTML is saved automatically in the background.
      </p>
    </div>
  )
}
