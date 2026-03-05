import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyReportAccessToken } from '@/utils/security/report-access'

type Props = {
  params: Promise<{ reportType: string }>
  searchParams: Promise<{ access?: string }>
}

type SubmissionRow = {
  id: string
  first_name: string | null
  last_name: string | null
  scores: Record<string, number>
  bands: Record<string, string>
  classification: { key?: string; label?: string } | null
  recommendations: string[] | null
  assessments?: { name?: string } | { name?: string }[] | null
}

const AXIS_ORDER = ['openness', 'capability', 'riskPosture'] as const

function formatAxisLabel(key: string) {
  if (key === 'openness') return 'Openness'
  if (key === 'capability') return 'Capability'
  if (key === 'riskPosture') return 'Risk posture'
  return key
}

export default async function AssessmentReportPage({ params, searchParams }: Props) {
  const { reportType } = await params
  const { access } = await searchParams

  if (reportType !== 'assessment') {
    return (
      <section className="assess-card">
        <p className="assess-kicker">Report</p>
        <h1 className="assess-title">Invalid report</h1>
        <p className="assess-subtitle">This report type is not supported.</p>
      </section>
    )
  }

  const payload = access ? verifyReportAccessToken(access, 'assessment') : null
  if (!payload) {
    return (
      <section className="assess-card">
        <p className="assess-kicker">Report access</p>
        <h1 className="assess-title">Access expired</h1>
        <p className="assess-subtitle">This report link is no longer valid.</p>
      </section>
    )
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return (
      <section className="assess-card">
        <p className="assess-kicker">Report</p>
        <h1 className="assess-title">Report unavailable</h1>
        <p className="assess-subtitle">Service configuration is missing.</p>
      </section>
    )
  }

  const { data, error } = await adminClient
    .from('assessment_submissions')
    .select('id, first_name, last_name, scores, bands, classification, recommendations, assessments(name)')
    .eq('id', payload.submissionId)
    .maybeSingle()

  if (error || !data) {
    return (
      <section className="assess-card">
        <p className="assess-kicker">Report</p>
        <h1 className="assess-title">Report unavailable</h1>
        <p className="assess-subtitle">We could not find this assessment report.</p>
      </section>
    )
  }

  const row = data as SubmissionRow
  const assessmentRel = row.assessments as unknown
  const assessment = (Array.isArray(assessmentRel) ? assessmentRel[0] : assessmentRel) as { name?: string } | null
  const profileName =
    row.first_name || row.last_name ? `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim() : 'Participant'
  const rawBandEntries = Object.entries(row.bands ?? {})
  const preferredEntries = AXIS_ORDER.reduce<Array<[string, string]>>((acc, key) => {
    const band = row.bands?.[key]
    if (typeof band === 'string') {
      acc.push([key, band])
    }
    return acc
  }, [])
  const bandEntries = preferredEntries.length === AXIS_ORDER.length ? preferredEntries : rawBandEntries

  return (
    <section className="assess-card">
      <p className="assess-kicker">Assessment report</p>
      <h1 className="assess-title">{profileName}</h1>
      <p className="assess-subtitle">{assessment?.name ?? 'Assessment result summary'}</p>

      {row.classification?.label ? (
        <div className="assess-report-callout">
          <p className="assess-kicker">Current profile</p>
          <p className="assess-report-profile">{row.classification.label}</p>
          <p className="assess-report-copy">
            This reflects how your current responses map against our readiness descriptors.
          </p>
        </div>
      ) : null}

      {bandEntries.length > 0 ? (
        <div className="assess-report-grid">
          {bandEntries.map(([key, band]) => (
            <div key={key} className="assess-report-item">
              <p className="assess-kicker">{formatAxisLabel(key)}</p>
              <p className="assess-report-band">{band}</p>
              <p className="assess-meta">Descriptor-based result for this capability area.</p>
            </div>
          ))}
        </div>
      ) : null}

      {Array.isArray(row.recommendations) && row.recommendations.length > 0 ? (
        <div className="assess-report-recommendations">
          <p className="assess-kicker">Recommendations</p>
          <ul className="assess-report-list">
            {row.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="assess-actions">
        <Link href="/" className="assess-primary-btn inline-flex items-center justify-center">
          Explore Leadership Quarter
        </Link>
        <button type="button" className="assess-secondary-btn" disabled>
          Download report (coming soon)
        </button>
      </div>
    </section>
  )
}
