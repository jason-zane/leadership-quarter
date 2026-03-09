import {
  formatValue,
  sortAnswerEntries,
  type SubmissionRow,
} from '../_lib/submission-detail'

export function SubmissionAnswersCard({ submission }: { submission: SubmissionRow }) {
  const answerEntries = sortAnswerEntries(submission.answers || {})

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Submission answers
      </h2>
      {answerEntries.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No structured answers.</p>
      ) : (
        <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {answerEntries.map(([key, value]) => (
            <div
              key={key}
              className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40"
            >
              <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {key.replaceAll('_', ' ')}
              </dt>
              <dd className="mt-1 text-zinc-800 dark:text-zinc-100">{formatValue(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
