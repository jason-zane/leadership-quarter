import Link from 'next/link'
import { RelativeTime } from '@/components/ui/relative-time'
import type { SubmissionRow } from '../_lib/submission-detail'

export function SubmissionMetaCard({ submission }: { submission: SubmissionRow }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Meta
      </h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500 dark:text-zinc-400">Source</dt>
          <dd className="text-right">{submission.source || '-'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500 dark:text-zinc-400">Submitted</dt>
          <dd>
            <RelativeTime date={submission.created_at} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500 dark:text-zinc-400">Updated</dt>
          <dd>
            <RelativeTime date={submission.updated_at} />
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500 dark:text-zinc-400">First response</dt>
          <dd>
            {submission.first_response_at ? <RelativeTime date={submission.first_response_at} /> : '-'}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500 dark:text-zinc-400">Reviewed</dt>
          <dd>{submission.reviewed_at ? <RelativeTime date={submission.reviewed_at} /> : '-'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500 dark:text-zinc-400">Contact</dt>
          <dd>
            {submission.contact_id ? (
              <Link
                href={`/dashboard/contacts/${submission.contact_id}`}
                className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                View contact
              </Link>
            ) : (
              '-'
            )}
          </dd>
        </div>
      </dl>
    </div>
  )
}
