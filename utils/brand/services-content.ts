export type CaseStudy = {
  client: string
  challenge: string
  approach: string
  impact: string
}

export type ServiceContent = {
  slug:
    | 'executive-search'
    | 'talent-consulting'
    | 'executive-assessment'
    | 'succession-planning'
    | 'talent-strategy'
  name: string
  summary: string
  description: string
  includes: string[]
  audience: string[]
  primaryActionLabel: string
  contactSubject: string
  caseStudy: CaseStudy
}

export const servicesContent: ServiceContent[] = [
  {
    slug: 'executive-search',
    name: 'Executive Search',
    summary: 'Find leaders with the judgement, agility, and drive to deliver in your context.',
    description:
      'We run executive search for organisations that need leaders who can execute now and scale what comes next. We value sector experience, but we assess first for core capability, adaptability, and leadership drive.',
    includes: [
      'Leadership mandate design and success criteria definition',
      'Search mapping across relevant and adjacent talent markets',
      'Evidence-based assessment of capability, agility, and drive',
      'Offer and transition support aligned to first-year outcomes',
    ],
    audience: [
      'Boards and CEOs appointing leaders for critical transitions',
      'Growth organisations needing fast, high-confidence appointments',
      'Teams replacing pivotal leaders without slowing execution',
    ],
    primaryActionLabel: 'Define your search mandate',
    contactSubject: 'Executive Search Capability Inquiry',
    caseStudy: {
      client: 'Consumer Platform, Series D',
      challenge:
        'The business needed a commercial leader to scale a new function, but the obvious sector profiles lacked the execution range required.',
      approach:
        'Leadership Quarter defined outcome-based selection criteria, mapped adjacent markets, and assessed finalists for transferable capability and decision quality.',
      impact:
        'The final appointment was secured in 11 weeks and delivered measurable operating improvements within the first two quarters.',
    },
  },
  {
    slug: 'talent-consulting',
    name: 'Talent Consulting',
    summary: 'Shape leadership teams around the capability your strategy requires next.',
    description:
      'We help organisations build stronger leadership systems by aligning structure, accountabilities, and hiring priorities to business goals. The focus is practical: the right capability in the right roles at the right time.',
    includes: [
      'Leadership structure and capability diagnostics',
      'Role architecture and accountability redesign',
      'Critical hire sequencing and decision calibration',
      'Operating cadence for leadership governance',
    ],
    audience: [
      'Executive teams redesigning leadership structure during change',
      'Founders moving from founder-led decisions to scalable systems',
      'People leaders requiring strategic support on complex builds',
    ],
    primaryActionLabel: 'Diagnose your leadership structure',
    contactSubject: 'Talent Consulting Capability Inquiry',
    caseStudy: {
      client: 'Regional Healthcare Group',
      challenge:
        'Rapid expansion created unclear ownership and inconsistent leadership decisions across functions.',
      approach:
        'Leadership Quarter redesigned accountabilities, clarified role scope, and built a phased capability plan tied to strategic priorities.',
      impact:
        'Decision velocity improved, cross-team handoffs became cleaner, and critical leadership hires landed inside one quarter.',
    },
  },
  {
    slug: 'executive-assessment',
    name: 'Executive Assessment',
    summary: 'Assess leadership capability with clear evidence for high-stakes decisions.',
    description:
      'We assess leaders against the real demands of the role and your operating context. Our assessment frameworks prioritise capability, agility, and drive so appointment and succession decisions are grounded in evidence.',
    includes: [
      'Role-critical capability and risk framework',
      'Structured interviews for judgement, adaptability, and leadership range',
      'Comparative readiness analysis across candidates',
      'Clear transition priorities to accelerate early impact',
    ],
    audience: [
      'Boards selecting between final-stage executive candidates',
      'CEOs reducing appointment risk on pivotal roles',
      'Investors testing leadership resilience in portfolio businesses',
    ],
    primaryActionLabel: 'Run an executive assessment',
    contactSubject: 'Executive Assessment Capability Inquiry',
    caseStudy: {
      client: 'Industrial Services Business',
      challenge:
        'Two internal successors were both credible, but the board needed an objective capability view before making a final decision.',
      approach:
        'Leadership Quarter built a role-specific framework, ran independent assessments, and presented a comparative readiness and risk profile.',
      impact:
        'The board made a clear appointment decision and retained internal strength through a targeted development plan for the non-appointed finalist.',
    },
  },
  {
    slug: 'succession-planning',
    name: 'Succession Planning',
    summary: 'Build succession strength before leadership transitions become urgent.',
    description:
      'We design succession systems that are practical, governed, and decision-ready. The objective is continuity: credible leaders prepared to step in, whether transition is planned or unexpected.',
    includes: [
      'Critical role succession risk mapping by time horizon',
      'Successor readiness scoring and bench strength analysis',
      'Development plans linked to likely transition scenarios',
      'Governance rhythm for recurring succession review',
    ],
    audience: [
      'Boards strengthening continuity confidence in critical roles',
      'Organisations with concentrated leadership dependency risk',
      'Executive teams building transition resilience over 12 to 36 months',
    ],
    primaryActionLabel: 'Stress-test your succession bench',
    contactSubject: 'Succession Planning Capability Inquiry',
    caseStudy: {
      client: 'National Infrastructure Operator',
      challenge:
        'Succession plans existed on paper, but operational readiness was inconsistent across key leadership roles.',
      approach:
        'Leadership Quarter rebuilt succession criteria around role criticality and introduced governance checkpoints tied to business risk.',
      impact:
        'Leadership coverage confidence improved materially and continuity risk reduced across high-impact operational functions.',
    },
  },
  {
    slug: 'talent-strategy',
    name: 'Talent Strategy',
    summary: 'Set a leadership capability strategy that supports growth, resilience, and execution.',
    description:
      'We design talent strategy that links business ambition to leadership capability. Engagements clarify where capability should be built, bought, and accelerated over time.',
    includes: [
      'Translation of strategic priorities into leadership requirements',
      'Multi-year leadership architecture and critical role planning',
      'Talent investment and capability risk prioritisation',
      'Execution roadmap with ownership and measurement cadence',
    ],
    audience: [
      'Executive teams preparing for scale or transformation',
      'Organisations refocusing capability investment around business priorities',
      'People functions building board-ready leadership strategy',
    ],
    primaryActionLabel: 'Build your talent strategy',
    contactSubject: 'Talent Strategy Capability Inquiry',
    caseStudy: {
      client: 'Financial Services Transformation Program',
      challenge:
        'Strategic goals were ambitious, but leadership planning remained fragmented across business units and functions.',
      approach:
        'Leadership Quarter built a unified strategy linking enterprise goals to leadership design, successor depth, and capability priorities.',
      impact:
        'Leadership teams aligned on one execution plan and redirected talent investment toward the highest-value capability gaps.',
    },
  },
]

export const servicesBySlug: Record<ServiceContent['slug'], ServiceContent> = servicesContent.reduce(
  (acc, service) => {
    acc[service.slug] = service
    return acc
  },
  {} as Record<ServiceContent['slug'], ServiceContent>
)
