'use client'

import { useState } from 'react'

export function CopyButton({ text, disabled }: { text: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={() => {
        void copy()
      }}
      disabled={disabled}
      className="foundation-btn foundation-btn-secondary foundation-btn-md shrink-0"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
