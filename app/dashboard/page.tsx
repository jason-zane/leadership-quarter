import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { InboxIcon, UsersIcon, EnvelopeIcon, KeyIcon } from '@/components/icons'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { FoundationSurface } from '@/components/ui/foundation/surface'

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
    <DashboardPageShell>
      <DashboardPageHeader
        title="Overview"
        description="Leadership Quarter admin backend."
      />

      {loadError ? (
        <p className="mb-6 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Could not load overview: {loadError}
        </p>
      ) : null}

      {/* Stat strip */}
      {stats.length > 0 && <DashboardKpiStrip items={stats.map(({ label, value }) => ({ label, value }))} />}

      {/* Nav cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {navCards.map((card) => (
          <FoundationSurface key={card.href} className="p-5">
            <Link
              href={card.href}
              className="group flex items-start gap-3.5 transition-colors"
            >
              <div className="mt-0.5 rounded-lg border border-zinc-200 p-2 text-zinc-600 transition-colors group-hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400">
                <card.icon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{card.label}</h2>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{card.description}</p>
              </div>
            </Link>
          </FoundationSurface>
        ))}
      </div>
    </DashboardPageShell>
  )
}
