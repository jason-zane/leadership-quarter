import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { ImmersiveCtaBand } from '@/components/site/immersive-cta-band'
import { AiReadinessReportDownloadModal } from '@/components/site/ai-readiness-report-download-modal'
import { TransitionLink } from '@/components/site/transition-link'

export const metadata: Metadata = {
  title: 'AI Readiness & Enablement',
  description:
    'The AI Capability Model: a human-centred framework for measuring performance in AI-enabled environments.',
}

const capabilityCompetencies = [
  {
    title: 'Intellectual Curiosity',
    driver: 'Adoption',
    definition:
      'The sustained drive to explore, experiment with, and continually refine AI use in professional contexts.',
    contextualisation:
      'In AI-enabled work, curiosity is structured experimentation, not passive interest.',
    behaviours: [
      'Proactively explores new tools and model capabilities',
      'Refines prompts through systematic testing',
      'Learns from failed or incomplete outputs',
      'Expands capability beyond initial exposure',
      'Stays engaged as tools evolve',
    ],
    performance:
      'Without curiosity, adoption plateaus quickly. With it, capability compounds over time.',
  },
  {
    title: 'Systems Thinking',
    driver: 'Scale and consistency',
    definition:
      'The ability to translate AI interaction into structured, repeatable, and scalable workflows.',
    contextualisation:
      'AI creates value when embedded into processes, not used sporadically.',
    behaviours: [
      'Deconstructs complex problems into structured inputs',
      'Designs repeatable prompt frameworks and templates',
      'Integrates outputs into existing workflows',
      'Documents processes for replication',
      'Creates clarity on use boundaries',
    ],
    performance:
      'Systems thinking converts individual productivity gains into operational leverage.',
  },
  {
    title: 'Critical Evaluation',
    driver: 'Protection and disciplined judgement',
    definition:
      'The disciplined ability to verify, challenge, and appropriately apply AI outputs.',
    contextualisation: 'AI outputs must be tested, not trusted.',
    behaviours: [
      'Validates factual claims and reasoning',
      'Identifies hallucinations, bias, and weak logic',
      'Tests assumptions and edge cases',
      'Recognises model limitations and misuse risk',
      'Considers confidentiality and data sensitivity',
      'Escalates high-risk decisions appropriately',
    ],
    performance:
      'Critical evaluation safeguards quality, credibility, and ethical integrity.',
  },
  {
    title: 'Outcome Orientation',
    driver: 'Impact and measurable results',
    definition:
      'The ability to deploy AI in ways that produce measurable improvement in performance or decision quality.',
    contextualisation: 'Effective users prioritise value over novelty.',
    behaviours: [
      'Identifies high-leverage tasks',
      'Defines success criteria before deployment',
      'Measures improvements in speed, quality, and accuracy',
      'Aligns AI usage to organisational priorities',
      'Stops usage when value is not demonstrated',
    ],
    performance:
      'Outcome orientation ensures AI enhances performance rather than simply increasing activity.',
  },
]

const applicationUseCases = [
  {
    title: 'Recruitment and selection',
    whenToUse: 'Before hiring into AI-exposed roles where judgement quality matters.',
    decision: 'Which candidates can deliver AI-enabled performance, not just tool familiarity.',
    output: 'Comparative capability profiles and hiring risk flags.',
  },
  {
    title: 'Team capability baselining',
    whenToUse: 'Before scaling AI usage across teams or business units.',
    decision: 'Where capability is strong, uneven, or exposed.',
    output: 'Team heatmaps and clustered risk patterns.',
  },
  {
    title: 'Leadership performance strategy',
    whenToUse: 'When setting AI-enabled operating standards at leadership level.',
    decision: 'Where to invest first for measurable uplift and lower risk.',
    output: 'Priority-aligned enablement plan and governance rhythm.',
  },
]

export default function LqAiReadinessPage() {
  return (
    <div className="text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">Frameworks</p>
            <h1 className="site-heading-display max-w-5xl font-serif text-[clamp(2.8rem,7vw,5.8rem)] text-[var(--site-text-primary)]">
              The AI Capability Model
              <span className="block text-[var(--site-accent-strong)]">human-centred performance in an AI-enabled environment.</span>
            </h1>
            <p className="mt-8 max-w-3xl text-lg leading-relaxed text-[var(--site-text-body)]">
              Artificial intelligence does not create performance. Human capability does.
            </p>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              As AI becomes embedded in workflows, the differentiator is not access to tools, but
              the capability of people to deploy them effectively, responsibly, and consistently.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Core competencies</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(2rem,4.8vw,3.7rem)] text-[var(--site-text-primary)]">
              Four capabilities determine whether AI
              <span className="block text-[var(--site-accent-strong)]">becomes leverage or liability.</span>
            </h2>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
            {capabilityCompetencies.map((competency, index) => (
              <Reveal key={competency.title} delay={index * 0.05}>
                <article className={index % 2 === 0 ? 'site-card-primary h-full p-7' : 'site-card-tint h-full p-7'}>
                  <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
                    Driver: {competency.driver}
                  </p>
                  <h3 className="mt-2 font-serif text-3xl leading-[1.1] text-[var(--site-text-primary)]">
                    {competency.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--site-text-body)]">
                    <span className="font-semibold text-[var(--site-text-primary)]">Definition:</span> {competency.definition}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
                    <span className="font-semibold text-[var(--site-text-primary)]">AI contextualisation:</span>{' '}
                    {competency.contextualisation}
                  </p>
                  <ul className="mt-4 space-y-1.5 text-sm leading-relaxed text-[var(--site-text-body)]">
                    {competency.behaviours.map((item) => (
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
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Structural integrity</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4.3vw,3.2rem)] text-[var(--site-text-primary)]">
              Exploration, structure, protection, and impact
              <span className="block text-[var(--site-accent-strong)]">must work together.</span>
            </h2>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              The model is balanced and interdependent. Absence of any one dimension creates
              predictable risk.
            </p>
          </Reveal>

          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
            <Reveal>
              <div className="site-card-sub p-5 text-sm leading-relaxed text-[var(--site-text-body)]">
                Curiosity without evaluation leads to exposure.
              </div>
            </Reveal>
            <Reveal delay={0.04}>
              <div className="site-card-sub p-5 text-sm leading-relaxed text-[var(--site-text-body)]">
                Systems without outcome focus lead to inefficiency.
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="site-card-sub p-5 text-sm leading-relaxed text-[var(--site-text-body)]">
                Evaluation without curiosity leads to stagnation.
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="site-card-sub p-5 text-sm leading-relaxed text-[var(--site-text-body)]">
                Outcome focus without structure leads to inconsistency.
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-3 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">How to apply it</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(1.9rem,4.3vw,3.2rem)] text-[var(--site-text-primary)]">
              Structured assessment, practical decisions,
              <span className="block text-[var(--site-accent-strong)]">measurable performance outcomes.</span>
            </h2>
          </Reveal>

          <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
            {applicationUseCases.map((useCase, index) => (
              <Reveal key={useCase.title} delay={index * 0.05}>
                <article className={index % 2 === 0 ? 'site-card-primary h-full p-6' : 'site-card-tint h-full p-6'}>
                  <h3 className="font-serif text-2xl leading-[1.15] text-[var(--site-text-primary)]">
                    {useCase.title}
                  </h3>
                  <p className="mt-4 text-sm leading-relaxed text-[var(--site-text-body)]">
                    <span className="font-semibold text-[var(--site-text-primary)]">When to use:</span> {useCase.whenToUse}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
                    <span className="font-semibold text-[var(--site-text-primary)]">Decision:</span> {useCase.decision}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
                    <span className="font-semibold text-[var(--site-text-primary)]">Output:</span> {useCase.output}
                  </p>
                </article>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.12}>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <AiReadinessReportDownloadModal />
              <TransitionLink
                href="/framework/lq-ai-readiness/orientation-survey"
                className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)]"
              >
                Complete AI Orientation Survey
              </TransitionLink>
            </div>
          </Reveal>
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
