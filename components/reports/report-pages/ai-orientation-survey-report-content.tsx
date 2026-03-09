import { AssessmentReportActions } from '@/components/reports/assessment-report-actions'
import { AssessmentReportHero } from '@/components/reports/assessment-report-hero'
import { TraitProfileChart } from '@/components/reports/trait-profile-chart'
import { TransitionLink } from '@/components/site/transition-link'
import { DEFAULT_REPORT_CONFIG } from '@/utils/assessments/experience-config'
import { getAssessmentReportSections } from '@/utils/reports/assessment-report-sections'
import type {
  AiOrientationSurveyReportData,
  ReportDocumentType,
} from '@/utils/reports/report-document-types'

type Props = {
  report: AiOrientationSurveyReportData
  showActions?: boolean
  accessToken?: string | null
  exportReportType?: ReportDocumentType
}

export function AiOrientationSurveyReportContent({
  report,
  showActions = false,
  accessToken = null,
  exportReportType = 'ai_survey',
}: Props) {
  const participantName = `${report.firstName} ${report.lastName}`.trim() || 'Participant'
  const sectionState = getAssessmentReportSections(report.reportConfig, report.sectionAvailability)
  const sections = Object.fromEntries(sectionState.map((section) => [section.id, section])) as Record<
    typeof sectionState[number]['id'],
    typeof sectionState[number]
  >
  const title = report.reportConfig.title.trim()
  const subtitle = report.reportConfig.subtitle.trim()
  const reportTitle =
    !title || title === DEFAULT_REPORT_CONFIG.title
      ? 'AI Readiness Orientation Survey'
      : title
  const reportSubtitle =
    subtitle || 'Your current profile across openness, risk posture, and capability, with practical next steps.'

  return (
    <article data-document-ready="true" data-report-ready="true">
      <AssessmentReportHero
        title={reportTitle}
        subtitle={reportSubtitle}
        participantName={participantName}
        recipientEmail={report.email}
        completedAt={report.completedAt}
      />

      {sections.overall_profile.visible ? (
        <section className="site-card-strong mt-8 p-6 md:p-8">
          <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
            Overall profile
          </p>
          <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] text-[var(--site-accent-strong)]">
            {report.classification}
          </h2>
          <p className="mt-4 max-w-4xl leading-relaxed text-[var(--site-text-body)]">
            {report.profileNarrative}
          </p>
        </section>
      ) : null}

      {sections.competency_cards.visible ? (
        <section className="mt-10">
          <div className="assessment-web-report-stack-sm">
            <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
              Competency cards
            </p>
            <h2 className="font-serif text-[clamp(1.45rem,2.5vw,2rem)] leading-[1] text-[var(--site-text-primary)]">
              The core readiness competencies measured in this survey
            </h2>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {report.competencies.map((competency, index) => (
              <div key={competency.key} className={`${index === 1 ? 'site-card-tint' : 'site-card-primary'} p-5`}>
                <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
                  {competency.label}
                </p>
                <p className="mt-3 font-serif text-2xl leading-[1.12] text-[var(--site-text-primary)]">
                  {competency.band}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {sections.narrative_insights.visible ? (
        <>
          {sections.percentile_benchmark.visible ? (
            <section className="mt-8 site-card-strong p-6 md:p-7">
              <TraitProfileChart traitScores={report.traitScores} />
            </section>
          ) : null}

          <section className="mt-8 site-card-primary p-6 md:p-7">
            <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
              Narrative insights
            </p>
            <div className="mt-4 space-y-4">
              {report.narrativeInsights.map((insight, index) => (
                <div
                  key={`${insight.title}-${index}`}
                  className="rounded-lg border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-4 py-4"
                >
                  <p className="mb-1 text-sm font-semibold text-[var(--site-text-primary)]">{insight.title}</p>
                  <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{insight.body}</p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : sections.percentile_benchmark.visible ? (
        <section className="mt-8 site-card-primary p-6 md:p-7">
          <TraitProfileChart traitScores={report.traitScores} />
        </section>
      ) : null}

      {sections.development_recommendations.visible ? (
        <section className="mt-8 site-card-strong p-6 md:p-7">
          <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
            Development recommendations
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[var(--site-text-body)]">
            {report.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {showActions && accessToken ? (
        <section className="assessment-web-report-card assessment-web-report-actions mt-8 site-card-primary px-5 py-5 md:px-6 md:py-6">
          <AssessmentReportActions
            reportType={exportReportType === 'assessment' ? 'assessment' : 'ai_survey'}
            accessToken={accessToken}
            canEmail={Boolean(report.email)}
            exportClassName="font-ui inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-5 py-3 text-sm font-semibold text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-alt)]"
            emailClassName="font-ui rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-5 py-3 text-sm font-semibold text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-alt)]"
            statusClassName="mt-2 text-sm text-[var(--site-text-muted)]"
          />
        </section>
      ) : null}

      <section className="mt-8 site-card-sub p-6 md:p-7">
        <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
          Next steps
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--site-text-body)]">
          If you want to translate this profile into practical team action, we can help you map priorities and design targeted readiness interventions.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <TransitionLink
            href="/work-with-us#inquiry-form"
            className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)]"
          >
            Dive deeper on AI readiness
          </TransitionLink>
          <TransitionLink
            href="/framework/lq-ai-readiness"
            className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)]"
          >
            Back to framework
          </TransitionLink>
        </div>
      </section>
    </article>
  )
}
