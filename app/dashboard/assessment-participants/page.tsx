import Link from 'next/link'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { DashboardFilterBar } from '@/components/dashboard/ui/filter-bar'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { ParticipantRowActions } from './_components/participant-row-actions'
import { listAdminAssessmentParticipants } from '@/utils/services/admin-assessment-participants'
import { createAdminClient } from '@/utils/supabase/admin'

type Props = {
  searchParams: Promise<{
    q?: string
    assessmentId?: string
    campaignId?: string
  }>
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function identityBadge(input: 'contact' | 'email' | 'anonymous') {
  if (input === 'contact') {
    return 'bg-emerald-100 text-emerald-700'
  }
  if (input === 'email') {
    return 'bg-amber-100 text-amber-700'
  }
  return 'bg-slate-100 text-slate-700'
}

function identityLabel(input: 'contact' | 'email' | 'anonymous') {
  if (input === 'contact') return 'Linked contact'
  if (input === 'email') return 'Email matched'
  return 'Anonymous'
}

function statusBadge(input: 'active' | 'archived') {
  return input === 'archived' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
}

export default async function AssessmentParticipantsPage({ searchParams }: Props) {
  const query = await searchParams
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const result = await listAdminAssessmentParticipants({
    adminClient,
    filters: {
      q: query.q,
      assessmentId: query.assessmentId,
      campaignId: query.campaignId,
    },
  })

  if (!result.ok) {
    return <p className="text-sm text-red-600">Failed to load participant directory.</p>
  }

  const { rows, filters } = result.data
  const totalResponses = rows.reduce((sum, row) => sum + row.responseCount, 0)
  const linkedContacts = rows.filter((row) => row.contactId).length
  const pendingInvitations = rows.reduce((sum, row) => sum + row.pendingInvitations, 0)

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessments"
        title="Participants"
        description="Search assessment participants across campaigns and assessments, then open a centralized profile with response and report access."
      />

      <DashboardKpiStrip
        items={[
          { label: 'Participants', value: rows.length },
          { label: 'Responses', value: totalResponses },
          { label: 'Linked contacts', value: linkedContacts },
          { label: 'Pending invites', value: pendingInvitations },
        ]}
      />

      <DashboardFilterBar>
        <form method="get" className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_220px_220px_auto]">
          <input
            type="search"
            name="q"
            defaultValue={query.q ?? ''}
            placeholder="Search by participant, email, organisation, role, assessment, or campaign"
            className="w-full rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2 text-sm text-[var(--admin-text-primary)] shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[rgba(82,110,255,0.16)]"
          />
          <select
            name="assessmentId"
            defaultValue={query.assessmentId ?? ''}
            className="rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2 text-sm text-[var(--admin-text-primary)] outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[rgba(82,110,255,0.16)]"
          >
            <option value="">All assessments</option>
            {filters.assessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.name}
              </option>
            ))}
          </select>
          <select
            name="campaignId"
            defaultValue={query.campaignId ?? ''}
            className="rounded-full border border-[rgba(103,127,159,0.2)] bg-white px-4 py-2 text-sm text-[var(--admin-text-primary)] outline-none transition focus:border-[var(--admin-accent)] focus:ring-2 focus:ring-[rgba(82,110,255,0.16)]"
          >
            <option value="">All campaigns</option>
            {filters.campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="submit" className="foundation-btn foundation-btn-primary foundation-btn-md">
              Apply
            </button>
            <Link href="/dashboard/assessment-participants" className="foundation-btn foundation-btn-secondary foundation-btn-md">
              Reset
            </Link>
          </div>
        </form>

      </DashboardFilterBar>

      <DashboardDataTableShell>
        {rows.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[var(--admin-text-muted)]">
            No participants match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th className="px-4 py-3">Participant</th>
                  <th className="px-4 py-3">Responses</th>
                  <th className="px-4 py-3">Assessments</th>
                  <th className="px-4 py-3">Campaigns</th>
                  <th className="px-4 py-3">Last activity</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.participantKey}>
                    <td className="px-4 py-4">
                      <Link href={row.detailHref} className="block font-semibold text-[var(--admin-text-primary)] hover:underline">
                        {row.participantName}
                      </Link>
                      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                        {[
                          row.email ?? 'No email collected',
                          row.organisation,
                          row.role,
                        ].filter(Boolean).join(' · ')}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={['rounded-full px-2.5 py-1 text-[11px] font-medium', identityBadge(row.identitySource)].join(' ')}>
                          {identityLabel(row.identitySource)}
                        </span>
                        <span className={['rounded-full px-2.5 py-1 text-[11px] font-medium', statusBadge(row.status)].join(' ')}>
                          {row.status === 'archived' ? 'Archived' : 'Active'}
                        </span>
                        {row.identitySource === 'anonymous' ? (
                          <span className="text-[11px] text-[var(--admin-text-muted)]">
                            Details were not collected before submission.
                          </span>
                        ) : null}
                      </div>
                      {row.contactHref ? (
                        <Link href={row.contactHref} className="mt-2 inline-flex text-xs text-[var(--admin-accent)] hover:underline">
                          Open linked contact
                        </Link>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-[var(--admin-text-primary)]">
                      <div className="space-y-1">
                        <p>{row.responseCount} recorded</p>
                        <p className="text-xs text-[var(--admin-text-muted)]">{row.pendingInvitations} pending invitations</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[var(--admin-text-primary)]">
                      <div className="space-y-1">
                        <p>{row.assessmentsCompleted} completed</p>
                        <p className="text-xs text-[var(--admin-text-muted)]">{row.assessmentsTouched} touched</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-[var(--admin-text-primary)]">{row.campaignsInvolved}</td>
                    <td className="px-4 py-4 text-[var(--admin-text-muted)]">{formatDate(row.lastActivityAt)}</td>
                    <td className="px-4 py-4 text-right">
                      <ParticipantRowActions
                        participantName={row.participantName}
                        detailHref={row.detailHref}
                        contactHref={row.contactHref}
                        email={row.email}
                        participantRecordId={row.participantRecordId}
                        participantStatus={row.status}
                        latestSubmission={row.latestSubmission}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardDataTableShell>
    </DashboardPageShell>
  )
}
