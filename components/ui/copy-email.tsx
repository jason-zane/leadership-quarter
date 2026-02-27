'use client'

import { useState } from 'react'
import { CopyIcon, CheckIcon } from '@/components/icons'

export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard not available
    }
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : `Copy ${email}`}
      className="group flex items-center gap-1.5 text-left text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      <span className="text-sm">{email}</span>
      <span className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
        {copied ? (
          <CheckIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        ) : (
          <CopyIcon className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  )
}
