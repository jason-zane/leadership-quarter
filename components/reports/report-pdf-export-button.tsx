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
  pollingIntervalMs?: number
  maxPollAttempts?: number
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function getQueuedStatusMessage(input: {
  jobStatus: 'pending' | 'processing'
  attempt: number
}) {
  if (input.jobStatus === 'pending') {
    if (input.attempt < 4) {
      return 'Queued PDF export. Waiting for an available worker...'
    }

    return 'Queued PDF export. Still waiting for an available worker...'
  }

  if (input.attempt < 8) {
    return 'Rendering PDF and preparing your download...'
  }

  return 'Still rendering PDF. Larger reports can take 20-60 seconds.'
}

export function ReportPdfExportButton({
  reportType,
  accessToken,
  className = '',
  statusClassName,
  label = 'Generate PDF download',
  loadingLabel = 'Generating PDF...',
  pollingIntervalMs = 1500,
  maxPollAttempts = 60,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const directDownloadUrl = `/api/reports/${reportType}/pdf?access=${encodeURIComponent(accessToken)}`

  function startDirectDownload(message: string) {
    setStatus(message)
    window.location.assign(directDownloadUrl)
  }

  async function handleExport() {
    if (busy) return

    setBusy(true)
    setStatus(loadingLabel)

    try {
      if (
        process.env.NODE_ENV !== 'production' ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1'
      ) {
        startDirectDownload('Starting direct PDF download...')
        return
      }

      const startResponse = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reportType, access: accessToken }),
      })
      const startBody = (await startResponse.json().catch(() => null)) as
        | { ok?: boolean; jobId?: string; error?: string; message?: string }
        | null

      if (!startResponse.ok || !startBody?.ok || !startBody.jobId) {
        if (startBody?.error === 'rate_limited' || startBody?.error === 'invalid_access') {
          setStatus(startBody?.message ?? 'Could not start PDF generation.')
          return
        }

        startDirectDownload(startBody?.message ?? 'Export queue unavailable. Starting direct PDF download...')
        return
      }

      setStatus('Queued PDF export. Waiting for an available worker...')

      for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
        await sleep(pollingIntervalMs)

        const statusResponse = await fetch(
          `/api/reports/export/${encodeURIComponent(startBody.jobId)}?reportType=${encodeURIComponent(reportType)}&access=${encodeURIComponent(accessToken)}`,
          { cache: 'no-store' }
        )
        const statusBody = (await statusResponse.json().catch(() => null)) as
          | {
              ok?: boolean
              error?: string
              status?: 'pending' | 'processing' | 'ready' | 'failed'
              signedUrl?: string
              lastError?: string | null
            }
          | null

        if (!statusResponse.ok || !statusBody?.ok) {
          if (statusBody?.error === 'rate_limited' || statusBody?.error === 'invalid_access') {
            setStatus('Could not complete PDF generation.')
            return
          }

          startDirectDownload('Export queue unavailable. Starting direct PDF download...')
          return
        }

        if (statusBody.status === 'ready' && statusBody.signedUrl) {
          setStatus('Opening PDF download...')
          window.location.assign(statusBody.signedUrl)
          return
        }

        if (statusBody.status === 'failed') {
          setStatus(statusBody.lastError?.trim() || 'Could not generate PDF.')
          return
        }

        if (statusBody.status === 'pending' || statusBody.status === 'processing') {
          setStatus(
            getQueuedStatusMessage({
              jobStatus: statusBody.status,
              attempt,
            })
          )
        }
      }

      startDirectDownload(
        'Export is taking longer than expected. Starting a direct PDF download...'
      )
    } catch {
      startDirectDownload('Could not reach the export queue. Starting direct PDF download...')
    } finally {
      setBusy(false)
    }
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
