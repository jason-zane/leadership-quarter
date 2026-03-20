'use client'

export default function AssessmentError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm font-medium text-destructive">Failed to load assessment</p>
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
