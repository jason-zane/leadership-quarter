'use client'

export default function PortalCampaignError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
      <p className="text-sm font-semibold">Campaign page failed</p>
      <p className="text-xs">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium dark:border-red-700"
      >
        Retry
      </button>
    </div>
  )
}
