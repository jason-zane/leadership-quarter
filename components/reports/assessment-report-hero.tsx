import { LQMark } from '@/components/site/lq-mark'

type Props = {
  badgeLabel?: string
  title: string
  subtitle: string
  participantName: string
  recipientEmail?: string | null
  completedAt?: string | null
  secondaryTitle?: string | null
  orgLogoUrl?: string | null
  orgName?: string | null
  showLqAttribution?: boolean
  showDate?: boolean
  showParticipant?: boolean
  showEmail?: boolean
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
  orgLogoUrl = null,
  orgName = null,
  showLqAttribution = false,
  showDate = true,
  showParticipant = true,
  showEmail = true,
}: Props) {
  return (
    <section className="assessment-web-report-hero site-card-strong overflow-hidden px-5 py-8 md:px-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="text-[var(--site-text-primary)]">
          <div className="inline-flex items-center gap-3">
            {orgLogoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={orgLogoUrl}
                alt={orgName ?? 'Organisation'}
                className="max-h-10 max-w-[160px] object-contain"
              />
            ) : (
              <>
                <LQMark className="shrink-0" />
                <div>
                  <p className="font-serif text-[1.5rem] leading-none tracking-[-0.02em] md:text-[1.7rem]">
                    {orgName ?? 'Leadership Quarter'}
                  </p>
                  <p className="font-eyebrow mt-1.5 text-[10px] uppercase tracking-[0.12em] text-[var(--site-text-muted)]">
                    {badgeLabel}
                  </p>
                </div>
              </>
            )}
            {orgLogoUrl && (
              <p className="font-eyebrow text-[10px] uppercase tracking-[0.12em] text-[var(--site-text-muted)]">
                {badgeLabel}
              </p>
            )}
          </div>
          {showLqAttribution && (orgLogoUrl || orgName) ? (
            <p className="font-eyebrow mt-2 text-[10px] uppercase tracking-[0.12em] text-[var(--site-text-muted)]">
              Powered by Leadership Quarter
            </p>
          ) : null}
        </div>
        {showDate ? (
          <span className="assessment-web-report-badge font-eyebrow">{formatReportDate(completedAt)}</span>
        ) : null}
      </div>

      <div className="mt-6 max-w-3xl">
        <h1 className="site-heading-display max-w-4xl font-serif text-[clamp(1.8rem,4vw,2.8rem)] leading-[0.96] text-[var(--site-text-primary)]">
          {title}
        </h1>
        {secondaryTitle ? (
          <p className="mt-3.5 font-eyebrow text-[10px] uppercase tracking-[0.12em] text-[var(--site-text-muted)]">
            {secondaryTitle}
          </p>
        ) : null}
        {subtitle ? <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--site-text-body)]">{subtitle}</p> : null}
      </div>

      <div className="assessment-web-report-meta mt-6">
        {showParticipant ? (
          <div className="assessment-web-report-meta-item">
            <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Participant</p>
            <p className="mt-1.5 text-sm font-semibold text-[var(--site-text-primary)]">{participantName}</p>
          </div>
        ) : null}
        {showEmail && recipientEmail ? (
          <div className="assessment-web-report-meta-item">
            <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Email</p>
            <p className="mt-1.5 text-sm font-semibold text-[var(--site-text-primary)]">{recipientEmail}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
