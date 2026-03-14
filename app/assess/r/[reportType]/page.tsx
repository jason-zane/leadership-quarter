import type { Metadata } from 'next'
import { AssessmentReportView } from '@/components/reports/assessment-report-view'
import { V2BlockReportView } from '@/components/reports/v2/v2-block-report-view'
import { AiOrientationSurveyReportContent } from '@/components/reports/report-pages/ai-orientation-survey-report-content'
import { assembleReportDocument } from '@/utils/reports/assemble-report-document'
import { getV2SubmissionReport } from '@/utils/services/v2-submission-report'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyReportAccessToken } from '@/utils/security/report-access'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Assessment Report',
  robots: {
    index: false,
    follow: false,
  },
}

type Props = {
  params: Promise<{ reportType: string }>
  searchParams: Promise<{ access?: string }>
}

export default async function AssessmentReportPage({ params, searchParams }: Props) {
  const { reportType } = await params
  const { access } = await searchParams

  if (reportType !== 'assessment' && reportType !== 'assessment-v2') {
    return (
      <div className="assess-container">
        <section className="assess-card">
          <p className="assess-kicker">Report</p>
          <h1 className="assess-title">Invalid report</h1>
          <p className="assess-subtitle">This report type is not supported.</p>
        </section>
      </div>
    )
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return (
      <div className="assess-container">
        <section className="assess-card">
          <p className="assess-kicker">Report</p>
          <h1 className="assess-title">Report unavailable</h1>
          <p className="assess-subtitle">Service configuration is missing.</p>
        </section>
      </div>
    )
  }

  const verifiedPayload = access
    ? verifyReportAccessToken(
        access,
        reportType === 'assessment-v2' ? 'assessment_v2' : 'assessment'
      )
    : null
  const submissionId = verifiedPayload?.submissionId ?? null

  if (!submissionId) {
    return (
      <div className="assess-container">
        <section className="assess-card">
          <p className="assess-kicker">Report access</p>
          <h1 className="assess-title">Access expired</h1>
          <p className="assess-subtitle">This report link is no longer valid.</p>
        </section>
      </div>
    )
  }

  const accessToken = access ?? ''

  if (reportType === 'assessment-v2') {
    const resolved = await getV2SubmissionReport({
      adminClient,
      submissionId,
      reportId: verifiedPayload?.reportVariantId,
    })

    if (!resolved.ok) {
      return (
        <div className="assess-container">
          <section className="assess-card">
            <p className="assess-kicker">Report</p>
            <h1 className="assess-title">Report unavailable</h1>
            <p className="assess-subtitle">We could not find this V2 assessment report.</p>
          </section>
        </div>
      )
    }

    return (
      <div className="site-report-page mx-auto max-w-5xl px-6 py-12 md:px-12">
        <V2BlockReportView template={resolved.data.template} context={resolved.data.context} />
      </div>
    )
  }

  const assembled = await assembleReportDocument({
    reportType: 'assessment',
    accessToken,
  })
  if (!assembled.ok) {
    return (
      <div className="assess-container">
        <section className="assess-card">
          <p className="assess-kicker">Report</p>
          <h1 className="assess-title">Report unavailable</h1>
          <p className="assess-subtitle">We could not find this assessment report.</p>
        </section>
      </div>
    )
  }

  if (assembled.data.kind === 'ai_survey') {
    return (
      <div className="site-report-page site-framework-report mx-auto max-w-5xl px-6 py-12 text-[var(--site-text-primary)] md:px-12">
        <AiOrientationSurveyReportContent
          report={assembled.data.report}
          showActions
          accessToken={accessToken}
          exportReportType="assessment"
        />
      </div>
    )
  }

  if (assembled.data.kind !== 'assessment') {
    return (
      <div className="assess-container">
        <section className="assess-card">
          <p className="assess-kicker">Report</p>
          <h1 className="assess-title">Report unavailable</h1>
          <p className="assess-subtitle">We could not render this report type from the requested access.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="assess-report-route site-report-page">
      <AssessmentReportView report={assembled.data.report} accessToken={accessToken} includeActions />
    </div>
  )
}
