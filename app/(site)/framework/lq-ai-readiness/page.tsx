import type { Metadata } from 'next'
import { StructuredData } from '@/components/site/structured-data'
import { Reveal } from '@/components/site/reveal'
import { ImmersiveCtaBand } from '@/components/site/immersive-cta-band'
import { AiReadinessReportDownloadModal } from '@/components/site/ai-readiness-report-download-modal'
import { TransitionLink } from '@/components/site/transition-link'
import { buildPublicMetadata } from '@/utils/site/public-metadata'
import { resolveSiteCtaHref } from '@/utils/services/site-cta-runtime'
import { getBreadcrumbSchema } from '@/utils/site/structured-data'

export const metadata: Metadata = buildPublicMetadata({
  title: 'AI Readiness & Enablement',
  description:
    'A framework for understanding how people adopt AI, exercise judgement, and turn AI tools into useful performance.',
  path: '/framework/lq-ai-readiness',
})

const orientationDimensions = [
  {
    title: 'Openness to AI',
    body: 'Appetite and adaptability: willingness to experiment, iterate, and adapt workflows as AI capability evolves.',
  },
  {
    title: 'AI risk posture',
    body: 'Judgement under uncertainty: ability to avoid both blind trust and risk paralysis while navigating privacy, bias, and ethics.',
  },
  {
    title: 'Self-perceived capability',
    body: 'Confidence alignment: whether perceived skill levels match actual limits, dependency patterns, and decision quality.',
  },
]

const capabilityCompetencies = [
  {
    title: 'Intellectual Curiosity',
    subtitle: 'Adoption engine',
    teaser:
      'Sustained drive to explore, test, and refine AI use through deliberate experimentation.',
    signals: ['Experiments with tools without waiting for instruction', 'Learns from failed outputs and iterates'],
    performance: 'Drives adoption and long-term capability growth.',
  },
  {
    title: 'Systems Thinking',
    subtitle: 'Scale engine',
    teaser:
      'Ability to turn AI interaction into structured, repeatable workflows that teams can scale.',
    signals: ['Builds reusable prompts, templates, and SOPs', 'Integrates AI into existing operating workflows'],
    performance: 'Drives scale and consistency.',
  },
  {
    title: 'Critical Evaluation',
    subtitle: 'Protection engine',
    teaser:
      'Disciplined verification of AI outputs for quality, logic, risk, and contextual suitability.',
    signals: ['Fact-checks claims and tests edge cases', 'Escalates high-risk decisions appropriately'],
    performance: 'Drives protection and disciplined judgement.',
  },
  {
    title: 'Outcome Orientation',
    subtitle: 'Impact engine',
    teaser:
      'Ability to deploy AI where it creates measurable improvement in performance and decisions.',
    signals: ['Defines success criteria before use', 'Stops usage where value is not demonstrated'],
    performance: 'Drives impact and measurable results.',
  },
]

const useCases = [
  {
    title: 'Recruitment and selection',
    whenToUse: 'Before hiring into AI-exposed roles where judgement quality matters.',
    decision: 'Which candidates can deliver AI-enabled performance, not just tool familiarity.',
    output: 'Comparative capability profiles and hiring risk flags.',
    tone: 'soft',
  },
  {
    title: 'Team capability baselining',
    whenToUse: 'Before scaling AI usage across teams or business units.',
    decision: 'Where capability is strong, uneven, or exposed.',
    output: 'Team heatmaps and clustered risk patterns.',
    tone: 'tint',
  },
  {
    title: 'Leadership performance strategy',
    whenToUse: 'When setting AI-enabled operating standards at leadership level.',
    decision: 'Where to invest first for measurable uplift and lower risk.',
    output: 'Priority-aligned enablement plan and governance rhythm.',
    tone: 'soft',
  },
]

const maturityLevels = [
  { name: 'Experimental', cue: 'Trial' },
  { name: 'Productive', cue: 'Repeatable' },
  { name: 'Scalable', cue: 'Integrated' },
  { name: 'Leading', cue: 'Differentiated' },
]

export default async function LqAiReadinessPage() {
  const { href: orientationSurveyHref } = await resolveSiteCtaHref('ai_readiness_orientation_primary')

  return (
    <div className="text-[var(--site-text-primary)]">
      <StructuredData
        data={getBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Frameworks', path: '/framework' },
          { name: 'AI Readiness & Enablement', path: '/framework/lq-ai-readiness' },
        ])}
      />
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">AI Readiness & Enablement</p>
            <h1 className="site-heading-display max-w-5xl font-serif text-[clamp(2.8rem,7vw,5.8rem)] text-[var(--site-text-primary)]">
              AI Readiness & Enablement
              <span className="block text-[var(--site-accent-strong)]">human capability in an AI-enabled world.</span>
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-relaxed text-[var(--site-text-body)]">
              AI adoption is not primarily a technology challenge. It is a human capability challenge.
              Tool access is no longer scarce. Judgement, discipline, structure, and measurable
              performance are.
            </p>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              The framework combines two complementary components: AI Orientation Survey (mindset and
              behavioural readiness) and AI Capability Assessment (observable AI-enabled performance).
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Readiness</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.8rem,4.2vw,3.2rem)] text-[var(--site-text-primary)]">
              AI Orientation Survey
              <span className="block text-[var(--site-accent-strong)]">cultural and psychological readiness.</span>
            </h2>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              This is not a technical audit. It answers a foundational question:
              do our people want to use AI, and how are they thinking about it?
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {orientationDimensions.map((dimension, index) => (
              <Reveal key={dimension.title} delay={index * 0.05}>
                <article className={index % 2 === 0 ? 'site-card-primary h-full p-7' : 'site-card-tint h-full p-7'}>
                  <h3 className="font-serif text-3xl leading-[1.1] text-[var(--site-text-primary)]">{dimension.title}</h3>
                  <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">{dimension.body}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.12}>
            <p className="mt-7 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              Survey outputs provide a readiness snapshot by individual and team, highlight judgement
              risk concentration, and identify where enablement should start.
            </p>
          </Reveal>
          <Reveal delay={0.14}>
            <TransitionLink
              href={orientationSurveyHref}
              className="font-cta mt-7 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
            >
              Complete AI Orientation Survey
            </TransitionLink>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Performance</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(2rem,4.8vw,3.7rem)] text-[var(--site-text-primary)]">
              AI Capability Assessment
              <span className="block text-[var(--site-accent-strong)]">measured human performance with AI.</span>
            </h2>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              The AI Capability Assessment measures whether people can deploy AI effectively,
              responsibly, and consistently enough to create measurable value.
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {capabilityCompetencies.map((competency, index) => (
              <Reveal key={competency.title} delay={index * 0.05}>
                <article className={index % 2 === 0 ? 'site-card-primary h-full p-7' : 'site-card-tint h-full p-7'}>
                  <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
                    {competency.subtitle}
                  </p>
                  <h3 className="mt-2 font-serif text-3xl leading-[1.1] text-[var(--site-text-primary)]">
                    {competency.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--site-text-body)]">{competency.teaser}</p>
                  <ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-[var(--site-text-body)]">
                    {competency.signals.map((item) => (
                      <li key={item} className="flex items-start gap-1.5">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--site-text-muted)]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 text-sm font-semibold leading-relaxed text-[var(--site-text-primary)]">
                    {competency.performance}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.12}>
            <div className="mt-7">
              <AiReadinessReportDownloadModal />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Scoring and outputs</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4.3vw,3.2rem)] text-[var(--site-text-primary)]">Capability maturity and practical outputs</h2>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              The model maps where people and teams are now, then defines a practical progression path
              for improving capability over time.
            </p>
          </Reveal>

          <div className="site-card-strong relative mt-7 overflow-hidden p-6 md:p-7">
            <div className="pointer-events-none absolute inset-0 bg-[var(--site-gradient-stage)] opacity-50" />
            <div className="relative">
              <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Maturity levels</p>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                {maturityLevels.map((level) => (
                  <div key={level.name} className="site-card-sub p-4 text-center">
                    <p className="font-cta text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)]">
                      {level.name}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">{level.cue}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Reveal>
              <div className="site-card-primary p-6 leading-relaxed text-[var(--site-text-body)]">
                <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Individual outputs</p>
                <p className="mt-3 text-sm">
                  Capability profile, strengths, blind spots, and targeted development priorities tied to role expectations.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div className="site-card-tint p-6 leading-relaxed text-[var(--site-text-body)]">
                <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Team outputs</p>
                <p className="mt-3 text-sm">
                  Capability heatmap, adoption risk flags, and a focused enablement plan to lift execution quality.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
              HOW TO APPLY IT
            </p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(2rem,4.8vw,3.7rem)] text-[var(--site-text-primary)]">
              <span className="block">Structured assessment, practical decisions,</span>
              <span className="block text-[var(--site-accent-strong)]">
                measurable performance outcomes.
              </span>
            </h2>
          </Reveal>

          <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-3">
            {useCases.map((item, index) => (
              <Reveal key={item.title} delay={0.03 + index * 0.05}>
                <article
                  className={[
                    'h-full p-7',
                    item.tone === 'tint'
                      ? 'site-card-tint'
                      : 'site-card-primary',
                  ].join(' ')}
                >
                  <h3 className="font-serif text-[clamp(1.35rem,1.35vw,1.85rem)] leading-[1.12] text-[var(--site-text-primary)] md:max-w-[16ch]">
                    {item.title}
                  </h3>
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--site-text-body)]">
                    <p>
                      <span className="font-ui font-semibold text-[var(--site-text-primary)]">
                        When to use:
                      </span>{' '}
                      {item.whenToUse}
                    </p>
                    <p>
                      <span className="font-ui font-semibold text-[var(--site-text-primary)]">
                        Decision:
                      </span>{' '}
                      {item.decision}
                    </p>
                    <p>
                      <span className="font-ui font-semibold text-[var(--site-text-primary)]">
                        Output:
                      </span>{' '}
                      {item.output}
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <ImmersiveCtaBand
              eyebrow="Enablement support"
              title="Need this implemented inside your operating context?"
              description="We can tailor the model to your teams, risk profile, and business priorities."
              primaryHref="/work-with-us#inquiry-form"
              primaryLabel="Talk to us"
            />
          </Reveal>
        </div>
      </section>
    </div>
  )
}
