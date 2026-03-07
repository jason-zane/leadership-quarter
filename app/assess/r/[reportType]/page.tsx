import { AssessmentReportView } from '@/components/reports/assessment-report-view'
import { getAssessmentReportData } from '@/utils/reports/assessment-report'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyReportAccessToken } from '@/utils/security/report-access'

type Props = {
  params: Promise<{ reportType: string }>
  searchParams: Promise<{ access?: string; render?: string }>
}

export default async function AssessmentReportPage({ params, searchParams }: Props) {
  const { reportType } = await params
  const { access, render } = await searchParams
  const renderMode = render === 'pdf' ? 'pdf' : 'web'

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

  return (
    <div className="assess-report-route" data-render-mode={renderMode}>
      <AssessmentReportView
        report={report}
        accessToken={accessToken}
        includeActions={renderMode === 'web'}
        renderMode={renderMode}
      />
    </div>
  )
}
