'use client'

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm font-medium text-destructive">Something went wrong</p>
      <p className="text-xs text-muted-foreground">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
      >
        Try again
      </button>
    </div>
  )
}
