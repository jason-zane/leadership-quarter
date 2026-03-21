import type { Metadata } from 'next'
import { AiCapabilityFlywheel } from '@/components/site/ai-capability-flywheel'
import { StructuredData } from '@/components/site/structured-data'
import { Reveal } from '@/components/site/reveal'
import { ImmersiveCtaBand } from '@/components/site/immersive-cta-band'
import { TransitionLink } from '@/components/site/transition-link'
import { buildPublicMetadata } from '@/utils/site/public-metadata'
import { resolveSiteCtaHref } from '@/utils/services/site-cta-runtime'
import { getBreadcrumbSchema } from '@/utils/site/structured-data'

export const metadata: Metadata = buildPublicMetadata({
  title: 'AI Capability & Enablement',
  description:
    'A framework for measuring and developing the human capabilities that determine whether AI use creates value — across orientation, judgement, integration, and learning agility.',
  path: '/framework/lq-ai-readiness',
})

const orientationDimensions = [
  {
    title: 'Openness to AI',
    subtitle: 'Appetite and adaptability',
    body: 'Willingness to experiment, iterate, and adapt workflows as AI capability evolves. This dimension helps show whether people are likely to engage actively with AI rather than resist, delay, or wait for certainty.',
  },
  {
    title: 'AI Risk Posture',
    subtitle: 'Judgement under uncertainty',
    body: 'The ability to avoid both blind trust and risk paralysis while navigating privacy, bias, ethics, and decision consequence. This dimension helps surface how responsibly people are likely to approach AI use when uncertainty is present.',
  },
  {
    title: 'Self-Perceived Capability',
    subtitle: 'Confidence alignment',
    body: 'Whether perceived skill levels are aligned with real limits, dependency patterns, and judgement quality. This dimension helps identify where confidence may be appropriately grounded, inflated, or overly cautious.',
  },
]

const capabilityAreas = [
  {
    title: 'AI Exploration',
    engine: 'Adoption Engine',
    definition: 'Explores AI proactively through testing, iteration, and discovery.',
    indicators: [
      'engages with new AI uses early',
      'tests alternatives when outputs slip',
      'uses weak outputs to refine use',
      'spots wider use cases early on',
    ],
    whyItMatters: 'Helps identify people who move AI adoption forward through active experimentation.',
  },
  {
    title: 'AI Integration',
    engine: 'Scale Engine',
    definition: 'Builds AI into repeatable work practices that fit broader workflows.',
    indicators: [
      'builds repeatable AI methods fast',
      'creates tools others can reuse',
      'connects AI use to team workflow',
      'scales useful practice across teams',
    ],
    whyItMatters: 'Shows who can move AI from isolated usage into more consistent, embedded practice.',
  },
  {
    title: 'Critical AI Judgement',
    engine: 'Protection Engine',
    definition: 'Evaluates AI outputs and decisions for accuracy, fit, and risk before acting.',
    indicators: [
      'checks outputs before relying on them',
      'tests assumptions and edge cases',
      'matches scrutiny to decision risk',
      'raises flags when confidence is low',
    ],
    whyItMatters: 'Helps identify who can use AI in ways that protect decision quality and manage exposure.',
  },
  {
    title: 'AI Value Targeting',
    engine: 'Impact Engine',
    definition: 'Applies AI where it is most likely to improve performance or decisions.',
    indicators: [
      'finds where AI can add most value',
      'defines what success should mean',
      'focuses effort on higher-value use',
      'stops work with weak return signs',
    ],
    whyItMatters: 'Shows who is likely to direct AI effort toward real business payoff.',
  },
  {
    title: 'AI Learning Agility',
    engine: 'Learning Engine',
    definition: 'Builds AI capability quickly through learning, adaptation, and transfer.',
    indicators: [
      'improves quickly after early use',
      'adapts as tools and needs shift',
      'transfers learning across tasks',
      'keeps building capability over time',
    ],
    whyItMatters: 'Highlights who is likely to build capability quickly and keep pace as AI evolves.',
  },
]

const capabilityFlywheel = [
  { action: 'Explore' },
  { action: 'Integrate' },
  { action: 'Judge' },
  { action: 'Value' },
  { action: 'Learn' },
] as const

const maturityLevels = ['Emerging', 'Developing', 'Productive', 'Repeatable', 'Integrated', 'Leading']

const outputCards = [
  {
    title: 'Individual outputs',
    body: 'Capability profile, strengths, blind spots, and targeted development priorities aligned to role expectations and organisational context.',
    tone: 'primary',
  },
  {
    title: 'Team outputs',
    body: 'Capability heatmaps, risk concentration, and engine-level patterns that show where teams are ready to scale and where capability remains uneven.',
    tone: 'tint',
  },
  {
    title: 'Leadership outputs',
    body: 'A clearer view of where AI capability supports execution, where it constrains organisational performance, and where development or intervention should begin.',
    tone: 'primary',
  },
]

const whatMakesDifferent = [
  {
    title: 'Behaviour over surface confidence',
    body: 'The model focuses on applied capability, not just stated interest, confidence, or tool familiarity.',
  },
  {
    title: 'Five distinct capability engines',
    body: 'Rather than collapsing AI readiness into a single score, the model separates exploration, integration, judgement, value targeting, and learning agility.',
  },
  {
    title: 'Leadership-relevant outputs',
    body: 'Outputs are designed to inform hiring, enablement, capability strategy, and performance decisions at individual, team, and organisational level.',
  },
  {
    title: 'Grounded in real application',
    body: 'Each engine is tied to practical patterns of behaviour that influence how AI is adopted, embedded, evaluated, and improved in real work.',
  },
]

const useCases = [
  {
    title: 'Recruitment and selection',
    whenToUse: 'Before hiring into leadership or high-leverage roles where AI judgement, adaptability, and execution quality matter.',
    whatItHelps: 'Distinguishes candidates who can contribute to AI-enabled performance from those with only surface familiarity.',
    outputs: 'Comparative capability profiles, risk flags, and sharper selection decisions.',
    tone: 'primary',
  },
  {
    title: 'Team capability baselining',
    whenToUse: 'Before scaling AI adoption across teams, functions, or business units.',
    whatItHelps: 'Identifies where capability is strong, uneven, or exposed before broader rollout or investment.',
    outputs: 'Team heatmaps, engine-level gap patterns, and clearer priorities for capability building.',
    tone: 'tint',
  },
  {
    title: 'Leadership performance strategy',
    whenToUse: 'When setting expectations for AI-enabled decision-making, operating rhythm, and execution at leadership level.',
    whatItHelps: 'Shows where leadership capability can accelerate adoption and where it may constrain consistency, judgement, or value.',
    outputs: 'Clearer priorities for leadership development, enablement focus, and governance discussion.',
    tone: 'primary',
  },
  {
    title: 'Targeted enablement design',
    whenToUse: 'When broad AI training has created awareness but not enough behavioural change or performance lift.',
    whatItHelps: 'Targets the capabilities that are limiting execution quality, scale, or value creation.',
    outputs: 'Focused enablement priorities tied to measured gaps rather than generic training coverage.',
    tone: 'tint',
  },
]

export default async function LqAiReadinessPage() {
  const { href: orientationSurveyHref } = await resolveSiteCtaHref('ai_readiness_orientation_primary')

  return (
    <div className="text-[var(--site-text-primary)]">
      <StructuredData
        data={getBreadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Frameworks', path: '/framework' },
          { name: 'AI Capability & Enablement', path: '/framework/lq-ai-readiness' },
        ])}
      />

      {/* Hero */}
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">AI Capability & Enablement</p>
            <h1 className="site-heading-display max-w-5xl font-serif text-[clamp(2.8rem,7vw,5.8rem)] text-[var(--site-text-primary)]">
              Human capability in
              <span className="block text-[var(--site-accent-strong)]">an AI-enabled world.</span>
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-relaxed text-[var(--site-text-body)]">
              AI adoption is not primarily a technology challenge. It is a human capability challenge.
              Tool access is no longer scarce. Judgement, discipline, structure, and measurable performance are.
            </p>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              The framework combines two complementary components: the AI Orientation Survey, which measures mindset and behavioural readiness, and the AI Capability Index, which measures applied AI capability across five critical engines of performance.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {orientationSurveyHref ? (
                <TransitionLink
                  href={orientationSurveyHref}
                  className="font-cta inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
                >
                  Complete AI Orientation Survey
                </TransitionLink>
              ) : null}
              <TransitionLink
                href="#capability-index"
                className="font-cta inline-block rounded-[var(--radius-pill)] border border-[var(--site-border-soft)] bg-[var(--site-glass-bg)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-glass-bg-strong)]"
              >
                Explore AI Capability Index
              </TransitionLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Readiness — AI Orientation Survey */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Readiness</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.8rem,4.2vw,3.2rem)] text-[var(--site-text-primary)]">
              AI Orientation Survey
              <span className="block text-[var(--site-accent-strong)]">Cultural and behavioural readiness.</span>
            </h2>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              This is not a technical audit. It answers a foundational question: are your people ready to engage with AI in a constructive, responsible, and practically useful way?
            </p>
            <p className="mt-4 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              The AI Orientation Survey provides an early view of how individuals and teams are approaching AI before deeper capability is assessed. It highlights where openness is strong, where judgement may be uneven, and where enablement should begin.
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
            {orientationDimensions.map((dimension, index) => (
              <Reveal key={dimension.title} delay={index * 0.05} className="h-full">
                <article className={index % 2 === 0 ? 'site-card-primary h-full p-7' : 'site-card-tint h-full p-7'}>
                  <h3 className="font-serif text-2xl leading-[1.1] text-[var(--site-text-primary)]">{dimension.title}</h3>
                  <p className="font-eyebrow mt-2 text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">{dimension.subtitle}</p>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--site-text-body)]">{dimension.body}</p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.12}>
            <p className="font-eyebrow mt-8 mb-2 text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">What the survey shows</p>
            <p className="max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              Survey outputs provide a readiness snapshot by individual and team, highlight judgement risk concentration, and identify where enablement should start.
            </p>
          </Reveal>
          {orientationSurveyHref ? (
            <Reveal delay={0.14}>
              <TransitionLink
                href={orientationSurveyHref}
                className="font-cta mt-6 inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
              >
                Complete AI Orientation Survey
              </TransitionLink>
            </Reveal>
          ) : null}
        </div>
      </section>

      {/* Capability measurement — AI Capability Index */}
      <section id="capability-index" className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12">
            <Reveal>
              <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Capability measurement</p>
              <h2 className="site-heading-section font-serif text-[clamp(2rem,4.8vw,3.7rem)] text-[var(--site-text-primary)]">
                AI Capability Index
                <span className="block text-[var(--site-accent-strong)]">Measured human capability with AI.</span>
              </h2>
              <p className="mt-5 leading-relaxed text-[var(--site-text-body)]">
                Readiness matters, but readiness alone does not tell you whether people can apply AI well in real work. The AI Capability Index measures how individuals use AI in ways that influence execution quality, judgement, consistency, value creation, and capability growth across the organisation.
              </p>
              <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
                It is an individual-level assessment with organisation-level relevance, helping leaders understand who is likely to strengthen AI adoption, workflow integration, responsible use, measurable value, and long-term capability development.
              </p>
            </Reveal>

            <Reveal delay={0.08} className="h-full">
              <AiCapabilityFlywheel items={capabilityFlywheel} />
            </Reveal>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {capabilityAreas.map((area, index) => (
              <Reveal key={area.title} delay={index * 0.05} className="h-full">
                <article className={index % 2 === 0 ? 'site-card-primary h-full p-7' : 'site-card-tint h-full p-7'}>
                  <p className="font-eyebrow mb-3 text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">{area.engine}</p>
                  <h3 className="font-serif text-3xl leading-[1.1] text-[var(--site-text-primary)]">{area.title}</h3>
                  <p className="font-eyebrow mt-4 mb-1.5 text-[10px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Definition</p>
                  <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{area.definition}</p>
                  <p className="font-eyebrow mt-4 mb-2 text-[10px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">What it looks like</p>
                  <ul className="space-y-1.5 text-sm leading-relaxed text-[var(--site-text-body)]">
                    {area.indicators.map((indicator) => (
                      <li key={indicator} className="flex items-start gap-1.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--site-text-muted)]" />
                        <span>{indicator}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5 border-t border-[var(--site-border-soft)] pt-4">
                    <p className="font-eyebrow mb-1.5 text-[10px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Why it matters</p>
                    <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{area.whyItMatters}</p>
                  </div>
                </article>
              </Reveal>
            ))}

            <Reveal delay={0.27} className="h-full">
              <article className="site-card-strong h-full p-7">
                <p className="font-eyebrow mb-3 text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">The complete picture</p>
                <h3 className="font-serif text-2xl leading-[1.1] text-[var(--site-text-primary)]">Five engines. One capability profile.</h3>
                <p className="mt-4 text-sm leading-relaxed text-[var(--site-text-body)]">
                  Each engine captures a different dimension of AI-enabled performance. Together, they create a practical profile of how a person is likely to contribute to AI adoption, execution quality, risk management, value creation, and capability growth across the organisation.
                </p>
                <p className="mt-4 text-sm leading-relaxed text-[var(--site-text-body)]">
                  The result is not just descriptive. It helps leaders identify where capability already supports scale, where constraints remain, and where targeted action is most likely to improve performance.
                </p>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Scoring and outputs */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Scoring and outputs</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4.3vw,3.2rem)] text-[var(--site-text-primary)]">Capability maturity with practical outputs.</h2>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              The model maps where people and teams are now, then defines a practical progression path for improving capability over time. Outputs are built to support leadership decisions, not just report scores.
            </p>
          </Reveal>

          <div className="site-card-strong relative mt-7 overflow-hidden p-6 md:p-7">
            <div className="pointer-events-none absolute inset-0 bg-[var(--site-gradient-stage)] opacity-50" />
            <div className="relative">
              <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Maturity levels</p>
              <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                {maturityLevels.map((level) => (
                  <div key={level} className="site-card-sub p-4 text-center">
                    <p className="font-cta text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)]">
                      {level}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {outputCards.map((card, index) => (
              <Reveal key={card.title} delay={index * 0.06} className="h-full">
                <div className={`h-full p-6 leading-relaxed text-[var(--site-text-body)] ${card.tone === 'tint' ? 'site-card-tint' : 'site-card-primary'}`}>
                  <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">{card.title}</p>
                  <p className="mt-3 text-sm">{card.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* What makes this different */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">What makes this different</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4.3vw,3.2rem)] text-[var(--site-text-primary)]">
              Built for capability decisions,
              <span className="block text-[var(--site-accent-strong)]">not just awareness.</span>
            </h2>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {whatMakesDifferent.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.05} className="h-full">
                <article className={index % 2 === 0 ? 'site-card-primary h-full p-7' : 'site-card-tint h-full p-7'}>
                  <h3 className="font-serif text-2xl leading-[1.15] text-[var(--site-text-primary)]">{item.title}</h3>
                  <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">{item.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How to apply it */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
              How to apply it
            </p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(2rem,4.8vw,3.7rem)] text-[var(--site-text-primary)]">
              <span className="block">Structured assessment, practical decisions,</span>
              <span className="block text-[var(--site-accent-strong)]">measurable performance outcomes.</span>
            </h2>
          </Reveal>

          <div className="mt-9 grid grid-cols-1 gap-5 md:grid-cols-2">
            {useCases.map((item, index) => (
              <Reveal key={item.title} delay={0.03 + index * 0.05} className="h-full">
                <article
                  className={[
                    'h-full p-7',
                    item.tone === 'tint' ? 'site-card-tint' : 'site-card-primary',
                  ].join(' ')}
                >
                  <h3 className="font-serif text-2xl leading-[1.12] text-[var(--site-text-primary)]">
                    {item.title}
                  </h3>
                  <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--site-text-body)]">
                    <p>
                      <span className="font-ui font-semibold text-[var(--site-text-primary)]">When to use:</span>{' '}
                      {item.whenToUse}
                    </p>
                    <p>
                      <span className="font-ui font-semibold text-[var(--site-text-primary)]">What it helps:</span>{' '}
                      {item.whatItHelps}
                    </p>
                    <p>
                      <span className="font-ui font-semibold text-[var(--site-text-primary)]">Outputs:</span>{' '}
                      {item.outputs}
                    </p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <ImmersiveCtaBand
              eyebrow="AI Capability Index"
              title="Measure the capabilities that make AI work in practice."
              description="Get a clearer view of who can adopt AI well, scale it into workflow, apply sound judgement, focus on value, and keep building capability as the landscape changes."
              primaryHref="/work-with-us#inquiry-form"
              primaryLabel="Book a conversation"
              secondaryHref="/capabilities/ai-readiness"
              secondaryLabel="See the framework"
              secondaryStyle="subtle-link"
            />
          </Reveal>
        </div>
      </section>
    </div>
  )
}
