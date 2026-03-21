import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { AssessmentResponsesWorkspace, type AssessmentResponseSummaryRow } from '../_components/assessment-responses-workspace'
import { getAssessmentRuntimeData } from '@/utils/services/assessment-runtime-service'
import { buildResponseCompleteness, getSubmissionTraitAverageMap } from '@/utils/services/response-experience'
import { createReportAccessToken } from '@/utils/security/report-access'
import { reportAccessTtlSeconds } from '@/utils/services/platform-settings-runtime'
import { createAdminClient } from '@/utils/supabase/admin'

type Props = {
  params: Promise<{ id: string }>
}

type SubmissionRow = {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  organisation: string | null
  role: string | null
  responses: Record<string, number> | null
  created_at: string
}

export default async function AssessmentResponsesPage({ params }: Props) {
  const { id } = await params
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const [runtimeResult, { data }, { data: reportRows }] = await Promise.all([
    getAssessmentRuntimeData({
      adminClient,
      assessmentId: id,
    }),
    adminClient
      .from('assessment_submissions')
      .select('id, first_name, last_name, email, organisation, role, responses, created_at')
      .eq('assessment_id', id)
      .order('created_at', { ascending: false }),
    adminClient
      .from('v2_assessment_reports')
      .select('id, report_kind, status, is_default, sort_order')
      .eq('assessment_id', id)
      .eq('report_kind', 'audience')
      .eq('status', 'published')
      .order('sort_order'),
  ])

  const traitAverageBySubmission = await getSubmissionTraitAverageMap(
    adminClient,
    ((data ?? []) as SubmissionRow[]).map((row) => row.id)
  )
  const defaultReportId = ((reportRows ?? []) as Array<{ id: string; is_default: boolean }>)
    .find((row) => row.is_default)?.id
    ?? ((reportRows ?? []) as Array<{ id: string }>)[0]?.id

  const rows: AssessmentResponseSummaryRow[] = ((data ?? []) as SubmissionRow[]).map((row) => {
    const completeness = runtimeResult.ok
      ? buildResponseCompleteness({
          questionBank: runtimeResult.data.definition.questionBank,
          rawResponses: row.responses,
        })
      : { answeredItems: 0, totalItems: 0, completionPercent: 0 }
    const accessToken = defaultReportId
      ? createReportAccessToken({
          report: 'assessment',
          submissionId: row.id,
          reportVariantId: defaultReportId,
          expiresInSeconds: reportAccessTtlSeconds(),
        })
      : null

    return {
      id: row.id,
      participantName: [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Participant',
      email: row.email ?? 'No email stored',
      contextLine: [row.organisation, row.role].filter(Boolean).join(' · ') || 'No organisation or role stored',
      averageTraitScore: traitAverageBySubmission.get(row.id) ?? null,
      answeredItems: completeness.answeredItems,
      totalItems: completeness.totalItems,
      completionPercent: completeness.completionPercent,
      submittedAt: row.created_at,
      detailHref: `/dashboard/assessments/${id}/responses/${encodeURIComponent(row.id)}`,
      reportsHref: `/dashboard/assessments/${id}/responses/${encodeURIComponent(row.id)}?tab=reports`,
      currentReportHref: accessToken
        ? `/assess/r/assessment?access=${encodeURIComponent(accessToken)}`
        : null,
    }
  })

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessment workspace"
        title="Responses"
        description="Search submissions, open response detail, and move into reports from one workspace."
      />

      <AssessmentResponsesWorkspace rows={rows} />
    </DashboardPageShell>
  )
}
