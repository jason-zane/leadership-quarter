import type { Metadata } from 'next'
import { AssessmentBlockReportView } from '@/components/reports/assessment-block-report-view'
import { getSubmissionReportData } from '@/utils/services/assessment-submission-report'
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
    ? verifyReportAccessToken(access, 'assessment')
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

  const resolved = await getSubmissionReportData({
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
          <p className="assess-subtitle">We could not find this assessment report.</p>
        </section>
      </div>
    )
  }

  return (
    <div className="assess-report-route site-report-page">
      <div className="mx-auto max-w-5xl px-6 py-12 md:px-12">
        <AssessmentBlockReportView template={resolved.data.template} context={resolved.data.context} />
      </div>
    </div>
  )
}
