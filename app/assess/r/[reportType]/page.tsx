import type { Metadata } from 'next'
import { AssessmentReportView } from '@/components/reports/assessment-report-view'
import { AiOrientationSurveyReportContent } from '@/components/reports/report-pages/ai-orientation-survey-report-content'
import { assembleReportDocument } from '@/utils/reports/assemble-report-document'
import { createAdminClient } from '@/utils/supabase/admin'
import { createReportAccessToken, verifyReportAccessToken } from '@/utils/security/report-access'

export const metadata: Metadata = {
  title: 'Assessment Report',
  robots: {
    index: false,
    follow: false,
  },
}

type Props = {
  params: Promise<{ reportType: string }>
  searchParams: Promise<{ access?: string; token?: string }>
}

export default async function AssessmentReportPage({ params, searchParams }: Props) {
  const { reportType } = await params
  const { access, token } = await searchParams

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

  // Resolve submissionId from HMAC token or permanent UUID token
  let submissionId: string | null = null
  if (access) {
    const payload = verifyReportAccessToken(access, 'assessment')
    if (payload) submissionId = payload.submissionId
  }
  if (!submissionId && token) {
    const { data } = await adminClient
      .from('assessment_submissions')
      .select('id')
      .eq('report_token', token)
      .maybeSingle()
    if (data) submissionId = data.id
  }

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

  // Generate a fresh HMAC token for PDF export actions; may be null if secret not configured
  const accessToken = access || createReportAccessToken({
    report: 'assessment',
    submissionId,
    expiresInSeconds: 7 * 24 * 60 * 60,
  }) || ''

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
