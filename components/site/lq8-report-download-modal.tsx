'use client'

import { useEffect, useState } from 'react'
import { Lq8ReportDownloadForm } from '@/components/site/lq8-report-download-form'

export function Lq8ReportDownloadModal() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-8 py-3 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
      >
        Read the full LQ8 report
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-[rgba(10,17,26,0.45)] p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="site-card-strong relative max-h-[90vh] w-full max-w-3xl overflow-y-auto p-7 md:p-9"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Close report download modal"
              onClick={() => setOpen(false)}
              className="font-cta absolute right-4 top-4 rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-3 py-1.5 text-xs font-semibold tracking-[0.02em] text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-alt)]"
            >
              Close
            </button>

            <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Report access</p>
            <h3 className="site-heading-section max-w-3xl font-serif text-[clamp(1.8rem,4vw,3rem)] text-[var(--site-text-primary)]">
              Unlock the full LQ8 report
            </h3>
            <p className="mt-4 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              Share your details to access the full report on leadership quadrants, competencies, and practical application guidance.
            </p>

            <Lq8ReportDownloadForm />
          </div>
        </div>
      ) : null}
    </>
  )
}
