import type { SubmissionRow } from '../_lib/submission-detail'

export function RawPayloadCard({ submission }: { submission: SubmissionRow }) {
  return (
    <details className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Raw payload
      </summary>
      <pre className="mt-3 max-h-[24rem] overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-200">
        {JSON.stringify(submission.raw_payload || {}, null, 2)}
      </pre>
    </details>
  )
}
