import Link from 'next/link'
import { notFound } from 'next/navigation'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import { getAdminCampaignCandidateJourney } from '@/utils/services/admin-campaigns'
import { createAdminClient } from '@/utils/supabase/admin'

type Props = {
  params: Promise<{ id: string; candidateKey: string }>
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function CampaignCandidateDetailPage({ params }: Props) {
  const { id: campaignId, candidateKey } = await params
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const result = await getAdminCampaignCandidateJourney({
    adminClient,
    campaignId,
    candidateKey: decodeURIComponent(candidateKey),
  })

  if (!result.ok) {
    notFound()
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaign responses"
        title={result.data.candidate.participantName}
        description="Candidate journey across this campaign, including every assessment submission and transition step."
        actions={(
          <Link href={`/dashboard/campaigns/${campaignId}/responses`} className="foundation-btn foundation-btn-secondary foundation-btn-md">
            Back to responses
          </Link>
        )}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.85fr)]">
        <FoundationSurface className="space-y-4 p-6">
          <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Journey</h2>
          <div className="space-y-4">
            {result.data.journey.map((step, index) => (
              <div key={step.stepId} className="rounded-[1.5rem] border border-[rgba(103,127,159,0.14)] bg-white p-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">
                  Step {index + 1} · {step.stepType}
                </p>
                <h3 className="mt-2 text-base font-semibold text-[var(--admin-text-primary)]">{step.label}</h3>
                {step.stepType === 'screen' ? (
                  <p className="mt-2 text-sm text-[var(--admin-text-muted)]">{step.screenConfig.body_markdown}</p>
                ) : (
                  <div className="mt-3 space-y-2 text-sm text-[var(--admin-text-muted)]">
                    <p>Status: {step.status === 'completed' ? 'Completed' : 'Not started'}</p>
                    {step.submission ? (
                      <Link
                        href={`/dashboard/campaigns/${campaignId}/responses/submissions/${step.submission.id}`}
                        className="font-medium text-[var(--admin-accent)] hover:underline"
                      >
                        Open submission detail
                      </Link>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        </FoundationSurface>

        <div className="space-y-6">
          <FoundationSurface className="space-y-3 p-6">
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Candidate</h2>
            <p className="text-sm text-[var(--admin-text-muted)]">{result.data.candidate.email || '—'}</p>
            <p className="text-sm text-[var(--admin-text-muted)]">
              {[result.data.candidate.organisation, result.data.candidate.role].filter(Boolean).join(' · ') || '—'}
            </p>
            <p className="text-sm text-[var(--admin-text-muted)] capitalize">
              {result.data.candidate.status.replace('_', ' ')}
            </p>
          </FoundationSurface>

          <FoundationSurface className="space-y-3 p-6">
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Submissions</h2>
            <div className="space-y-3">
              {result.data.submissions.map((submission) => (
                <div key={submission.id} className="rounded-[1.25rem] border border-[rgba(103,127,159,0.14)] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--admin-text-primary)]">{submission.assessmentName}</p>
                      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{formatDate(submission.submittedAt)}</p>
                    </div>
                    <Link
                      href={`/dashboard/campaigns/${campaignId}/responses/submissions/${submission.id}`}
                      className="text-sm font-medium text-[var(--admin-accent)] hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </FoundationSurface>

        </div>
      </div>
    </DashboardPageShell>
  )
}
