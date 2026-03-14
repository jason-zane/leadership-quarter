import type { Metadata } from 'next'
import { Lq8ReportContent } from '@/components/reports/report-pages/lq8-report-content'
import { TransitionLink } from '@/components/site/transition-link'
import { verifyReportAccessToken } from '@/utils/security/report-access'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'LQ8 Report',
  description:
    'Full LQ8 Leadership report with competency definitions and practical applications.',
  robots: {
    index: false,
    follow: false,
  },
}

type Props = {
  searchParams: Promise<{ access?: string }>
}

function AccessDenied() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-44 text-[var(--site-text-primary)] md:px-12">
      <div className="site-card-strong p-8 md:p-10">
        <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Report access</p>
        <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.12]">This report is not publicly available right now.</h1>
        <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
          If you want to talk through how LQ8 could apply in your context, get in touch and we can help.
        </p>
        <TransitionLink
          href="/work-with-us#inquiry-form"
          className="font-cta mt-6 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)]"
        >
          Learn more about this
        </TransitionLink>
      </div>
    </div>
  )
}

export default async function Lq8ReportPage({ searchParams }: Props) {
  const { access } = await searchParams
  if (!access || !verifyReportAccessToken(access, 'lq8')) {
    return <AccessDenied />
  }

  return (
    <div className="site-report-page site-framework-report mx-auto max-w-5xl px-6 pb-24 pt-44 text-[var(--site-text-primary)] md:px-12">
      <Lq8ReportContent showActions accessToken={access} />
    </div>
  )
}
