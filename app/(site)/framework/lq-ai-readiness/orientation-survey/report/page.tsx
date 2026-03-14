import type { Metadata } from 'next'
import { AiOrientationSurveyReportContent } from '@/components/reports/report-pages/ai-orientation-survey-report-content'
import { TransitionLink } from '@/components/site/transition-link'
import { getAiOrientationSurveyReportData } from '@/utils/reports/ai-orientation-report'
import { verifyReportAccessToken } from '@/utils/security/report-access'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'AI Orientation Survey Report',
  description: 'Personal AI readiness results from the AI Orientation Survey.',
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
        <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
          Report access
        </p>
        <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.12]">This report link has expired.</h1>
        <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
          Return to the framework page to request a fresh report link.
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

function ReportUnavailable() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-24 pt-44 text-[var(--site-text-primary)] md:px-12">
      <div className="site-card-strong p-8 md:p-10">
        <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
          Report unavailable
        </p>
        <h1 className="mt-3 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.12]">We could not load this result.</h1>
        <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
          Some required report details are missing. Return to the framework page to request a fresh report link.
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

export default async function AiOrientationSurveyReportPage({ searchParams }: Props) {
  const { access } = await searchParams
  const accessPayload = access ? verifyReportAccessToken(access, 'ai_survey') : null

  if (!accessPayload) {
    return <AccessDenied />
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return <ReportUnavailable />
  }

  const report = await getAiOrientationSurveyReportData(adminClient, accessPayload.submissionId)
  if (!report) {
    return <ReportUnavailable />
  }

  return (
    <div className="site-report-page site-framework-report mx-auto max-w-5xl px-6 pb-24 pt-44 text-[var(--site-text-primary)] md:px-12">
      <AiOrientationSurveyReportContent report={report} showActions accessToken={access} />
    </div>
  )
}
