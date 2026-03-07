import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { requireDashboardUser } from '@/utils/dashboard-auth'
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
  const auth = await requireDashboardUser()
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
  const visibleNavCards = auth.authorized && auth.role !== 'admin'
    ? navCards.filter((card) => card.href !== '/dashboard/users')
    : navCards

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Admin backend"
        title="Overview"
        description="The fastest way into submissions, relationship data, and the systems that power assessments."
      />

      {loadError ? (
        <p className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load overview: {loadError}
        </p>
      ) : null}

      {stats.length > 0 && <DashboardKpiStrip items={stats.map(({ label, value }) => ({ label, value }))} />}

      <div className="grid gap-3 sm:grid-cols-2">
        {visibleNavCards.map((card) => (
          <FoundationSurface key={card.href} className="admin-overview-card">
            <Link href={card.href} className="admin-overview-card-link group">
              <div className="admin-overview-card-icon">
                <card.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h2 className="admin-overview-card-title">{card.label}</h2>
                <p className="admin-overview-card-copy">{card.description}</p>
                <p className="mt-4 text-sm font-semibold text-[var(--admin-accent)]">Open workspace</p>
              </div>
            </Link>
          </FoundationSurface>
        ))}
      </div>
    </DashboardPageShell>
  )
}
