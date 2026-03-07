'use client'

import { useState } from 'react'

type Props = {
  accessToken: string
  canEmail?: boolean
  downloadClassName: string
  emailClassName: string
  statusClassName?: string
}

export function AssessmentReportActions({
  accessToken,
  canEmail = true,
  downloadClassName,
  emailClassName,
  statusClassName,
}: Props) {
  const [status, setStatus] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function handleSendReport() {
    setSending(true)
    setStatus(null)

    try {
      const response = await fetch('/api/reports/assessment/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ access: accessToken }),
      })
      const body = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; error?: string } | null

      if (!response.ok || !body?.ok) {
        setStatus(body?.message ?? 'Could not queue the report email.')
        return
      }

      setStatus(body.message ?? 'Report email queued.')
    } catch {
      setStatus('Could not queue the report email.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <a href={`/api/reports/assessment/pdf?access=${encodeURIComponent(accessToken)}`} className={downloadClassName}>
        Download PDF
      </a>
      {canEmail ? (
        <button type="button" onClick={handleSendReport} disabled={sending} className={emailClassName}>
          {sending ? 'Sending...' : 'Send report to email'}
        </button>
      ) : null}
      {status ? <p className={statusClassName}>{status}</p> : null}
    </>
  )
}
