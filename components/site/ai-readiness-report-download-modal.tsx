'use client'

import { useEffect, useState } from 'react'
import { AiReadinessReportDownloadForm } from '@/components/site/ai-readiness-report-download-form'

export function AiReadinessReportDownloadModal() {
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
        Download framework
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
              aria-label="Close framework download modal"
              onClick={() => setOpen(false)}
              className="font-cta absolute right-4 top-4 rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-3 py-1.5 text-xs font-semibold tracking-[0.02em] text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-alt)]"
            >
              Close
            </button>

            <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
              Download framework
            </p>
            <h3 className="site-heading-section max-w-3xl font-serif text-[clamp(1.8rem,4vw,3rem)] text-[var(--site-text-primary)]">
              Get the full AI Readiness & Enablement framework
            </h3>
            <p className="mt-4 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              The full framework includes detailed competency definitions, measurement methods,
              scoring maturity levels, and practical implementation guidance.
            </p>

            <AiReadinessReportDownloadForm />
          </div>
        </div>
      ) : null}
    </>
  )
}
