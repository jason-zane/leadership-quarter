import { RelativeTime } from '@/components/ui/relative-time'
import type { SubmissionFieldReview } from '../_lib/submission-detail'

export function ReviewHistoryCard({ reviews }: { reviews: SubmissionFieldReview[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Review history
      </h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No completed review decisions yet.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40"
            >
              <span className="font-medium">{review.field_key.replaceAll('_', ' ')}</span>
              <span className="mx-2 text-zinc-400">•</span>
              <span className="capitalize">{review.decision}</span>
              {review.decided_at && (
                <>
                  <span className="mx-2 text-zinc-400">•</span>
                  <RelativeTime date={review.decided_at} />
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
