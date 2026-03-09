import { ReportPdfExportButton } from '@/components/reports/report-pdf-export-button'
import { ReportPrintButton } from '@/components/reports/report-print-button'
import { TransitionLink } from '@/components/site/transition-link'
import { lq8Applications, lq8Competencies, lq8Quadrants } from '@/utils/brand/lq8-content'

type Props = {
  showActions?: boolean
  accessToken?: string | null
}

export function Lq8ReportContent({ showActions = false, accessToken = null }: Props) {
  return (
    <article data-document-ready="true" data-report-ready="true">
      <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
        Leadership Quarter report
      </p>
      <h1 className="mt-3 font-serif text-[clamp(2.5rem,5.2vw,4.6rem)] leading-[1.02]">LQ8 Leadership</h1>
      <p className="mt-4 text-lg leading-relaxed text-[var(--site-accent-strong)]">
        Four quadrants. Eight competencies. One integrated leadership model.
      </p>
      <p className="mt-6 leading-relaxed text-[var(--site-text-body)]">
        LQ8 gives organisations a practical framework to assess leadership capability with better
        consistency across hiring, development, succession, and performance decisions.
      </p>

      {showActions ? (
        <div className="site-report-actions mt-8 flex flex-wrap gap-3">
          <TransitionLink
            href="/framework/lq8"
            className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)]"
          >
            Back to framework
          </TransitionLink>
          {accessToken ? (
            <ReportPdfExportButton
              reportType="lq8"
              accessToken={accessToken}
              className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-alt)]"
              statusClassName="basis-full text-sm text-[var(--site-text-muted)]"
            />
          ) : null}
          <ReportPrintButton className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]" />
        </div>
      ) : null}

      <section className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
        <h2 className="font-serif text-4xl leading-[1.06]">Quadrants</h2>
        <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {lq8Quadrants.map((quadrant) => (
            <div key={quadrant.id} className="site-card-sub p-5">
              <p className="font-serif text-2xl leading-[1.1]">{quadrant.name}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
        <h2 className="font-serif text-4xl leading-[1.06]">Competencies</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {lq8Competencies.map((competency) => (
            <div key={competency.id} className="site-card-primary p-5">
              <p className="font-serif text-2xl leading-[1.1]">{competency.name}</p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--site-text-body)]">{competency.definition}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
        <h2 className="font-serif text-4xl leading-[1.06]">Applications</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {lq8Applications.map((application) => (
            <div key={application.title} className="site-card-tint p-6">
              <p className="font-serif text-2xl leading-[1.1]">{application.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">{application.description}</p>
            </div>
          ))}
        </div>
      </section>
    </article>
  )
}
