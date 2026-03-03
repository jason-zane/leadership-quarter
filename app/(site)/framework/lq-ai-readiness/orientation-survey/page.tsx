import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { TransitionLink } from '@/components/site/transition-link'

export const metadata: Metadata = {
  title: 'AI Orientation Survey',
  description:
    'Preview the AI Orientation Survey experience for measuring readiness, risk posture, and confidence alignment.',
}

const surveyPreview = [
  {
    prompt: 'I actively test new AI tools before formal rollout.',
    note: 'Measures openness to experimentation and adoption momentum.',
  },
  {
    prompt: 'I can identify when AI output should not be used without verification.',
    note: 'Measures judgement under uncertainty and risk posture.',
  },
  {
    prompt: 'My confidence in using AI matches my actual performance.',
    note: 'Measures alignment between self-perception and capability.',
  },
]

export default function AiOrientationSurveyPage() {
  return (
    <div className="text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">
              Frameworks
            </p>
            <h1 className="site-heading-display max-w-5xl font-serif text-[clamp(2.8rem,6.2vw,5.2rem)] text-[var(--site-text-primary)]">
              AI Orientation Survey
              <span className="block text-[var(--site-accent-strong)]">readiness signal before capability testing.</span>
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-[var(--site-text-body)]">
              This preview shows how the survey is structured. The live submission experience is
              being finalized and will be enabled in the next release.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="space-y-4">
              {surveyPreview.map((question, index) => (
                <div key={question.prompt} className={index % 2 === 0 ? 'site-card-primary p-6' : 'site-card-tint p-6'}>
                  <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
                    Sample question {index + 1}
                  </p>
                  <p className="mt-3 text-base leading-relaxed text-[var(--site-text-primary)]">{question.prompt}</p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">{question.note}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-[var(--radius-pill)] border border-[var(--site-border-soft)] px-3 py-1 text-xs text-[var(--site-text-muted)]">
                      Strongly disagree
                    </span>
                    <span className="rounded-[var(--radius-pill)] border border-[var(--site-border-soft)] px-3 py-1 text-xs text-[var(--site-text-muted)]">
                      Neutral
                    </span>
                    <span className="rounded-[var(--radius-pill)] border border-[var(--site-border-soft)] px-3 py-1 text-xs text-[var(--site-text-muted)]">
                      Strongly agree
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="site-card-sub mt-6 p-6">
              <p className="font-semibold text-[var(--site-text-primary)]">Live submissions coming next</p>
              <p className="mt-2 leading-relaxed text-[var(--site-text-body)]">
                If you want early access, share your context and we will run the survey manually for
                your team.
              </p>
              <TransitionLink
                href="/work-with-us#inquiry-form"
                className="font-cta mt-5 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
              >
                Request early access
              </TransitionLink>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
