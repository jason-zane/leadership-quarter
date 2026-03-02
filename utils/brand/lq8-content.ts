export type Lq8QuadrantId =
  | 'inner-compass'
  | 'thinking-in-motion'
  | 'relating-to-others'
  | 'progress-and-growth'

export type Lq8Quadrant = {
  id: Lq8QuadrantId
  name: string
  purpose: string
  implication: string
}

export type Lq8Competency = {
  id: string
  name: string
  quadrant: Lq8QuadrantId
  definition: string
  signals: string[]
  not: string
  develops: string
  modernContext: string
}

export type Lq8Application = {
  title: string
  description: string
}

export const lq8Quadrants: Lq8Quadrant[] = [
  {
    id: 'inner-compass',
    name: 'Inner Compass',
    purpose: 'Lead self. Build trust. Hold the line when it matters.',
    implication:
      'As information and speed increase, trust becomes harder to earn and easier to lose. This quadrant protects it.',
  },
  {
    id: 'thinking-in-motion',
    name: 'Thinking in Motion',
    purpose: 'See the whole system. Adapt without losing direction.',
    implication:
      'Work changes faster than job descriptions. Leaders need judgement plus flexibility, not rigid expertise.',
  },
  {
    id: 'relating-to-others',
    name: 'Relating to Others',
    purpose: 'Create alignment. Make progress through people.',
    implication:
      'The more cross-functional and distributed the work, the more leadership becomes coordination and influence.',
  },
  {
    id: 'progress-and-growth',
    name: 'Progress and Growth',
    purpose: 'Turn intent into outcomes. Improve continuously.',
    implication:
      'The advantage goes to leaders and teams who learn faster and redesign how work gets done.',
  },
]

export const lq8Competencies: Lq8Competency[] = [
  {
    id: 'emotional-intelligence',
    name: 'Emotional Intelligence',
    quadrant: 'inner-compass',
    definition: 'Recognises emotions in self and others, regulates responses, and creates calm in ambiguity.',
    signals: [
      'Names emotional dynamics without escalating tension.',
      'Responds with composure under pressure and uncertainty.',
      'Adjusts communication to maintain trust across different stakeholders.',
    ],
    not: 'Avoiding difficult conversations to keep the peace.',
    develops: 'Use structured reflection after high-pressure decisions to improve self-awareness and response patterns.',
    modernContext: 'Improves decision quality under uncertainty in information-rich environments.',
  },
  {
    id: 'ethical-leadership',
    name: 'Ethical Leadership',
    quadrant: 'inner-compass',
    definition: 'Acts with integrity, makes fair decisions, and builds credibility through consistency.',
    signals: [
      'Makes trade-offs explicit when priorities conflict.',
      'Applies standards consistently, regardless of role seniority.',
      'Addresses risks and conduct issues early, not after impact.',
    ],
    not: 'Rigid rule-following that ignores context and consequences.',
    develops: 'Run pre-mortem decision reviews to test fairness, risk, and long-term consequences.',
    modernContext: 'Maintains trust while operating at speed across complex stakeholder environments.',
  },
  {
    id: 'strategic-thinking',
    name: 'Strategic Thinking',
    quadrant: 'thinking-in-motion',
    definition: 'Connects patterns, anticipates second-order effects, and makes decisions with a long-term view.',
    signals: [
      'Frames decisions within a broader system, not a single function.',
      'Spots downstream impacts and dependency risks early.',
      'Balances short-term delivery with long-term capability needs.',
    ],
    not: 'Abstract planning disconnected from execution realities.',
    develops: 'Use scenario planning with explicit assumptions and trigger points for course correction.',
    modernContext: 'Supports directional clarity when tools, markets, and workflows change rapidly.',
  },
  {
    id: 'adaptability',
    name: 'Adaptability',
    quadrant: 'thinking-in-motion',
    definition: 'Updates assumptions quickly, navigates change, and stays effective when conditions shift.',
    signals: [
      'Revises plans quickly when evidence changes.',
      'Reprioritises without losing accountability for outcomes.',
      'Maintains team momentum through ambiguity and transition.',
    ],
    not: 'Constant pivoting without a stable strategic intent.',
    develops: 'Run short learning cycles with explicit hypotheses and rapid review checkpoints.',
    modernContext: 'Critical for operating at speed in rapidly changing tools and workflows.',
  },
  {
    id: 'collaboration-psychological-safety',
    name: 'Collaboration',
    quadrant: 'relating-to-others',
    definition: 'Builds strong teams through shared ownership, open dialogue, and mutual accountability.',
    signals: [
      'Creates space for dissent and constructive challenge.',
      'Clarifies shared goals and cross-team responsibilities.',
      'Addresses friction directly while protecting relationships.',
    ],
    not: 'Consensus-seeking that slows decisions or blurs ownership.',
    develops: 'Set explicit team norms for challenge, handoffs, and retrospective learning.',
    modernContext: 'Essential for distributed teams and cross-functional complexity.',
  },
  {
    id: 'stakeholder-influence',
    name: 'Stakeholder Influence',
    quadrant: 'relating-to-others',
    definition: 'Aligns diverse interests, earns support without relying on authority, and moves outcomes forward.',
    signals: [
      'Maps stakeholder needs and decision rights before major initiatives.',
      'Tailors messages while maintaining one consistent strategic narrative.',
      'Builds commitment through trust and clarity, not escalation.',
    ],
    not: 'Political manoeuvring that trades long-term trust for short-term wins.',
    develops: 'Build stakeholder maps and influence plans tied to real business decisions.',
    modernContext: 'Increases execution velocity where work spans many teams and decision forums.',
  },
  {
    id: 'execution-accountability',
    name: 'Execution & Accountability',
    quadrant: 'progress-and-growth',
    definition: 'Sets clear priorities, drives delivery, and creates a culture where commitments matter.',
    signals: [
      'Translates strategy into clear milestones, owners, and timelines.',
      'Tracks progress visibly and closes gaps quickly.',
      'Holds standards on commitments without blame-based management.',
    ],
    not: 'Activity volume mistaken for measurable progress.',
    develops: 'Use weekly execution cadences with clear owners, risks, and decision deadlines.',
    modernContext: 'Sustains reliable performance while operating at speed.',
  },
  {
    id: 'learning-agility',
    name: 'Learning Agility',
    quadrant: 'progress-and-growth',
    definition: 'Learns from experience, applies insight quickly, and improves performance through rapid iteration.',
    signals: [
      'Extracts lessons from outcomes and adjusts quickly.',
      'Tests new approaches in low-risk experiments before scaling.',
      'Improves team methods, not just individual performance.',
    ],
    not: 'Consuming ideas without translating them into changed behaviour.',
    develops: 'Pair retrospectives with explicit next experiments and measurable adoption checks.',
    modernContext: 'Builds learning velocity in information-rich, fast-changing operating environments.',
  },
]

export const lq8Applications: Lq8Application[] = [
  {
    title: 'Hire and promote',
    description: 'Define what good looks like with clear behavioural indicators tied to role context and business outcomes.',
  },
  {
    title: 'Develop leaders',
    description: 'Target practical growth areas through coaching, stretch work, and role-relevant feedback loops.',
  },
  {
    title: 'Align expectations',
    description: 'Create a shared leadership language across teams and levels to improve consistency in decisions and feedback.',
  },
  {
    title: 'Build a pipeline',
    description: 'Identify potential through learning agility and judgement under change, then prioritise succession pathways.',
  },
]
