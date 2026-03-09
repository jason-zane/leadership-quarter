import { LQMark } from '@/components/site/lq-mark'

type Props = {
  badgeLabel?: string
  title: string
  subtitle: string
  participantName: string
  recipientEmail?: string | null
  completedAt?: string | null
  secondaryTitle?: string | null
}

function formatReportDate(value: string | null | undefined) {
  if (!value) return 'Recently completed'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Recently completed'

  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed)
}

export function AssessmentReportHero({
  badgeLabel = 'Assessment Report',
  title,
  subtitle,
  participantName,
  recipientEmail = null,
  completedAt = null,
  secondaryTitle = null,
}: Props) {
  return (
    <section className="assessment-web-report-hero site-card-strong overflow-hidden px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="inline-flex items-center gap-3 text-[var(--site-text-primary)]">
          <LQMark className="shrink-0" />
          <div>
            <p className="font-serif text-[1.5rem] leading-none tracking-[-0.02em] md:text-[1.7rem]">Leadership Quarter</p>
            <p className="font-eyebrow mt-1 text-[10px] uppercase tracking-[0.12em] text-[var(--site-text-muted)]">
              {badgeLabel}
            </p>
          </div>
        </div>
        <span className="assessment-web-report-badge font-eyebrow">{formatReportDate(completedAt)}</span>
      </div>

      <div className="mt-6 max-w-3xl">
        <h1 className="site-heading-display max-w-4xl font-serif text-[clamp(1.8rem,4vw,2.8rem)] leading-[0.96] text-[var(--site-text-primary)]">
          {title}
        </h1>
        {secondaryTitle ? (
          <p className="mt-3 font-eyebrow text-[10px] uppercase tracking-[0.12em] text-[var(--site-text-muted)]">
            {secondaryTitle}
          </p>
        ) : null}
        <p className="mt-3 font-semibold text-[var(--site-text-primary)]">{participantName}</p>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--site-text-body)]">{subtitle}</p>
      </div>

      <div className="assessment-web-report-meta mt-6">
        <div className="assessment-web-report-meta-item">
          <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Participant</p>
          <p className="mt-1.5 text-sm font-semibold text-[var(--site-text-primary)]">{participantName}</p>
        </div>
        {recipientEmail ? (
          <div className="assessment-web-report-meta-item">
            <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Email</p>
            <p className="mt-1.5 text-sm font-semibold text-[var(--site-text-primary)]">{recipientEmail}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
