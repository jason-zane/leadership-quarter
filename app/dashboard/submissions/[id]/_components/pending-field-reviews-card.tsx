import {
  approveSubmissionFieldReview,
  rejectSubmissionFieldReview,
} from '@/app/dashboard/submissions/actions'
import {
  formatValue,
  type SubmissionFieldReview,
  type SubmissionRow,
} from '../_lib/submission-detail'

export function PendingFieldReviewsCard({
  submission,
  reviews,
}: {
  submission: SubmissionRow
  reviews: SubmissionFieldReview[]
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Pending field reviews
      </h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No pending field reviews.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                {review.field_key.replaceAll('_', ' ')}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Current: {formatValue(review.existing_value)}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Proposed: {formatValue(review.proposed_value)}
              </p>
              <div className="mt-3 flex gap-2">
                <form action={approveSubmissionFieldReview}>
                  <input type="hidden" name="review_id" value={review.id} />
                  <input type="hidden" name="submission_id" value={submission.id} />
                  <input type="hidden" name="redirect_to" value={`/dashboard/submissions/${submission.id}`} />
                  <button
                    type="submit"
                    className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white"
                  >
                    Approve
                  </button>
                </form>
                <form action={rejectSubmissionFieldReview}>
                  <input type="hidden" name="review_id" value={review.id} />
                  <input type="hidden" name="submission_id" value={submission.id} />
                  <input type="hidden" name="redirect_to" value={`/dashboard/submissions/${submission.id}`} />
                  <button
                    type="submit"
                    className="rounded-full border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
