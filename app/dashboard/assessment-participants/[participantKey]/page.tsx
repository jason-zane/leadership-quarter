import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AdminResponseDetail } from '@/components/dashboard/responses/v2-admin-response-detail'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import {
  getAdminAssessmentParticipantMetrics,
  getAdminAssessmentParticipantProfile,
  getAdminAssessmentParticipantSubmissionDetail,
} from '@/utils/services/admin-assessment-participants'
import { createAdminClient } from '@/utils/supabase/admin'

type Props = {
  params: Promise<{ participantKey: string }>
  searchParams: Promise<{ submission?: string }>
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function identityLabel(input: 'contact' | 'email' | 'anonymous') {
  if (input === 'contact') return 'Linked contact'
  if (input === 'email') return 'Email matched'
  return 'Anonymous'
}

function participantStatusLabel(input: 'active' | 'archived') {
  return input === 'archived' ? 'Archived' : 'Active'
}

export default async function AssessmentParticipantProfilePage({ params, searchParams }: Props) {
  const { participantKey } = await params
  const query = await searchParams
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const profileResult = await getAdminAssessmentParticipantProfile({
    adminClient,
    participantKey: decodeURIComponent(participantKey),
  })

  if (!profileResult.ok) {
    notFound()
  }

  const profile = profileResult.data
  const selectedSubmission =
    profile.submissions.find((submission) => submission.submissionId === query.submission)
    ?? profile.submissions[0]
    ?? null

  const [traitAverageBySubmission, selectedDetailResult] = await Promise.all([
    getAdminAssessmentParticipantMetrics({
      adminClient,
      submissionIds: profile.submissions.map((submission) => submission.submissionId),
    }),
    selectedSubmission
      ? getAdminAssessmentParticipantSubmissionDetail({
          adminClient,
          submissionId: selectedSubmission.submissionId,
          assessmentId: selectedSubmission.assessmentId,
        })
      : Promise.resolve(null),
  ])

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessments"
        title={profile.participantName}
        description="Centralized participant profile across assessments, campaigns, submissions, invitations, and report access."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/assessment-participants" className="foundation-btn foundation-btn-secondary foundation-btn-md">
              Back to participants
            </Link>
            {profile.contact ? (
              <Link href={profile.contact.href} className="foundation-btn foundation-btn-secondary foundation-btn-md">
                Open contact
              </Link>
            ) : null}
          </div>
        )}
      />

      <DashboardKpiStrip
        items={[
          { label: 'Responses', value: profile.counts.responses },
          { label: 'Completed assessments', value: profile.counts.completedAssessments },
          { label: 'Assessments touched', value: profile.counts.assessmentsTouched },
          { label: 'Campaigns', value: profile.counts.campaignsInvolved },
          { label: 'Pending invites', value: profile.counts.pendingInvitations },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <FoundationSurface className="space-y-4 p-6">
          <div>
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Participant identity</h2>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              {[
                profile.email ?? 'No email collected',
                profile.organisation,
                profile.role,
              ].filter(Boolean).join(' · ') || 'No identity metadata stored.'}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.1rem] border border-[rgba(103,127,159,0.14)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Last activity</p>
              <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{formatDate(profile.lastActivityAt)}</p>
            </div>
            <div className="rounded-[1.1rem] border border-[rgba(103,127,159,0.14)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Identity source</p>
              <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{identityLabel(profile.identitySource)}</p>
            </div>
            <div className="rounded-[1.1rem] border border-[rgba(103,127,159,0.14)] bg-white p-4">
              <p className="text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Participant status</p>
              <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{participantStatusLabel(profile.status)}</p>
            </div>
          </div>
        </FoundationSurface>

        <FoundationSurface className="space-y-4 p-6">
          <div>
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Linked contact</h2>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              {profile.contact
                ? 'CRM contact linkage is active for this participant.'
                : 'No CRM contact is currently linked. Email fallback is being used for aggregation.'}
            </p>
          </div>
          {profile.contact ? (
            <div className="rounded-[1.1rem] border border-[rgba(103,127,159,0.14)] bg-white p-4">
              <p className="font-semibold text-[var(--admin-text-primary)]">{profile.contact.name}</p>
              <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{profile.contact.email}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
                Status: {profile.contact.status.replaceAll('_', ' ')}
              </p>
              <Link href={profile.contact.href} className="mt-3 inline-flex text-sm text-[var(--admin-accent)] hover:underline">
                Open CRM contact
              </Link>
            </div>
          ) : (
            <div className="rounded-[1.1rem] border border-dashed border-[rgba(103,127,159,0.22)] px-4 py-5 text-sm text-[var(--admin-text-muted)]">
              This participant is still resolved without a direct contact record.
            </div>
          )}
        </FoundationSurface>
      </div>

      <FoundationSurface className="space-y-4 p-6">
        <div>
          <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Assessment history</h2>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
            Each row is a real submission. Report actions stay submission-based, even when the participant appears in multiple campaigns or assessments.
          </p>
        </div>

        {profile.submissions.length === 0 ? (
          <p className="text-sm text-[var(--admin-text-muted)]">No completed submissions are stored for this participant yet.</p>
        ) : (
          <DashboardDataTableShell>
            <div className="overflow-x-auto">
              <table className="admin-data-table">
                <thead>
                  <tr>
                    <th className="px-4 py-3">Assessment</th>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Trait avg</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.submissions.map((submission) => (
                    <tr key={submission.submissionId}>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-[var(--admin-text-primary)]">{submission.assessmentName}</p>
                        <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                          {[submission.organisation, submission.role].filter(Boolean).join(' · ') || submission.email || 'No email collected'}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-[var(--admin-text-muted)]">{submission.campaignName ?? 'Standalone assessment'}</td>
                      <td className="px-4 py-4 text-[var(--admin-text-primary)]">
                        {traitAverageBySubmission.get(submission.submissionId)?.toFixed(1) ?? '—'}
                      </td>
                      <td className="px-4 py-4 text-[var(--admin-text-muted)]">{formatDate(submission.submittedAt)}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/dashboard/assessment-participants/${encodeURIComponent(profile.participantKey)}?submission=${encodeURIComponent(submission.submissionId)}`}
                            className="foundation-btn foundation-btn-secondary foundation-btn-sm"
                          >
                            View here
                          </Link>
                          <Link href={submission.detailHref} className="foundation-btn foundation-btn-secondary foundation-btn-sm">
                            Open response
                          </Link>
                          <Link href={submission.reportsHref} className="foundation-btn foundation-btn-secondary foundation-btn-sm">
                            Reports
                          </Link>
                          {submission.currentReportHref ? (
                            <Link href={submission.currentReportHref} target="_blank" className="foundation-btn foundation-btn-secondary foundation-btn-sm">
                              Current report
                            </Link>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DashboardDataTableShell>
        )}
      </FoundationSurface>

      {profile.invitations.length > 0 ? (
        <FoundationSurface className="space-y-4 p-6">
          <div>
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Invitations</h2>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              Invitation history remains visible here even when there is no submission yet.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {profile.invitations.map((invitation) => (
              <div key={invitation.invitationId} className="rounded-[1.1rem] border border-[rgba(103,127,159,0.14)] bg-white p-4">
                <p className="font-semibold text-[var(--admin-text-primary)]">{invitation.assessmentName}</p>
                <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{invitation.campaignName ?? 'Standalone assessment'}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
                  Status: {(invitation.status ?? 'unknown').replaceAll('_', ' ')}
                </p>
                <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                  Created {formatDate(invitation.createdAt)}{invitation.completedAt ? ` · Completed ${formatDate(invitation.completedAt)}` : ''}
                </p>
              </div>
            ))}
          </div>
        </FoundationSurface>
      ) : null}

      {selectedSubmission && selectedDetailResult && selectedDetailResult.ok ? (
        <div className="space-y-4">
          <FoundationSurface className="p-6">
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">
              Response detail: {selectedSubmission.assessmentName}
            </h2>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              Inline detail for the selected submission, using the same review/report model as the assessment-level response workspace.
            </p>
          </FoundationSurface>
          <AdminResponseDetail data={selectedDetailResult.data.detailData} />
        </div>
      ) : null}
    </DashboardPageShell>
  )
}
