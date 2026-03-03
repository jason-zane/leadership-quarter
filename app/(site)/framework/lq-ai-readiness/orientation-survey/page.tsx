import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { AiReadinessSurveyForm } from '@/components/site/ai-readiness-survey-form'

export const metadata: Metadata = {
  title: 'AI Orientation Survey',
  description:
    'A short, guided survey to understand how people approach AI in day-to-day work and where support is needed.',
}

export default function AiOrientationSurveyPage() {
  return (
    <div className="ai-survey-page text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-16 pt-36 md:pb-20 md:pt-48">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">
              Frameworks
            </p>
            <h1 className="site-heading-display max-w-5xl font-serif text-[clamp(2.6rem,6vw,5rem)] text-[var(--site-text-primary)]">
              AI Orientation Survey
              <span className="block text-[var(--site-accent-strong)]">a quick signal of how your team is engaging with AI.</span>
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-[var(--site-text-body)]">
              This assessment helps identify how people are currently approaching AI in their work and where targeted enablement will have the most impact.
            </p>
            <p className="mt-4 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              It is a short survey that takes about 5 minutes. You will answer one question at a time and receive a personal readiness report at the end.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-[var(--space-section-y)]">
        <div className="mx-auto max-w-5xl px-6 md:px-12">
          <Reveal>
            <AiReadinessSurveyForm />
          </Reveal>
        </div>
      </section>
    </div>
  )
}
