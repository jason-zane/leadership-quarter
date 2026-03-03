import type { Metadata } from 'next'
import { TransitionLink } from '@/components/site/transition-link'
import { createAdminClient } from '@/utils/supabase/admin'
import { verifyReportAccessToken } from '@/utils/security/report-access'

export const metadata: Metadata = {
  title: 'AI Capability Model Report',
  description:
    'Full AI Capability Model report for understanding, assessing, and improving human performance in AI-enabled environments.',
}

type Props = {
  searchParams: Promise<{ access?: string }>
}

const REPORT_BUCKET = process.env.AI_READINESS_REPORT_BUCKET?.trim() || 'reports'
const REPORT_PATH =
  process.env.AI_READINESS_REPORT_PATH?.trim() || 'ai/ai-readiness-enablement-framework.pdf'

async function getDownloadUrl() {
  const adminClient = createAdminClient()
  if (!adminClient) return null

  const { data, error } = await adminClient.storage.from(REPORT_BUCKET).createSignedUrl(REPORT_PATH, 60 * 10)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
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

  const downloadUrl = await getDownloadUrl()

  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-44 text-[var(--site-text-primary)] md:px-12">
      <article>
        <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Leadership Quarter report</p>
        <h1 className="mt-3 font-serif text-[clamp(2.5rem,5.2vw,4.6rem)] leading-[1.02]">
          The AI Capability Model
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--site-accent-strong)]">
          A Human-Centred Framework for Performance in an AI-Enabled Environment
        </p>
        <p className="mt-6 text-lg leading-relaxed text-[var(--site-text-body)]">
          Artificial intelligence does not create performance. Human capability does.
        </p>
        <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
          As AI tools become embedded in professional workflows, the differentiator between
          organisations is not access to technology, but the capability of people to deploy it
          effectively, responsibly, and consistently.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          {downloadUrl ? (
            <a
              href={downloadUrl}
              className="font-cta rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)]"
            >
              Download full report (PDF)
            </a>
          ) : (
            <span className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border-soft)] bg-[var(--site-surface-soft)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-muted)]">
              PDF temporarily unavailable
            </span>
          )}
          <TransitionLink
            href="/framework/lq-ai-readiness"
            className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)]"
          >
            Back to framework
          </TransitionLink>
        </div>

        <section className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
          <h2 className="font-serif text-4xl leading-[1.06]">The four core competencies</h2>
          <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
            The model defines four human competencies that determine whether AI becomes a force
            multiplier or a source of risk. These are behavioural, observable, and measurable.
          </p>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="site-card-primary p-6">
            <h3 className="font-serif text-3xl leading-[1.08]">1. Intellectual Curiosity</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
              Sustained drive to explore, experiment with, and refine AI usage through deliberate
              testing and iteration.
            </p>
            <p className="mt-3 text-sm font-semibold text-[var(--site-text-primary)]">Drives adoption and long-term capability growth.</p>
          </div>
          <div className="site-card-tint p-6">
            <h3 className="font-serif text-3xl leading-[1.08]">2. Systems Thinking</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
              Ability to translate AI interaction into structured, repeatable workflows that can
              scale with consistency.
            </p>
            <p className="mt-3 text-sm font-semibold text-[var(--site-text-primary)]">Drives scale and consistency.</p>
          </div>
          <div className="site-card-tint p-6">
            <h3 className="font-serif text-3xl leading-[1.08]">3. Critical Evaluation</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
              Disciplined verification of AI outputs for logic, bias, risk, and contextual suitability.
            </p>
            <p className="mt-3 text-sm font-semibold text-[var(--site-text-primary)]">Drives protection and disciplined judgement.</p>
          </div>
          <div className="site-card-primary p-6">
            <h3 className="font-serif text-3xl leading-[1.08]">4. Outcome Orientation</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
              Ability to deploy AI where it creates measurable improvements in performance, quality,
              or decision-making.
            </p>
            <p className="mt-3 text-sm font-semibold text-[var(--site-text-primary)]">Drives impact and measurable results.</p>
          </div>
        </section>

        <section className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
          <h2 className="font-serif text-4xl leading-[1.06]">Structural integrity</h2>
          <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
            The model balances exploration, structure, protection, and impact. It is intentionally
            interdependent: strength in one dimension cannot compensate for weakness in another.
          </p>
          <ul className="mt-4 space-y-2 text-[var(--site-text-body)]">
            <li>Curiosity without evaluation leads to exposure.</li>
            <li>Systems without outcome focus lead to inefficiency.</li>
            <li>Evaluation without curiosity leads to stagnation.</li>
            <li>Outcome focus without structure leads to inconsistency.</li>
          </ul>
        </section>

        <section className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
          <h2 className="font-serif text-4xl leading-[1.06]">Application</h2>
          <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
            The AI Capability Model is applied through structured assessment methods including
            scenario-based tasks, workflow design exercises, output critique and verification
            challenges, and value-alignment case analysis.
          </p>
          <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
            It can be deployed at individual level (capability profiling), team level (heatmaps and
            risk clustering), and leadership level (AI-enabled performance strategy).
          </p>
        </section>
      </article>
    </div>
  )
}
