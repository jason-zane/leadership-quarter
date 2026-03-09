import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/utils/supabase/admin'
import { ActionFeedback } from '@/components/ui/action-feedback'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { PendingFieldReviewsCard } from './_components/pending-field-reviews-card'
import { RawPayloadCard } from './_components/raw-payload-card'
import { ReviewHistoryCard } from './_components/review-history-card'
import { SubmissionAnswersCard } from './_components/submission-answers-card'
import { SubmissionMetaCard } from './_components/submission-meta-card'
import { SubmissionTimelineCard } from './_components/submission-timeline-card'
import { SubmissionWorkflowCard } from './_components/submission-workflow-card'
import {
  errorMessages,
  feedbackMessages,
  loadSubmissionDetailData,
} from './_lib/submission-detail'

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const adminClient = createAdminClient()

  if (!adminClient) {
    return (
      <DashboardPageShell>
        <h1 className="mb-2 text-xl font-semibold text-zinc-900 dark:text-zinc-50">Submission</h1>
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Missing SUPABASE_SERVICE_ROLE_KEY in environment.
        </p>
      </DashboardPageShell>
    )
  }

  const { submission, submissionError, reviews, events, owners } = await loadSubmissionDetailData(adminClient, id)

  if (submissionError || !submission) {
    notFound()
  }

  const pendingReviews = reviews.filter((review) => review.decision === 'pending')
  const decidedReviews = reviews.filter((review) => review.decision !== 'pending')

  return (
    <DashboardPageShell>
      <Suspense>
        <ActionFeedback messages={feedbackMessages} errorMessages={errorMessages} />
      </Suspense>

      <nav className="backend-breadcrumb" aria-label="Breadcrumb">
        <Link href="/dashboard/submissions">Submissions</Link>
        <span>/</span>
        <span className="text-[var(--admin-text-primary)]">
          {submission.first_name} {submission.last_name}
        </span>
      </nav>

      <DashboardPageHeader
        eyebrow="CRM"
        title={`${submission.first_name} ${submission.last_name}`}
        description={`Submission workflow for ${submission.email}`}
        actions={
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-[var(--admin-accent-soft)] px-2 py-1 text-[var(--admin-accent-strong)]">
              {submission.form_key}
            </span>
            <span className="rounded-full bg-[var(--admin-accent-soft)] px-2 py-1 text-[var(--admin-accent-strong)]">
              Status: {submission.status}
            </span>
            <span className="rounded-full bg-[var(--admin-accent-soft)] px-2 py-1 text-[var(--admin-accent-strong)]">
              Review: {submission.review_status.replaceAll('_', ' ')}
            </span>
            <span className="rounded-full bg-[var(--admin-accent-soft)] px-2 py-1 text-[var(--admin-accent-strong)]">
              Priority: {submission.priority}
            </span>
          </div>
        }
      />

      <DashboardKpiStrip
        items={[
          { label: 'Pending reviews', value: pendingReviews.length },
          { label: 'Decided reviews', value: decidedReviews.length },
          { label: 'Timeline events', value: events.length },
          { label: 'Answer fields', value: Object.keys(submission.answers || {}).length },
        ]}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <SubmissionWorkflowCard submission={submission} owners={owners} />
          <SubmissionMetaCard submission={submission} />
        </div>

        <div className="space-y-5 lg:col-span-2">
          <SubmissionAnswersCard submission={submission} />
          <PendingFieldReviewsCard submission={submission} reviews={pendingReviews} />
          <ReviewHistoryCard reviews={decidedReviews} />
          <RawPayloadCard submission={submission} />
          <SubmissionTimelineCard events={events} />
        </div>
      </div>
    </DashboardPageShell>
  )
}
