import { Suspense } from 'react'
import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { CopyEmail } from '@/components/ui/copy-email'
import { RelativeTime } from '@/components/ui/relative-time'
import { ActionFeedback } from '@/components/ui/action-feedback'
import { SubmissionRowActions } from '@/components/dashboard/submissions/submission-row-actions'

type InterestSubmission = {
  id: string
  first_name: string
  last_name: string
  email: string
  source: string | null
  status: string
  review_status: string
  form_key: string
  priority: string
  created_at: string
  first_response_at: string | null
  contact_id: string | null
  owner_user_id: string | null
}

type OwnerProfile = {
  user_id: string
  full_name: string | null
}

const feedbackMessages: Record<string, string> = {
  linked: 'Contact created and linked.',
  status: 'Status updated.',
  owner: 'Owner updated.',
  priority: 'Priority updated.',
  first_response: 'First response timestamp recorded.',
  review: 'Review decision saved.',
}

const feedbackErrorMessages: Record<string, string> = {
  invalid_submission: 'Invalid submission payload.',
  missing_service_role: 'Missing service role key in environment.',
  owner_update_failed: 'Could not update submission owner.',
  priority_update_failed: 'Could not update submission priority.',
  first_response_failed: 'Could not record first response time.',
  review_update_failed: 'Could not save the review decision.',
}

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const adminClient = createAdminClient()

  const q =
    typeof params.q === 'string' ? params.q.trim().replaceAll(',', ' ').replaceAll('%', '') : ''
  const statusFilter = typeof params.status === 'string' ? params.status : 'all'
  const sourceFilter = typeof params.source === 'string' ? params.source : 'all'
  const formFilter = typeof params.form === 'string' ? params.form : 'all'
  const reviewFilter = typeof params.review === 'string' ? params.review : 'all'
  const ownerFilter = typeof params.owner === 'string' ? params.owner : 'all'
  const hasFilters =
    q ||
    statusFilter !== 'all' ||
    sourceFilter !== 'all' ||
    formFilter !== 'all' ||
    reviewFilter !== 'all' ||
    ownerFilter !== 'all'

  let submissions: InterestSubmission[] = []
  let sourceOptions: string[] = []
  let formOptions: string[] = []
  let loadError: string | null = null
  let totalCount = 0
  let pendingReviewCount = 0
  let linkedCount = 0
  let ownerProfiles: OwnerProfile[] = []

  const submissionStatuses = ['new', 'reviewed', 'qualified', 'closed']

  if (!adminClient) {
    loadError = 'Missing SUPABASE_SERVICE_ROLE_KEY in environment.'
  } else {
    let query = adminClient
      .from('interest_submissions')
      .select(
        'id, first_name, last_name, email, source, status, review_status, form_key, priority, created_at, first_response_at, contact_id, owner_user_id'
      )
      .order('created_at', { ascending: false })
      .limit(150)

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (sourceFilter !== 'all') query = query.eq('source', sourceFilter)
    if (formFilter !== 'all') query = query.eq('form_key', formFilter)
    if (reviewFilter !== 'all') query = query.eq('review_status', reviewFilter)
    if (ownerFilter === 'unassigned') query = query.is('owner_user_id', null)
    else if (ownerFilter !== 'all') query = query.eq('owner_user_id', ownerFilter)

    if (q) {
      query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
    }

    const [
      { data, error },
      { count: totalCountValue },
      { count: pendingReviewCountValue },
      { count: linkedCountValue },
      { data: allSourcesRows },
      { data: allFormRows },
      { data: ownerRows },
    ] = await Promise.all([
      query,
      adminClient.from('interest_submissions').select('*', { count: 'exact', head: true }),
      adminClient
        .from('interest_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('review_status', 'pending_review'),
      adminClient
        .from('interest_submissions')
        .select('*', { count: 'exact', head: true })
        .not('contact_id', 'is', null),
      adminClient.from('interest_submissions').select('source'),
      adminClient.from('interest_submissions').select('form_key'),
      adminClient.from('profiles').select('user_id, full_name').order('full_name', { ascending: true }),
    ])

    if (error) {
      loadError = error.message
    } else {
      submissions = (data ?? []) as InterestSubmission[]
      totalCount = totalCountValue ?? 0
      pendingReviewCount = pendingReviewCountValue ?? 0
      linkedCount = linkedCountValue ?? 0
      sourceOptions = Array.from(
        new Set(
          ((allSourcesRows ?? []) as Array<{ source: string | null }>)
            .map((r) => r.source)
            .filter((v): v is string => Boolean(v))
        )
      ).sort((a, b) => a.localeCompare(b))
      formOptions = Array.from(
        new Set(
          ((allFormRows ?? []) as Array<{ form_key: string | null }>)
            .map((r) => r.form_key)
            .filter((v): v is string => Boolean(v))
        )
      ).sort((a, b) => a.localeCompare(b))
      ownerProfiles = (ownerRows ?? []) as OwnerProfile[]
    }
  }

  const ownerById = new Map(ownerProfiles.map((owner) => [owner.user_id, owner.full_name || 'Unknown']))

  return (
    <section>
      <Suspense>
        <ActionFeedback messages={feedbackMessages} errorMessages={feedbackErrorMessages} />
      </Suspense>

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Submissions</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Multi-form intake records with review and CRM sync workflow.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-4">
        {[
          { label: 'Total', value: totalCount },
          { label: 'Pending review', value: pendingReviewCount },
          { label: 'Linked to contact', value: linkedCount },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex items-baseline gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
          </div>
        ))}
      </div>

      <form className="mb-5 grid gap-2 md:grid-cols-6">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name or email…"
          className="h-9 min-w-48 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400 md:col-span-2"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="h-9 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        >
          <option value="all">All status</option>
          {submissionStatuses.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="review"
          defaultValue={reviewFilter}
          className="h-9 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        >
          <option value="all">All review</option>
          <option value="pending_review">Pending review</option>
          <option value="approved">Approved</option>
          <option value="changes_requested">Changes requested</option>
        </select>
        <select
          name="owner"
          defaultValue={ownerFilter}
          className="h-9 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        >
          <option value="all">All owners</option>
          <option value="unassigned">Unassigned</option>
          {ownerProfiles.map((owner) => (
            <option key={owner.user_id} value={owner.user_id}>
              {owner.full_name || owner.user_id}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <select
            name="source"
            defaultValue={sourceFilter}
            className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
          >
            <option value="all">All sources</option>
            {sourceOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
              ))}
            </select>
          <select
            name="form"
            defaultValue={formFilter}
            className="h-9 min-w-0 flex-1 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
          >
            <option value="all">All forms</option>
            {formOptions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Apply
          </button>
          {hasFilters && (
            <Link
              href="/dashboard/submissions"
              className="h-9 flex items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {loadError ? (
        <p className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Could not load submissions: {loadError}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Submitted
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Person
              </th>
              <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:table-cell">
                Review
              </th>
              <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 md:table-cell">
                Priority
              </th>
              <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 lg:table-cell">
                Owner
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {submissions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  {hasFilters ? 'No submissions match your filters.' : 'No submissions yet.'}
                </td>
              </tr>
            ) : (
              submissions.map((sub) => {
                const fullName = `${sub.first_name} ${sub.last_name}`
                const ownerName = sub.owner_user_id ? ownerById.get(sub.owner_user_id) || 'Unknown' : 'Unassigned'

                return (
                  <tr key={sub.id} className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      <RelativeTime date={sub.created_at} />
                      {sub.first_response_at && (
                        <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                          Responded <RelativeTime date={sub.first_response_at} />
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={fullName} />
                        <div className="min-w-0">
                          <Link
                            href={`/dashboard/submissions/${sub.id}`}
                            className="font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
                          >
                            {fullName}
                          </Link>
                          <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                            <span className="uppercase">{sub.form_key}</span>
                            <span className="mx-1">•</span>
                            <StatusBadge status={sub.status} />
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <CopyEmail email={sub.email} />
                            {sub.contact_id && (
                              <Link
                                href={`/dashboard/contacts/${sub.contact_id}`}
                                className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                              >
                                View contact →
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          sub.review_status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : sub.review_status === 'changes_requested'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                        }`}
                      >
                        {sub.review_status.replaceAll('_', ' ')}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 capitalize text-zinc-600 dark:text-zinc-300 md:table-cell">
                      {sub.priority}
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-600 dark:text-zinc-300 lg:table-cell">
                      {ownerName}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <SubmissionRowActions
                        submissionId={sub.id}
                        currentStatus={sub.status}
                        contactId={sub.contact_id}
                        firstName={sub.first_name}
                        lastName={sub.last_name}
                        email={sub.email}
                        source={sub.source}
                      />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
