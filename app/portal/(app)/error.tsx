'use client'

export default function PortalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="portal-page-shell">
      <div className="portal-status-panel portal-status-panel-danger">
        <p className="portal-status-title">Portal request failed</p>
        <p className="portal-status-body text-xs">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium dark:border-red-700"
      >
        Try again
      </button>
      </div>
    </div>
  )
}
