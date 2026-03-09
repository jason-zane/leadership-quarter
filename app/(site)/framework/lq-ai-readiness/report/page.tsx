import type { Metadata } from 'next'
import { AiCapabilityReportContent } from '@/components/reports/report-pages/ai-capability-report-content'
import { TransitionLink } from '@/components/site/transition-link'
import { verifyReportAccessToken } from '@/utils/security/report-access'

export const metadata: Metadata = {
  title: 'AI Capability Model Report',
  description:
    'Editorial white paper on the AI Capability Model for improving human performance in AI-enabled environments.',
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
        <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.12]">This report link has expired.</h1>
        <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
          Submit the form again from the framework page to generate a fresh report access link.
        </p>
        <TransitionLink
          href="/framework/lq-ai-readiness"
          className="font-cta mt-6 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)]"
        >
          Return to framework
        </TransitionLink>
      </div>
    </div>
  )
}

export default async function AiReadinessReportPage({ searchParams }: Props) {
  const { access } = await searchParams
  if (!access || !verifyReportAccessToken(access, 'ai')) {
    return <AccessDenied />
  }

  return (
    <div className="site-report-page site-framework-report mx-auto max-w-6xl px-6 pb-24 pt-44 text-[var(--site-text-primary)] md:px-12">
      <AiCapabilityReportContent showActions accessToken={access} />
    </div>
  )
}
