import Link from 'next/link'
import { AssessmentReportActions } from '@/components/reports/assessment-report-actions'
import { AssessmentReportHero } from '@/components/reports/assessment-report-hero'
import { TraitProfileChart } from '@/components/reports/trait-profile-chart'
import { DEFAULT_REPORT_CONFIG } from '@/utils/assessments/experience-config'
import type { AssessmentReportData } from '@/utils/reports/assessment-report'
import {
  getAssessmentReportSectionAvailability,
  getAssessmentReportSections,
} from '@/utils/reports/assessment-report-sections'
import {
  getAssessmentReportParticipantName,
  getAssessmentReportRecipientEmail,
} from '@/utils/reports/assessment-report'

type Props = {
  report: AssessmentReportData
  accessToken?: string | null
  includeActions?: boolean
  documentMode?: boolean
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

function getReportTitle(report: AssessmentReportData) {
  const title = report.reportConfig.title.trim()
  if (!title || title === DEFAULT_REPORT_CONFIG.title) {
    return report.assessment.name
  }

  return title
}

function shouldShowAssessmentName(report: AssessmentReportData) {
  return getReportTitle(report).trim().toLowerCase() !== report.assessment.name.trim().toLowerCase()
}

function getVisibleInterpretations(report: AssessmentReportData) {
  if (!report.reportConfig.show_interpretation_text) {
    return []
  }

  return report.interpretations.filter((item) => {
    if (
      report.reportConfig.show_dimension_scores
      && item.ruleType === 'band_text'
      && item.targetType === 'trait'
    ) {
      return false
    }

    return true
  })
}

function buildDimensionScoreMap(traitScores: AssessmentReportData['traitScores']) {
  const rawMap = new Map<string, number[]>()
  const percentileMap = new Map<string, number[]>()

  for (const ts of traitScores) {
    if (!ts.dimensionCode) continue
    const rawList = rawMap.get(ts.dimensionCode) ?? []
    rawList.push(ts.rawScore)
    rawMap.set(ts.dimensionCode, rawList)
    if (ts.percentile !== null) {
      const pList = percentileMap.get(ts.dimensionCode) ?? []
      pList.push(ts.percentile)
      percentileMap.set(ts.dimensionCode, pList)
    }
  }

  const result = new Map<string, { avgRaw: number | null; avgPercentile: number | null }>()
  rawMap.forEach((vals, code) => {
    const avgRaw = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
    const pVals = percentileMap.get(code) ?? []
    const avgPercentile =
      pVals.length > 0 ? Math.round(pVals.reduce((s, v) => s + v, 0) / pVals.length) : null
    result.set(code, { avgRaw, avgPercentile })
  })
  return result
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
  documentMode = false,
}: Props) {
  const profileName = getAssessmentReportParticipantName(report)
  const recipientEmail = getAssessmentReportRecipientEmail(report)
  const reportTitle = getReportTitle(report)
  const reportIntro = getReportIntro(report)
  const dimensionScoreMap = buildDimensionScoreMap(report.traitScores)
  const scoringDisplayMode = report.reportConfig.scoring_display_mode
  const visibleInterpretations = getVisibleInterpretations(report)
  const sectionState = getAssessmentReportSections(
    report.reportConfig,
    getAssessmentReportSectionAvailability(report)
  )
  const sections = Object.fromEntries(sectionState.map((section) => [section.id, section])) as Record<
    typeof sectionState[number]['id'],
    typeof sectionState[number]
  >

  return (
    <article
      className={[
        'assessment-web-report',
        documentMode ? 'assessment-web-report-document' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-document-ready="true"
      data-report-ready="true"
    >
      <AssessmentReportHero
        title={reportTitle}
        subtitle={reportIntro}
        participantName={profileName}
        recipientEmail={recipientEmail}
        completedAt={report.participant.completedAt ?? report.participant.createdAt}
        secondaryTitle={shouldShowAssessmentName(report) ? report.assessment.name : null}
      />

      {sections.overall_profile.visible ? (
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

      {sections.competency_cards.visible ? (
        <section className="assessment-web-report-section">
          {documentMode ? (
            <>
              <div className="assessment-web-report-card assessment-web-report-stack site-card-strong px-5 py-5 md:px-6 md:py-6">
                <div className="assessment-web-report-stack-sm">
                  <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Competencies</p>
                  <h2 className="font-serif text-[clamp(1.45rem,2.5vw,2rem)] leading-[1] text-[var(--site-text-primary)]">
                    The competencies measured in this assessment
                  </h2>
                </div>
              </div>

              <div className="assessment-web-report-dimension-grid assessment-web-report-dimension-grid-document">
                {report.dimensions.map((dimension, index) => {
                  const cardClassName = index === 1 ? 'site-card-primary' : 'site-card-tint'
                  const scoreInfo = dimensionScoreMap.get(dimension.key)

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
                      {scoringDisplayMode === 'raw' && scoreInfo?.avgRaw !== null && scoreInfo?.avgRaw !== undefined ? (
                        <p className="text-xs text-[var(--site-text-muted)]">{scoreInfo.avgRaw.toFixed(1)} / 5</p>
                      ) : scoringDisplayMode !== 'raw' && scoreInfo?.avgPercentile !== null && scoreInfo?.avgPercentile !== undefined ? (
                        <p className="text-xs text-[var(--site-text-muted)]">{scoreInfo.avgPercentile}th percentile</p>
                      ) : null}
                      {dimension.description ? (
                        <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{dimension.description}</p>
                      ) : null}
                      {dimension.bandMeaning ? (
                        <p className="text-sm leading-relaxed text-[var(--site-text-primary)]">{dimension.bandMeaning}</p>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </>
          ) : (
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
                  const scoreInfo = dimensionScoreMap.get(dimension.key)

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
                      {scoringDisplayMode === 'raw' && scoreInfo?.avgRaw !== null && scoreInfo?.avgRaw !== undefined ? (
                        <p className="text-xs text-[var(--site-text-muted)]">{scoreInfo.avgRaw.toFixed(1)} / 5</p>
                      ) : scoringDisplayMode !== 'raw' && scoreInfo?.avgPercentile !== null && scoreInfo?.avgPercentile !== undefined ? (
                        <p className="text-xs text-[var(--site-text-muted)]">{scoreInfo.avgPercentile}th percentile</p>
                      ) : null}
                      {dimension.description ? (
                        <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{dimension.description}</p>
                      ) : null}
                      {dimension.bandMeaning ? (
                        <p className="text-sm leading-relaxed text-[var(--site-text-primary)]">{dimension.bandMeaning}</p>
                      ) : null}
                    </article>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      ) : null}

      {sections.percentile_benchmark.visible ? (
        <section className="assessment-web-report-section">
          <div className="assessment-web-report-card assessment-web-report-stack site-card-strong px-5 py-5 md:px-6 md:py-6">
            <TraitProfileChart traitScores={report.traitScores} />
          </div>
        </section>
      ) : null}

      {sections.narrative_insights.visible && visibleInterpretations.length > 0 ? (
        <section className="assessment-web-report-section">
          <div className="assessment-web-report-card assessment-web-report-stack site-card-primary px-5 py-5 md:px-6 md:py-6">
            <div className="assessment-web-report-stack-sm">
              <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Insights</p>
              <h2 className="font-serif text-[clamp(1.45rem,2.5vw,2rem)] leading-[1] text-[var(--site-text-primary)]">
                What your results mean
              </h2>
            </div>
            <div className="space-y-4">
              {visibleInterpretations.map((item, i) => {
                const isRiskFlag = item.ruleType === 'risk_flag'
                return (
                  <div
                    key={i}
                    className={[
                      'rounded-lg px-4 py-4',
                      isRiskFlag
                        ? 'border border-amber-300 bg-amber-50'
                        : 'border border-[var(--site-border)] bg-[var(--site-surface-elevated)]',
                    ].join(' ')}
                  >
                    {item.title ? (
                      <p className="mb-1 text-sm font-semibold text-[var(--site-text-primary)]">{item.title}</p>
                    ) : null}
                    <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{item.body}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      ) : null}

      {sections.development_recommendations.visible ? (
        <section className="assessment-web-report-section">
          <div className="assessment-web-report-card assessment-web-report-stack site-card-primary px-5 py-5 md:px-6 md:py-6">
            <div className="assessment-web-report-stack-sm">
              <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Development focus</p>
              <h2 className="font-serif text-[clamp(1.45rem,2.5vw,2rem)] leading-[1] text-[var(--site-text-primary)]">
                Suggested development priorities
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
        <section className="assessment-web-report-section">
          <div className="assessment-web-report-card assessment-web-report-actions site-card-primary px-5 py-5 md:px-6 md:py-6">
            <AssessmentReportActions
              accessToken={accessToken}
              reportType="assessment"
              canEmail={Boolean(recipientEmail)}
              pdfEnabled={report.reportConfig.pdf_enabled}
              exportClassName="font-ui inline-flex items-center justify-center rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-5 py-3 text-sm font-semibold text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-alt)]"
              emailClassName="font-ui rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-5 py-3 text-sm font-semibold text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-alt)]"
              statusClassName="mt-2 text-sm text-[var(--site-text-muted)]"
            />
          </div>
        </section>
      ) : null}

      {includeActions && accessToken ? (
        <section className="assessment-web-report-section">
          <div className="assessment-web-report-card assessment-web-report-stack site-card-tint px-5 py-5 md:px-6 md:py-6">
            <div className="assessment-web-report-stack-sm">
              <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Next steps</p>
              <h2 className="font-serif text-[clamp(1.45rem,2.5vw,2rem)] leading-[1] text-[var(--site-text-primary)]">
                Continue your development focus
              </h2>
            </div>

            <div>
              <Link
                href={report.reportConfig.next_steps_cta_href || '/'}
                className="font-cta inline-flex items-center justify-center rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-6 py-3 text-sm font-semibold tracking-[0.03em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
              >
                {report.reportConfig.next_steps_cta_label || 'Explore Leadership Quarter'}
              </Link>
            </div>
          </div>
        </section>
      ) : null}
    </article>
  )
}
