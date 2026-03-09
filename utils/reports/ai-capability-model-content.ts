import type { AiCapabilityCard, AiCapabilityCompetencyChapter } from '@/utils/reports/report-document-types'

export const aiCapabilityCompetencyChapters: AiCapabilityCompetencyChapter[] = [
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

export const aiCapabilityStructuralModel: AiCapabilityCard[] = [
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

export const aiCapabilityInterdependencePatterns = [
  'Curiosity without evaluation creates exposure.',
  'Systems without outcome focus create inefficiency.',
  'Evaluation without curiosity creates stagnation.',
  'Outcome focus without structure creates inconsistency.',
]

export const aiCapabilityDeploymentLevels: AiCapabilityCard[] = [
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
