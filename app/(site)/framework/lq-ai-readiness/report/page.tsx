import type { Metadata } from 'next'
import { TransitionLink } from '@/components/site/transition-link'
import { verifyReportAccessToken } from '@/utils/security/report-access'

export const metadata: Metadata = {
  title: 'AI Capability Model Report',
  description:
    'Editorial white paper on the AI Capability Model for improving human performance in AI-enabled environments.',
}

type Props = {
  searchParams: Promise<{ access?: string }>
}

type CompetencyChapter = {
  title: string
  label: string
  definition: string
  contextualisation: string
  behaviouralIndicators: string[]
  riskIfWeak: string
  impactWhenStrong: string
  drives: string
}

const competencyChapters: CompetencyChapter[] = [
  {
    title: '1. Intellectual Curiosity',
    label: 'Adoption Engine',
    definition:
      'Intellectual Curiosity is the sustained drive to explore, experiment with, and continually refine the use of AI tools in professional contexts.',
    contextualisation:
      'In an AI-enabled environment, curiosity is not passive interest. It appears as structured experimentation, deliberate iteration, and ongoing capability expansion.',
    behaviouralIndicators: [
      'Proactively explores new tools and model capabilities.',
      'Refines prompts through systematic testing.',
      'Learns from failed or incomplete outputs.',
      'Seeks to expand capability beyond initial exposure.',
      'Remains engaged as tools evolve.',
    ],
    riskIfWeak:
      'Adoption plateaus early, experimentation remains shallow, and teams default to narrow or outdated usage patterns.',
    impactWhenStrong:
      'People continuously expand competence, discover higher-value applications, and increase AI capability over time.',
    drives: 'Drives adoption and long-term capability growth.',
  },
  {
    title: '2. Systems Thinking',
    label: 'Scale Engine',
    definition:
      'Systems Thinking is the ability to translate AI interaction into structured, repeatable, and scalable workflows.',
    contextualisation:
      'AI creates value when embedded into processes rather than used sporadically. This is where individual productivity turns into team-level operating leverage.',
    behaviouralIndicators: [
      'Deconstructs complex problems into structured inputs.',
      'Designs repeatable prompt frameworks and templates.',
      'Integrates AI outputs into existing workflows.',
      'Documents processes for consistency and replication.',
      'Creates clarity around use boundaries and handoffs.',
    ],
    riskIfWeak:
      'AI use stays ad hoc, quality varies by operator, and performance gains fail to scale across teams.',
    impactWhenStrong:
      'Individual gains become consistent operating capability with stronger process reliability and transparency.',
    drives: 'Drives scale and consistency.',
  },
  {
    title: '3. Critical Evaluation',
    label: 'Protection Engine',
    definition:
      'Critical Evaluation is the disciplined ability to verify, challenge, and appropriately apply AI-generated outputs, including risk, limitations, and contextual suitability.',
    contextualisation:
      'AI outputs must be tested, not trusted. This competency protects decision quality when models produce plausible but flawed responses.',
    behaviouralIndicators: [
      'Validates factual claims and reasoning.',
      'Identifies hallucinations, bias, or weak logic.',
      'Tests assumptions and edge cases.',
      'Understands model limitations and inappropriate-use boundaries.',
      'Considers confidentiality and data sensitivity.',
      'Escalates high-risk decisions appropriately.',
    ],
    riskIfWeak:
      'Teams over-trust outputs, increase decision error rates, and expose the organisation to reputational and confidentiality risk.',
    impactWhenStrong:
      'Quality, credibility, and ethical integrity improve while high-risk decisions are managed with disciplined judgement.',
    drives: 'Drives protection and disciplined judgement.',
  },
  {
    title: '4. Outcome Orientation',
    label: 'Impact Engine',
    definition:
      'Outcome Orientation is the ability to deploy AI in ways that produce measurable improvement in performance, quality, or decision-making.',
    contextualisation:
      'Effective AI users prioritise value over novelty. They align AI effort to outcomes that matter and discontinue use where value is not demonstrated.',
    behaviouralIndicators: [
      'Identifies high-leverage tasks for AI application.',
      'Defines success criteria prior to deployment.',
      'Measures improvements in speed, quality, or accuracy.',
      'Aligns AI use with organisational priorities.',
      'Discontinues use where value is not demonstrated.',
    ],
    riskIfWeak:
      'AI becomes activity without impact, increasing output volume while failing to improve business performance.',
    impactWhenStrong:
      'AI usage stays tied to measurable outcomes and sustained performance improvement.',
    drives: 'Drives impact and measurable results.',
  },
]

const structuralModel = [
  {
    title: 'Exploration',
    body: 'People actively discover and test AI capability edges.',
  },
  {
    title: 'Structure',
    body: 'AI usage is converted into repeatable workflows and standards.',
  },
  {
    title: 'Protection',
    body: 'Outputs are verified with disciplined risk and quality controls.',
  },
  {
    title: 'Impact',
    body: 'AI is directed toward measurable performance outcomes.',
  },
]

const interdependencePatterns = [
  'Curiosity without evaluation creates exposure.',
  'Systems without outcome focus create inefficiency.',
  'Evaluation without curiosity creates stagnation.',
  'Outcome focus without structure creates inconsistency.',
]

const deploymentLevels = [
  {
    title: 'Individual capability profiling',
    body: 'Build a clear view of strengths, blind spots, and development priorities for AI-enabled work.',
  },
  {
    title: 'Team heatmaps and risk clustering',
    body: 'Identify capability concentration risks and target enablement where it improves execution quality fastest.',
  },
  {
    title: 'Leadership performance strategy',
    body: 'Use capability evidence to shape operating priorities, role expectations, and AI governance.',
  },
]

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
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-44 text-[var(--site-text-primary)] md:px-12">
      <article>
        <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Leadership Quarter white paper</p>
        <h1 className="mt-3 font-serif text-[clamp(2.5rem,5.2vw,4.6rem)] leading-[1.02]">
          The AI Capability Model
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-[var(--site-accent-strong)]">
          A Human-Centred Framework for Performance in an AI-Enabled Environment
        </p>
        <p className="mt-6 max-w-4xl text-xl leading-relaxed text-[var(--site-text-primary)]">
          Artificial intelligence does not create performance. Human capability does.
        </p>
        <p className="mt-5 max-w-4xl leading-relaxed text-[var(--site-text-body)]">
          As AI tools become embedded in professional workflows, the differentiator between
          organisations will not be access to technology, but the capability of individuals to deploy
          it effectively, responsibly, and consistently.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <TransitionLink
            href="/framework/lq-ai-readiness"
            className="font-cta rounded-[var(--radius-pill)] border border-[var(--site-border)] bg-[var(--site-surface-elevated)] px-7 py-2.5 text-sm font-semibold tracking-[0.02em] text-[var(--site-text-primary)]"
          >
            Back to framework
          </TransitionLink>
        </div>

        <section className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="site-card-primary p-5">
            <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Framework scope</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">4 core competencies</p>
          </div>
          <div className="site-card-tint p-5">
            <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Assessment signal</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">Behavioural, observable, measurable</p>
          </div>
          <div className="site-card-primary p-5">
            <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Deployment levels</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">Individual, team, leadership</p>
          </div>
        </section>

        <section className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
          <h2 className="font-serif text-4xl leading-[1.06]">Why this model matters now</h2>
          <p className="mt-4 max-w-4xl leading-relaxed text-[var(--site-text-body)]">
            AI adoption is no longer constrained by tool access. The limiting factor is human
            capability: judgement under uncertainty, disciplined workflow integration, and the ability
            to generate measurable outcomes without increasing risk.
          </p>
        </section>

        {competencyChapters.map((chapter, index) => (
          <section key={chapter.title} className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
            <div className="site-card-strong p-7 md:p-8">
              <p className="font-eyebrow text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
                {chapter.label}
              </p>
              <h2 className="mt-3 font-serif text-[clamp(2rem,4vw,3.2rem)] leading-[1.06]">{chapter.title}</h2>

              <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={index % 2 === 0 ? 'site-card-primary p-6' : 'site-card-tint p-6'}>
                  <h3 className="font-cta text-sm uppercase tracking-[0.06em] text-[var(--site-text-primary)]">Definition</h3>
                  <p className="mt-3 leading-relaxed text-[var(--site-text-body)]">{chapter.definition}</p>

                  <h3 className="mt-6 font-cta text-sm uppercase tracking-[0.06em] text-[var(--site-text-primary)]">
                    AI Contextualisation
                  </h3>
                  <p className="mt-3 leading-relaxed text-[var(--site-text-body)]">{chapter.contextualisation}</p>
                </div>

                <div className={index % 2 === 0 ? 'site-card-sub p-6' : 'site-card-primary p-6'}>
                  <h3 className="font-cta text-sm uppercase tracking-[0.06em] text-[var(--site-text-primary)]">
                    Behavioural indicators
                  </h3>
                  <ul className="mt-3 space-y-2 text-[var(--site-text-body)]">
                    {chapter.behaviouralIndicators.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>

                  <h3 className="mt-6 font-cta text-sm uppercase tracking-[0.06em] text-[var(--site-text-primary)]">
                    Risk if weak
                  </h3>
                  <p className="mt-3 leading-relaxed text-[var(--site-text-body)]">{chapter.riskIfWeak}</p>

                  <h3 className="mt-6 font-cta text-sm uppercase tracking-[0.06em] text-[var(--site-text-primary)]">
                    Impact when strong
                  </h3>
                  <p className="mt-3 leading-relaxed text-[var(--site-text-body)]">{chapter.impactWhenStrong}</p>

                  <p className="mt-5 text-sm font-semibold text-[var(--site-text-primary)]">{chapter.drives}</p>
                </div>
              </div>
            </div>
          </section>
        ))}

        <section className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
          <h2 className="font-serif text-4xl leading-[1.06]">Structural integrity of the model</h2>
          <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
            The model works as an integrated system of four dimensions. Each one plays a distinct role
            in turning AI usage into reliable performance.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="site-card-primary p-6">
              <h3 className="font-cta text-sm uppercase tracking-[0.06em] text-[var(--site-text-primary)]">
                How the model works together
              </h3>
              <ul className="mt-3 space-y-2 text-[var(--site-text-body)]">
                {structuralModel.map((item) => (
                  <li key={item.title}>
                    <span className="font-semibold text-[var(--site-text-primary)]">{item.title}:</span>{' '}
                    {item.body}
                  </li>
                ))}
              </ul>
            </div>

            <div className="site-card-sub p-6">
              <h3 className="font-cta text-sm uppercase tracking-[0.06em] text-[var(--site-text-primary)]">
                What breaks when one dimension is missing
              </h3>
              <ul className="mt-3 space-y-2 text-[var(--site-text-body)]">
                {interdependencePatterns.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
            This is why the model is interdependent: strength in one competency cannot reliably
            compensate for weakness in another.
          </p>
        </section>

        <section className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
          <h2 className="font-serif text-4xl leading-[1.06]">Application</h2>
          <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
            Use this model when you need to improve AI-enabled decision quality, reduce adoption risk,
            and align AI usage with measurable performance objectives.
          </p>
          <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">
            Assessment methods include scenario-based tasks, workflow design exercises, output
            critique and verification challenges, and value-alignment case analysis.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            {deploymentLevels.map((level, index) => (
              <div
                key={level.title}
                className={index % 2 === 0 ? 'site-card-primary p-6' : 'site-card-tint p-6'}
              >
                <h3 className="font-serif text-2xl leading-[1.12] text-[var(--site-text-primary)]">
                  {level.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">{level.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 border-t border-[var(--site-border-soft)] pt-10">
          <div className="site-card-strong p-7 md:p-8">
            <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
              Closing perspective
            </p>
            <p className="mt-4 max-w-4xl text-lg leading-relaxed text-[var(--site-text-body)]">
              In AI-enabled organisations, sustained performance comes from people who can explore
              capability, structure workflows, protect quality, and deliver measurable results. The
              AI Capability Model is designed to make that capability visible and actionable.
            </p>
          </div>
        </section>
      </article>
    </div>
  )
}
