import Link from 'next/link'
import { notFound } from 'next/navigation'
import { V2AdminResponseDetail, type V2AdminResponseDetailData } from '@/components/dashboard/responses/v2-admin-response-detail'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import {
  buildDemographicEntries,
  buildV2ResponseCompleteness,
  buildV2ItemResponses,
  listV2SubmissionReportOptions,
} from '@/utils/services/response-experience'
import { getAssessmentV2Runtime } from '@/utils/services/assessment-runtime-v2'
import { getV2SubmissionReport } from '@/utils/services/v2-submission-report'
import { createAdminClient } from '@/utils/supabase/admin'

type Props = {
  params: Promise<{ id: string; submissionId: string }>
  searchParams: Promise<{ tab?: string }>
}

type SubmissionRow = {
  id: string
  assessment_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
  demographics: Record<string, unknown> | null
  responses: Record<string, number> | null
  normalized_responses: Record<string, number> | null
  created_at: string
}

function toInitialTab(value: string | undefined) {
  if (value === 'traits' || value === 'responses' || value === 'reports') {
    return value
  }
  return 'overview'
}

function formatSubmittedLabel(value: string) {
  return `Submitted ${new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))}`
}

export default async function AssessmentV2ResponseDetailPage({ params, searchParams }: Props) {
  const { id, submissionId } = await params
  const query = await searchParams
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const [submissionResult, runtimeResult, reportResult] = await Promise.all([
    adminClient
      .from('assessment_submissions')
      .select(
        'id, assessment_id, first_name, last_name, email, organisation, role, demographics, responses, normalized_responses, created_at'
      )
      .eq('assessment_id', id)
      .eq('id', submissionId)
      .maybeSingle(),
    getAssessmentV2Runtime({
      adminClient,
      assessmentId: id,
    }),
    getV2SubmissionReport({
      adminClient,
      submissionId,
    }),
  ])

  if (!submissionResult.data || !runtimeResult.ok || !reportResult.ok) {
    notFound()
  }

  const submission = submissionResult.data as SubmissionRow
  const reportOptions = await listV2SubmissionReportOptions({
    adminClient,
    assessmentId: id,
    submissionId,
    expiresInSeconds: 7 * 24 * 60 * 60,
  })
  const completeness = buildV2ResponseCompleteness({
    questionBank: runtimeResult.data.definition.questionBank,
    rawResponses: submission.responses,
  })

  const detailData: V2AdminResponseDetailData = {
    participantName:
      [submission.first_name, submission.last_name].filter(Boolean).join(' ') || 'Participant',
    email: submission.email,
    contextLine: [submission.organisation, submission.role].filter(Boolean).join(' · ') || 'No organisation or role stored',
    submittedLabel: formatSubmittedLabel(submission.created_at),
    demographics: buildDemographicEntries(submission.demographics),
    completeness,
    traitScores: reportResult.data.context.v2Report.trait_scores.map((item) => ({
      key: item.key,
      label: item.label,
      groupLabel: null,
      value: item.value,
      band: null,
      meaning: null,
    })),
    itemResponses: buildV2ItemResponses({
      questionBank: runtimeResult.data.definition.questionBank,
      rawResponses: submission.responses,
      normalizedResponses: submission.normalized_responses,
    }),
    reportOptions,
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessment workspace"
        title={detailData.participantName}
        description="Submission detail focused on respondent context, completion, trait-level scoring, item-level metadata, and report access."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/dashboard/assessments-v2/${id}/responses`}
              className="foundation-btn foundation-btn-secondary foundation-btn-md"
            >
              Back to responses
            </Link>
          </div>
        )}
      />

      <V2AdminResponseDetail data={detailData} initialTab={toInitialTab(query.tab)} />
    </DashboardPageShell>
  )
}
