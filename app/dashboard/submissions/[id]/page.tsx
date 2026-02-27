import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import {
  assignSubmissionOwner,
  approveSubmissionFieldReview,
  markSubmissionFirstResponse,
  rejectSubmissionFieldReview,
  setSubmissionPriority,
  updateSubmissionStatus,
} from '@/app/dashboard/submissions/actions'
import { ActionFeedback } from '@/components/ui/action-feedback'
import { RelativeTime } from '@/components/ui/relative-time'

type SubmissionRow = {
  id: string
  first_name: string
  last_name: string
  email: string
  source: string | null
  status: string
  review_status: string
  form_key: string
  schema_version: number
  priority: string
  created_at: string
  updated_at: string
  first_response_at: string | null
  reviewed_at: string | null
  owner_user_id: string | null
  contact_id: string | null
  answers: Record<string, string | number | null>
  raw_payload: Record<string, string | number | null>
}

type SubmissionFieldReview = {
  id: string
  field_key: string
  proposed_value: string | number | null
  existing_value: string | number | null
  decision: string
  note: string | null
  created_at: string
  decided_at: string | null
}

type SubmissionEvent = {
  id: string
  event_type: string
  event_data: Record<string, string | number | boolean | null>
  created_at: string
}

type OwnerProfile = {
  user_id: string
  full_name: string | null
}

const feedbackMessages: Record<string, string> = {
  status: 'Status updated.',
  owner: 'Owner updated.',
  priority: 'Priority updated.',
  first_response: 'First response timestamp recorded.',
  review: 'Field review decision saved.',
  linked: 'Contact linked.',
}

const errorMessages: Record<string, string> = {
  review_update_failed: 'Could not save review decision.',
  owner_update_failed: 'Could not update owner.',
  priority_update_failed: 'Could not update priority.',
  first_response_failed: 'Could not record first response.',
  submission_status_failed: 'Could not update status.',
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return '—'
  }
  return String(value)
}

function sortAnswerEntries(answers: Record<string, string | number | null>) {
  return Object.entries(answers).sort(([a], [b]) => a.localeCompare(b))
}

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminClient = createAdminClient()

  if (!adminClient) {
    return (
      <section>
        <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Submission</h1>
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Missing SUPABASE_SERVICE_ROLE_KEY in environment.
        </p>
      </section>
    )
  }

  const [
    { data: submissionData, error: submissionError },
    { data: reviewsData, error: reviewsError },
    { data: eventsData, error: eventsError },
    { data: ownerData },
  ] = await Promise.all([
    adminClient
      .from('interest_submissions')
      .select(
        'id, first_name, last_name, email, source, status, review_status, form_key, schema_version, priority, created_at, updated_at, first_response_at, reviewed_at, owner_user_id, contact_id, answers, raw_payload'
      )
      .eq('id', id)
      .maybeSingle(),
    adminClient
      .from('submission_field_reviews')
      .select('id, field_key, proposed_value, existing_value, decision, note, created_at, decided_at')
      .eq('submission_id', id)
      .order('created_at', { ascending: true }),
    adminClient
      .from('submission_events')
      .select('id, event_type, event_data, created_at')
      .eq('submission_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
    adminClient.from('profiles').select('user_id, full_name').order('full_name', { ascending: true }),
  ])

  if (submissionError || !submissionData) {
    notFound()
  }

  const submission = submissionData as SubmissionRow
  const reviews = ((reviewsError ? [] : reviewsData) ?? []) as SubmissionFieldReview[]
  const events = ((eventsError ? [] : eventsData) ?? []) as SubmissionEvent[]
  const owners = (ownerData ?? []) as OwnerProfile[]

  const pendingReviews = reviews.filter((review) => review.decision === 'pending')
  const decidedReviews = reviews.filter((review) => review.decision !== 'pending')

  return (
    <section>
      <Suspense>
        <ActionFeedback messages={feedbackMessages} errorMessages={errorMessages} />
      </Suspense>

      <nav className="mb-4 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/dashboard/submissions" className="hover:text-zinc-900 dark:hover:text-zinc-200">
          Submissions
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-50">{submission.first_name} {submission.last_name}</span>
      </nav>

      <div className="mb-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {submission.first_name} {submission.last_name}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{submission.email}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            {submission.form_key}
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            Status: {submission.status}
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            Review: {submission.review_status.replaceAll('_', ' ')}
          </span>
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
            Priority: {submission.priority}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Workflow
            </h2>

            <form action={updateSubmissionStatus} className="mb-3 space-y-2">
              <input type="hidden" name="submission_id" value={submission.id} />
              <input type="hidden" name="contact_id" value={submission.contact_id ?? ''} />
              <input type="hidden" name="redirect_to" value={`/dashboard/submissions/${submission.id}`} />
              <select
                name="status"
                defaultValue={submission.status}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                {['new', 'reviewed', 'qualified', 'closed'].map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Save status
              </button>
            </form>

            <form action={assignSubmissionOwner} className="mb-3 space-y-2">
              <input type="hidden" name="submission_id" value={submission.id} />
              <input type="hidden" name="redirect_to" value={`/dashboard/submissions/${submission.id}`} />
              <select
                name="owner_user_id"
                defaultValue={submission.owner_user_id ?? ''}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="">Unassigned</option>
                {owners.map((owner) => (
                  <option key={owner.user_id} value={owner.user_id}>
                    {owner.full_name || owner.user_id}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="w-full rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                Assign owner
              </button>
            </form>

            <form action={setSubmissionPriority} className="mb-3 space-y-2">
              <input type="hidden" name="submission_id" value={submission.id} />
              <input type="hidden" name="redirect_to" value={`/dashboard/submissions/${submission.id}`} />
              <select
                name="priority"
                defaultValue={submission.priority}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <option value="low">low</option>
                <option value="normal">normal</option>
                <option value="high">high</option>
              </select>
              <button
                type="submit"
                className="w-full rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                Save priority
              </button>
            </form>

            <form action={markSubmissionFirstResponse}>
              <input type="hidden" name="submission_id" value={submission.id} />
              <input type="hidden" name="redirect_to" value={`/dashboard/submissions/${submission.id}`} />
              <button
                type="submit"
                className="w-full rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                Mark first response now
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Meta
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Source</dt>
                <dd className="text-right">{submission.source || '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Submitted</dt>
                <dd><RelativeTime date={submission.created_at} /></dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Updated</dt>
                <dd><RelativeTime date={submission.updated_at} /></dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">First response</dt>
                <dd>{submission.first_response_at ? <RelativeTime date={submission.first_response_at} /> : '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Reviewed</dt>
                <dd>{submission.reviewed_at ? <RelativeTime date={submission.reviewed_at} /> : '—'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500 dark:text-zinc-400">Contact</dt>
                <dd>
                  {submission.contact_id ? (
                    <Link href={`/dashboard/contacts/${submission.contact_id}`} className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50">
                      View contact
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Submission answers
            </h2>
            {sortAnswerEntries(submission.answers || {}).length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No structured answers.</p>
            ) : (
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {sortAnswerEntries(submission.answers || {}).map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <dt className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{key.replaceAll('_', ' ')}</dt>
                    <dd className="mt-1 text-zinc-800 dark:text-zinc-100">{formatValue(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Pending field reviews
            </h2>
            {pendingReviews.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No pending field reviews.</p>
            ) : (
              <div className="space-y-3">
                {pendingReviews.map((review) => (
                  <div key={review.id} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{review.field_key.replaceAll('_', ' ')}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Current: {formatValue(review.existing_value)}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Proposed: {formatValue(review.proposed_value)}</p>
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

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Review history
            </h2>
            {decidedReviews.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No completed review decisions yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {decidedReviews.map((review) => (
                  <li key={review.id} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40">
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

          <details className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Raw payload
            </summary>
            <pre className="mt-3 max-h-[24rem] overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-800/40 dark:text-zinc-200">
              {JSON.stringify(submission.raw_payload || {}, null, 2)}
            </pre>
          </details>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Timeline
            </h2>
            {events.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No events yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {events.map((event) => (
                  <li key={event.id} className="rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-zinc-800 dark:text-zinc-100">{event.event_type.replaceAll('_', ' ')}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        <RelativeTime date={event.created_at} />
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
