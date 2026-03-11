import Link from 'next/link'
import { AssessmentReportActions } from '@/components/reports/assessment-report-actions'
import { SubmissionReportSelector } from '@/components/reports/submission-report-selector'
import { createReportAccessToken } from '@/utils/security/report-access'
import { getSubmissionReportOptions } from '@/utils/services/submission-report-options'
import { createAdminClient } from '@/utils/supabase/admin'
import { ResponseAdminControls } from '../_components/response-admin-controls'

type Props = {
  params: Promise<{ id: string; submissionId: string }>
}

export default async function SurveyResponseDetailPage({ params }: Props) {
  const { id, submissionId } = await params
  const adminClient = createAdminClient()

  if (!adminClient) {
    return <p className="text-sm text-red-600">Supabase service role is not configured.</p>
  }

  const { data } = await adminClient
    .from('assessment_submissions')
    .select(
      'id, first_name, last_name, email, organisation, role, scores, bands, classification, recommendations, responses, excluded_from_analysis, excluded_from_analysis_at, excluded_from_analysis_reason, created_at'
    )
    .eq('assessment_id', id)
    .eq('id', submissionId)
    .maybeSingle()

  if (!data) {
    return <p className="text-sm text-red-600">Response not found.</p>
  }

  const classification = (data.classification as { label?: string } | null)?.label ?? 'Unknown'
  const bands = (data.bands as Record<string, string> | null) ?? {}
  const scores = (data.scores as Record<string, number> | null) ?? {}
  const recommendations = Array.isArray(data.recommendations) ? data.recommendations : []
  const responses = (data.responses as Record<string, number> | null) ?? {}
  const reportOptions = await getSubmissionReportOptions({
    adminClient,
    submissionId,
    expiresInSeconds: 7 * 24 * 60 * 60,
  })
  const fallbackReportAccessToken = createReportAccessToken({
    report: 'assessment',
    submissionId,
    expiresInSeconds: 7 * 24 * 60 * 60,
  })

  const { data: rcRows } = await adminClient
    .from('assessment_questions')
    .select('question_key, trait_question_mappings!inner(reverse_scored)')
    .eq('assessment_id', id)

  const reverseCodedKeys = new Set(
    (rcRows ?? [])
      .filter((q) => {
        const mapping = Array.isArray(q.trait_question_mappings)
          ? q.trait_question_mappings[0]
          : q.trait_question_mappings
        return (mapping as { reverse_scored?: boolean } | null)?.reverse_scored === true
      })
      .map((q) => q.question_key as string)
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{classification}</h1>
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/assessments/${id}/responses`} className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700">
            Back to responses
          </Link>
          {reportOptions.length === 0 && fallbackReportAccessToken ? (
            <AssessmentReportActions
              reportType="assessment"
              accessToken={fallbackReportAccessToken}
              canEmail={Boolean(data.email)}
              exportClassName="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
              printClassName="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
              emailClassName="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
              statusClassName="text-xs text-zinc-500"
            />
          ) : null}
        </div>
      </div>

      {reportOptions.length > 0 ? (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <SubmissionReportSelector
            options={reportOptions}
            canEmail={Boolean(data.email)}
            exportClassName="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            emailClassName="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            statusClassName="text-xs text-zinc-500"
          />
        </section>
      ) : null}

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">Respondent</p>
        <p className="mt-1 text-lg font-medium">{[data.first_name, data.last_name].filter(Boolean).join(' ')}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{data.email}</p>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{data.organisation} • {data.role}</p>
      </section>

      <ResponseAdminControls
        assessmentId={id}
        submissionId={submissionId}
        excludedFromAnalysis={Boolean(data.excluded_from_analysis)}
        excludedFromAnalysisAt={(data.excluded_from_analysis_at as string | null) ?? null}
        excludedFromAnalysisReason={(data.excluded_from_analysis_reason as string | null) ?? null}
      />

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Scores</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {Object.keys(scores).map((key) => (
            <div key={key} className="rounded border border-zinc-200 p-3 dark:border-zinc-700">
              <p className="text-xs uppercase text-zinc-500">{key}</p>
              <p className="mt-1 text-xl font-semibold">{scores[key]}</p>
              <p className="text-xs text-zinc-500">{bands[key] ?? '-'}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Recommendations</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {recommendations.map((item) => (
            <li key={String(item)}>{String(item)}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-semibold">Raw responses</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="py-2">Question</th>
                <th className="py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(responses).map(([key, value]) => (
                <tr key={key} className="border-t border-zinc-200 dark:border-zinc-700">
                  <td className="py-2">
                    <span className="flex items-center gap-2">
                      {key}
                      {reverseCodedKeys.has(key) && (
                        <span
                          className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                          title="Reverse-coded item. The value shown is the raw response; scoring inverts this before computing totals."
                        >
                          RC
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {reportOptions.length === 0 && fallbackReportAccessToken ? (
        <Link
          href={`/assess/r/assessment?access=${encodeURIComponent(fallbackReportAccessToken)}`}
          className="inline-block rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
        >
          View current report
        </Link>
      ) : null}
    </div>
  )
}
