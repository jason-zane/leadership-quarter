'use client'

import type { AutoSaveStatus as AutoSaveStatusType } from '@/components/dashboard/hooks/use-auto-save'

type Props = {
  status: AutoSaveStatusType
  error: string | null
  savedAt: string | null
  onRetry?: () => void
  className?: string
}

export function AutoSaveStatus({ status, error, savedAt, onRetry, className = '' }: Props) {
  if (status === 'idle') return null

  return (
    <div className={`flex items-center gap-2 text-xs ${className}`}>
      {status === 'saving' ? (
        <>
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          <span className="text-[var(--admin-text-muted)]">Saving...</span>
        </>
      ) : null}

      {status === 'saved' ? (
        <>
          <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 8.5L6.5 12L13 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-emerald-600">Saved{savedAt ? ` at ${savedAt}` : ''}</span>
        </>
      ) : null}

      {status === 'error' ? (
        <>
          <svg className="h-3.5 w-3.5 text-rose-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5v4M8 11h.01" strokeLinecap="round" />
          </svg>
          <span className="text-rose-600">{error ?? 'Save failed'}</span>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="ml-1 font-medium text-rose-700 underline underline-offset-2 hover:text-rose-800"
            >
              Retry
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
