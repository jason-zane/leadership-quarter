import Link from 'next/link'
import { AssessmentReportActions } from '@/components/reports/assessment-report-actions'
import { LQMark } from '@/components/site/lq-mark'
import type { AssessmentReportData } from '@/utils/reports/assessment-report'
import {
  getAssessmentReportParticipantName,
  getAssessmentReportRecipientEmail,
} from '@/utils/reports/assessment-report'

type Props = {
  report: AssessmentReportData
  accessToken?: string | null
  includeActions?: boolean
  renderMode?: 'web' | 'pdf'
}

function formatReportDate(value: string | null) {
  if (!value) return 'Recently completed'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Recently completed'

  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed)
}

function getReportIntro(report: AssessmentReportData) {
  const subtitle = report.reportConfig.subtitle.trim()
  if (subtitle) {
    return subtitle
  }

  return 'Your current profile and the key areas to focus on next.'
}

function getClassificationCopy(report: AssessmentReportData) {
  if (report.classification.description?.trim()) {
    return report.classification.description.trim()
  }

  return 'This reflects how your responses currently map against the assessment descriptors.'
}

function BandScaleIndicator({ bandIndex, bandCount }: { bandIndex: number; bandCount: number }) {
  const count = Math.max(1, bandCount)
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={
            i === bandIndex
              ? 'h-2 w-2 rounded-full bg-[var(--site-accent-strong)]'
              : 'h-2 w-2 rounded-full border border-[var(--site-accent-strong)] opacity-30'
          }
        />
      ))}
    </div>
  )
}

export function AssessmentReportView({
  report,
  accessToken = null,
  includeActions = false,
  renderMode = 'web',
}: Props) {
  const profileName = getAssessmentReportParticipantName(report)
  const recipientEmail = getAssessmentReportRecipientEmail(report)
  const completedDate = formatReportDate(report.participant.completedAt ?? report.participant.createdAt)
  const reportIntro = getReportIntro(report)
  const rootClassName = ['assessment-web-report', renderMode === 'pdf' ? 'assessment-web-report-pdf' : null]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={rootClassName} data-report-ready="true">
      <section className="assessment-web-report-hero site-card-strong overflow-hidden px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="inline-flex items-center gap-3 text-[var(--site-text-primary)]">
            <LQMark className="shrink-0" />
            <div>
              <p className="font-serif text-[1.5rem] leading-none tracking-[-0.02em] md:text-[1.7rem]">Leadership Quarter</p>
              <p className="font-eyebrow mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--site-text-muted)]">
                Assessment Report
              </p>
            </div>
          </div>
          <span className="assessment-web-report-badge font-eyebrow">{completedDate}</span>
        </div>

        <div className="mt-6 max-w-3xl">
          <h1 className="site-heading-display max-w-4xl font-serif text-[clamp(1.8rem,4vw,2.8rem)] leading-[0.96] text-[var(--site-text-primary)]">
            {report.assessment.name}
          </h1>
          <p className="mt-3 font-semibold text-[var(--site-text-primary)]">{profileName}</p>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--site-text-body)]">{reportIntro}</p>
        </div>

        <div className="assessment-web-report-meta mt-6">
          <div className="assessment-web-report-meta-item">
            <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Participant</p>
            <p className="mt-1.5 text-sm font-semibold text-[var(--site-text-primary)]">{profileName}</p>
          </div>
          {recipientEmail ? (
            <div className="assessment-web-report-meta-item">
              <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Email</p>
              <p className="mt-1.5 text-sm font-semibold text-[var(--site-text-primary)]">{recipientEmail}</p>
            </div>
          ) : null}
        </div>
      </section>

      {report.reportConfig.show_overall_classification && report.classification.label ? (
        <section className="assessment-web-report-section">
          <div className="assessment-web-report-card assessment-web-report-stack site-card-primary px-5 py-7 md:px-6 md:py-9">
            <div className="border-t-2 border-[var(--site-accent-strong)] pt-5">
              <div className="assessment-web-report-stack">
                <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Your profile</p>
                <p className="font-serif text-[clamp(2.4rem,4.5vw,3.8rem)] leading-none text-[var(--site-text-primary)]">
                  {report.classification.label}
                </p>
                <p className="max-w-3xl text-base leading-relaxed text-[var(--site-text-body)]">
                  {getClassificationCopy(report)}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {report.dimensions.length > 0 ? (
        <section className="assessment-web-report-section">
          <div className="assessment-web-report-card assessment-web-report-stack site-card-strong px-5 py-5 md:px-6 md:py-6">
            <div className="assessment-web-report-stack-sm">
              <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Competencies</p>
              <h2 className="font-serif text-[clamp(1.45rem,2.5vw,2rem)] leading-[1] text-[var(--site-text-primary)]">
                The competencies measured in this assessment
              </h2>
            </div>

            <div className="assessment-web-report-dimension-grid">
              {report.dimensions.map((dimension, index) => {
                const cardClassName = index === 1 ? 'site-card-primary' : 'site-card-tint'

                return (
                  <article
                    key={dimension.key}
                    className={`assessment-web-report-card assessment-web-report-stack-sm ${cardClassName} px-5 py-5 md:px-6 md:py-6`}
                  >
                    <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">{dimension.label}</p>
                    <p className="font-serif text-[clamp(1.5rem,2.4vw,2rem)] leading-[1.02] text-[var(--site-text-primary)]">
                      {dimension.descriptor}
                    </p>
                    <BandScaleIndicator bandIndex={dimension.bandIndex} bandCount={dimension.bandCount} />
                    {dimension.meaning ? (
                      <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{dimension.meaning}</p>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {report.reportConfig.show_recommendations && report.recommendations.length > 0 ? (
        <section className="assessment-web-report-section">
          <div className="assessment-web-report-card assessment-web-report-stack site-card-primary px-5 py-5 md:px-6 md:py-6">
            <div className="assessment-web-report-stack-sm">
              <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Next steps</p>
              <h2 className="font-serif text-[clamp(1.45rem,2.5vw,2rem)] leading-[1] text-[var(--site-text-primary)]">
                Suggested next areas of focus
              </h2>
            </div>

            <ul className="space-y-4 leading-relaxed text-[var(--site-text-body)]">
              {report.recommendations.map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--site-accent-strong)]" />
                  <span className="text-[0.95rem]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {includeActions && accessToken ? (
        <section className="assessment-web-report-card assessment-web-report-actions site-card-tint px-5 py-5 md:px-6 md:py-6">
          <Link
            href={report.reportConfig.next_steps_cta_href || '/'}
            className="font-cta inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-6 py-3 text-sm font-semibold tracking-[0.03em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
          >
            {report.reportConfig.next_steps_cta_label || 'Explore Leadership Quarter'}
          </Link>
          <AssessmentReportActions
            accessToken={accessToken}
            canEmail={Boolean(recipientEmail)}
            downloadClassName="font-ui inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-5 py-3 text-sm font-semibold text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-alt)]"
            emailClassName="font-ui rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-5 py-3 text-sm font-semibold text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-alt)]"
            statusClassName="mt-2 text-sm text-[var(--site-text-muted)]"
          />
        </section>
      ) : null}
    </article>
  )
}
