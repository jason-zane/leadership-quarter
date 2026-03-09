'use client'

import { useState } from 'react'
import { ReportPdfExportButton } from '@/components/reports/report-pdf-export-button'
import type { ReportDocumentType } from '@/utils/reports/report-document-types'

type Props = {
  reportType: Extract<ReportDocumentType, 'assessment' | 'ai_survey'>
  accessToken: string
  canEmail?: boolean
  pdfEnabled?: boolean
  exportClassName: string
  printClassName?: string
  emailClassName: string
  statusClassName?: string
}

export function AssessmentReportActions({
  reportType,
  accessToken,
  canEmail = true,
  pdfEnabled = true,
  exportClassName,
  emailClassName,
  statusClassName,
}: Props) {
  const [status, setStatus] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function handleSendReport() {
    setSending(true)
    setStatus(null)

    try {
      const response = await fetch(`/api/reports/${reportType}/email`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ access: accessToken }),
      })
      const body = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; error?: string } | null

      if (!response.ok || !body?.ok) {
        setStatus(body?.message ?? 'Could not queue the report link email.')
        return
      }

      setStatus(body.message ?? 'Report link email queued.')
    } catch {
      setStatus('Could not queue the report link email.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {pdfEnabled ? (
        <ReportPdfExportButton
          reportType={reportType}
          accessToken={accessToken}
          className={exportClassName}
          statusClassName={statusClassName}
        />
      ) : null}
      {canEmail ? (
        <button type="button" onClick={handleSendReport} disabled={sending} className={emailClassName}>
          {sending ? 'Sending...' : 'Send report link to email'}
        </button>
      ) : null}
      {status ? <p className={statusClassName}>{status}</p> : null}
    </>
  )
}
