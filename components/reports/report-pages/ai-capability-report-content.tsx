import { ReportPdfExportButton } from '@/components/reports/report-pdf-export-button'
import { ReportPrintButton } from '@/components/reports/report-print-button'
import { TransitionLink } from '@/components/site/transition-link'
import {
  aiCapabilityCompetencyChapters,
  aiCapabilityDeploymentLevels,
  aiCapabilityInterdependencePatterns,
  aiCapabilityStructuralModel,
} from '@/utils/reports/ai-capability-model-content'

type Props = {
  showActions?: boolean
  accessToken?: string | null
}

export function AiCapabilityReportContent({ showActions = false, accessToken = null }: Props) {
  return (
    <article data-document-ready="true" data-report-ready="true">
      <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
        Leadership Quarter white paper
      </p>
      <h1 className="mt-3 font-serif text-[clamp(2.5rem,5.2vw,4.6rem)] leading-[1.02]">The AI Capability Model</h1>
      <p className="mt-4 text-lg leading-relaxed text-[var(--site-accent-strong)]">
        A Human-Centred Framework for Performance in an AI-Enabled Environment
      </p>
      <p className="mt-6 max-w-4xl text-xl leading-relaxed text-[var(--site-text-primary)]">
        Artificial intelligence does not create performance. Human capability does.
      </p>
      <p className="mt-5 max-w-4xl leading-relaxed text-[var(--site-text-body)]">
        As AI tools become embedded in professional workflows, the differentiator between
        organisations will not be access to technology, but the capability of individuals to deploy
        it effectively, responsibly, and consistently.
      </p>

      {showActions ? (
        <div className="site-report-actions mt-8 flex flex-wrap gap-3">
          <TransitionLink
            href="/framework/lq-ai-readiness"
            className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)]"
          >
            Back to framework
          </TransitionLink>
          {accessToken ? (
            <ReportPdfExportButton
              reportType="ai"
              accessToken={accessToken}
              className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-alt)]"
              statusClassName="basis-full text-sm text-[var(--site-text-muted)]"
            />
          ) : null}
          <ReportPrintButton className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]" />
        </div>
      ) : null}

      <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="site-card-primary p-5">
          <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Framework scope</p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">4 core competencies</p>
        </div>
        <div className="site-card-tint p-5">
          <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Assessment signal</p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">Behavioural, observable, measurable</p>
        </div>
        <div className="site-card-primary p-5">
          <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Deployment levels</p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">Individual, team, leadership</p>
        </div>
      </section>

      <section className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
        <h2 className="font-serif text-4xl leading-[1.06]">Why this model matters now</h2>
        <p className="mt-4 max-w-4xl leading-relaxed text-[var(--site-text-body)]">
          AI adoption is no longer constrained by tool access. The limiting factor is human
          capability: judgement under uncertainty, disciplined workflow integration, and the ability
          to generate measurable outcomes without increasing risk.
        </p>
      </section>

      {aiCapabilityCompetencyChapters.map((chapter, index) => (
        <section key={chapter.title} className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
          <div className="site-card-strong p-7 md:p-8">
            <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
              {chapter.label}
            </p>
            <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3.2rem)] leading-[1.06]">{chapter.title}</h2>

            <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className={index % 2 === 0 ? 'site-card-primary p-6' : 'site-card-tint p-6'}>
                <h3 className="font-cta text-sm uppercase tracking-[0.06em] text-[var(--site-text-primary)]">Definition</h3>
                <p className="mt-3 leading-relaxed text-[var(--site-text-body)]">{chapter.definition}</p>

                <h3 className="mt-6 font-cta text-sm uppercase tracking-[0.06em] text-[var(--site-text-primary)]">
                  AI Contextualisation
                </h3>
                <p className="mt-3 leading-relaxed text-[var(--site-text-body)]">{chapter.contextualisation}</p>
              </div>

              <div className={index % 2 === 0 ? 'site-card-sub p-6' : 'site-card-primary p-6'}>
                <h3 className="font-cta text-sm uppercase tracking-[0.06em] text-[var(--site-text-primary)]">
                  Behavioural indicators
                </h3>
                <ul className="mt-3 space-y-2 text-[var(--site-text-body)]">
                  {chapter.behaviouralIndicators.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>

                <h3 className="mt-6 font-cta text-sm uppercase tracking-[0.06em] text-[var(--site-text-primary)]">
                  Risk if weak
                </h3>
                <p className="mt-3 leading-relaxed text-[var(--site-text-body)]">{chapter.riskIfWeak}</p>

                <h3 className="mt-6 font-cta text-sm uppercase tracking-[0.06em] text-[var(--site-text-primary)]">
                  Impact when strong
                </h3>
                <p className="mt-3 leading-relaxed text-[var(--site-text-body)]">{chapter.impactWhenStrong}</p>
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
        <h2 className="font-serif text-4xl leading-[1.06]">Structural integrity</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {aiCapabilityStructuralModel.map((item, index) => (
            <div key={item.title} className={index % 2 === 0 ? 'site-card-primary p-6' : 'site-card-tint p-6'}>
              <p className="font-serif text-2xl leading-[1.08]">{item.title}</p>
              <p className="mt-3 leading-relaxed text-[var(--site-text-body)]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
        <h2 className="font-serif text-4xl leading-[1.06]">What breaks when one dimension is missing</h2>
        <ul className="mt-6 space-y-3 text-[var(--site-text-body)]">
          {aiCapabilityInterdependencePatterns.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
        <h2 className="font-serif text-4xl leading-[1.06]">Deployment levels</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {aiCapabilityDeploymentLevels.map((level, index) => (
            <div key={level.title} className={index % 2 === 0 ? 'site-card-primary p-6' : 'site-card-tint p-6'}>
              <p className="font-serif text-2xl leading-[1.08]">{level.title}</p>
              <p className="mt-3 leading-relaxed text-[var(--site-text-body)]">{level.body}</p>
            </div>
          ))}
        </div>
      </section>
    </article>
  )
}
