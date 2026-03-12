'use client'

import { useState } from 'react'
import type { ReportDocumentType } from '@/utils/reports/report-document-types'

type Props = {
  reportType: ReportDocumentType
  accessToken: string
  className?: string
  statusClassName?: string
  label?: string
  loadingLabel?: string
}

export function ReportPdfExportButton({
  reportType,
  accessToken,
  className = '',
  statusClassName,
  label = 'Generate PDF download',
  loadingLabel = 'Generating PDF...',
}: Props) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  function handleExport() {
    if (busy) return

    setBusy(true)
    setStatus(loadingLabel)

    const url = `/api/reports/${reportType}/pdf?access=${encodeURIComponent(accessToken)}`
    window.location.assign(url)

    // Reset after a short delay to allow navigation to start
    window.setTimeout(() => {
      setBusy(false)
      setStatus(null)
    }, 3000)
  }

  return (
    <>
      <button type="button" onClick={handleExport} disabled={busy} className={className}>
        {busy ? loadingLabel : label}
      </button>
      {status && statusClassName ? (
        <p aria-live="polite" className={statusClassName}>
          {status}
        </p>
      ) : null}
    </>
  )
}
