import type { Metadata } from 'next'
import { AssessmentReportView } from '@/components/reports/assessment-report-view'
import { AiOrientationSurveyReportContent } from '@/components/reports/report-pages/ai-orientation-survey-report-content'
import { mapAssessmentToAiOrientationSurveyReport } from '@/utils/reports/ai-orientation-report'
import { getAssessmentReportData } from '@/utils/reports/assessment-report'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyReportAccessToken } from '@/utils/security/report-access'

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

  if (reportType !== 'assessment') {
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

  const payload = access ? verifyReportAccessToken(access, 'assessment') : null
  if (!payload) {
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
  const accessToken = access || ''

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

  const report = await getAssessmentReportData(adminClient, payload.submissionId)
  if (!report) {
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

  const aiOrientationReport = mapAssessmentToAiOrientationSurveyReport(report)
  if (aiOrientationReport) {
    return (
      <div className="site-report-page site-framework-report mx-auto max-w-5xl px-6 py-12 text-[var(--site-text-primary)] md:px-12">
        <AiOrientationSurveyReportContent
          report={aiOrientationReport}
          showActions
          accessToken={accessToken}
          exportReportType="assessment"
        />
      </div>
    )
  }

  return (
    <div className="assess-report-route site-report-page">
      <AssessmentReportView report={report} accessToken={accessToken} includeActions />
    </div>
  )
}
