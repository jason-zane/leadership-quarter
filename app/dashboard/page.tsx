import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { InboxIcon, UsersIcon, EnvelopeIcon, KeyIcon } from '@/components/icons'

type StatCard = {
  label: string
  value: number | string
}

type NavCard = {
  href: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

export default async function DashboardOverviewPage() {
  const adminClient = createAdminClient()

  let stats: StatCard[] = []
  let loadError: string | null = null

  if (!adminClient) {
    loadError = 'Missing SUPABASE_SERVICE_ROLE_KEY in environment.'
  } else {
    const [
      { count: submissionsCount, error: submissionsError },
      { count: contactsCount, error: contactsError },
      { count: newSubmissionsCount },
      { data: usersResult },
    ] = await Promise.all([
      adminClient.from('interest_submissions').select('*', { count: 'exact', head: true }),
      adminClient.from('contacts').select('*', { count: 'exact', head: true }),
      adminClient
        .from('interest_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new'),
      adminClient.auth.admin.listUsers(),
    ])

    if (submissionsError || contactsError) {
      loadError = submissionsError?.message ?? contactsError?.message ?? 'Unknown error'
    } else {
      stats = [
        { label: 'Submissions', value: submissionsCount ?? 0 },
        { label: 'New', value: newSubmissionsCount ?? 0 },
        { label: 'Contacts', value: contactsCount ?? 0 },
        { label: 'Users', value: usersResult?.users?.length ?? 0 },
      ]
    }
  }

  const navCards: NavCard[] = [
    {
      href: '/dashboard/submissions',
      label: 'Submissions',
      description: 'Review and triage interest form submissions.',
      icon: InboxIcon,
    },
    {
      href: '/dashboard/contacts',
      label: 'Contacts',
      description: 'CRM records and relationship activity.',
      icon: UsersIcon,
    },
    {
      href: '/dashboard/emails',
      label: 'Email templates',
      description: 'Edit transactional message content.',
      icon: EnvelopeIcon,
    },
    {
      href: '/dashboard/users',
      label: 'Users',
      description: 'Manage admin backend access and roles.',
      icon: KeyIcon,
    },
  ]

  return (
    <section>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">Overview</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Miles Between admin backend.
        </p>
      </div>

      {loadError ? (
        <p className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Could not load overview: {loadError}
        </p>
      ) : null}

      {/* Stat strip */}
      {stats.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          {stats.map(({ label, value }) => (
            <div
              key={label}
              className="flex items-baseline gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              <span className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Nav cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {navCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="group flex items-start gap-3.5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
          >
            <div className="mt-0.5 rounded-lg border border-zinc-200 p-2 text-zinc-600 transition-colors group-hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400">
              <card.icon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{card.label}</h2>
              <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
