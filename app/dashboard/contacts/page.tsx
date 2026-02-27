import { Suspense } from 'react'
import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { CopyEmail } from '@/components/ui/copy-email'
import { RelativeTime } from '@/components/ui/relative-time'
import { ActionFeedback } from '@/components/ui/action-feedback'
import { ChevronRightIcon } from '@/components/icons'

type Contact = {
  id: string
  first_name: string
  last_name: string
  email: string
  source: string | null
  status: string
  created_at: string
  updated_at: string
}

type ContactEvent = {
  contact_id: string
  created_at: string
}

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const adminClient = createAdminClient()
  let contacts: Contact[] = []
  let eventsByContactId = new Map<string, string>()
  let statusOptions: string[] = []
  let sourceOptions: string[] = []
  let loadError: string | null = null

  const q =
    typeof params.q === 'string' ? params.q.trim().replaceAll(',', ' ').replaceAll('%', '') : ''
  const statusFilter = typeof params.status === 'string' ? params.status : 'all'
  const sourceFilter = typeof params.source === 'string' ? params.source : 'all'
  const hasFilters = q || statusFilter !== 'all' || sourceFilter !== 'all'

  if (!adminClient) {
    loadError = 'Missing SUPABASE_SERVICE_ROLE_KEY in environment.'
  } else {
    let contactQuery = adminClient
      .from('contacts')
      .select('id, first_name, last_name, email, source, status, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (statusFilter !== 'all') contactQuery = contactQuery.eq('status', statusFilter)
    if (sourceFilter !== 'all') contactQuery = contactQuery.eq('source', sourceFilter)
    if (q) {
      contactQuery = contactQuery.or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`
      )
    }

    const [
      { data: contactRows, error: contactsError },
      { data: eventRows, error: eventsError },
      { data: allContactsRows },
      { data: statusesRows },
    ] = await Promise.all([
      contactQuery,
      adminClient
        .from('contact_events')
        .select('contact_id, created_at')
        .order('created_at', { ascending: false })
        .limit(1000),
      adminClient.from('contacts').select('source'),
      adminClient.from('contact_statuses').select('key').order('sort_order', { ascending: true }),
    ])

    if (contactsError) {
      loadError = contactsError.message
    } else if (eventsError) {
      loadError = eventsError.message
    } else {
      contacts = (contactRows ?? []) as Contact[]
      const events = (eventRows ?? []) as ContactEvent[]
      eventsByContactId = new Map(
        events
          .filter((e) => e.contact_id)
          .map((e) => [e.contact_id, e.created_at])
      )
      statusOptions = ((statusesRows ?? []) as Array<{ key: string }>).map((r) => r.key)
      sourceOptions = Array.from(
        new Set(
          ((allContactsRows ?? []) as Array<{ source: string | null }>)
            .map((r) => r.source)
            .filter((v): v is string => Boolean(v))
        )
      ).sort((a, b) => a.localeCompare(b))
    }
  }

  return (
    <section>
      <Suspense>
        <ActionFeedback messages={{}} />
      </Suspense>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Contacts</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            CRM records linked from interest submissions.
          </p>
        </div>
        {contacts.length > 0 && (
          <span className="mt-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {contacts.length}{hasFilters ? ' shown' : ' total'}
          </span>
        )}
      </div>

      {/* Filter toolbar */}
      <form className="mb-5 flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search name or email…"
          className="h-9 min-w-48 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="h-9 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        >
          <option value="all">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <select
          name="source"
          defaultValue={sourceFilter}
          className="h-9 rounded-lg border border-zinc-300 px-3 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
        >
          <option value="all">All sources</option>
          {sourceOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
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
            href="/dashboard/contacts"
            className="h-9 flex items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Clear
          </Link>
        )}
      </form>

      {loadError ? (
        <p className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Could not load contacts: {loadError}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Contact
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Email
              </th>
              <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Status
              </th>
              <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:table-cell">
                Source
              </th>
              <th className="hidden px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 lg:table-cell">
                Last activity
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  {hasFilters ? 'No contacts match your filters.' : 'No contacts yet. They are created when submissions are linked.'}
                </td>
              </tr>
            ) : (
              contacts.map((contact) => {
                const fullName = `${contact.first_name} ${contact.last_name}`
                const lastActivity = eventsByContactId.get(contact.id) ?? contact.updated_at

                return (
                  <tr
                    key={contact.id}
                    className="group transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={fullName} />
                        <Link
                          href={`/dashboard/contacts/${contact.id}`}
                          className="font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-50 dark:hover:text-zinc-300"
                        >
                          {fullName}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CopyEmail email={contact.email} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={contact.status} />
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-500 capitalize dark:text-zinc-400 sm:table-cell">
                      {contact.source ?? '—'}
                    </td>
                    <td className="hidden px-4 py-3 text-zinc-500 dark:text-zinc-400 lg:table-cell">
                      <RelativeTime date={lastActivity} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/contacts/${contact.id}`}
                        className="text-zinc-400 transition-colors group-hover:text-zinc-700 dark:group-hover:text-zinc-300"
                        aria-label={`View ${fullName}`}
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </Link>
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
