export type ServiceContent = {
  slug:
    | 'executive-search'
    | 'leadership-assessment'
    | 'succession-strategy'
    | 'ai-readiness'
  name: string
  summary: string
  description: string
  includes: string[]
  audience: string[]
  primaryActionLabel: string
  contactSubject: string
}

export const servicesContent: ServiceContent[] = [
  {
    slug: 'executive-search',
    name: 'Executive Search',
    summary: 'Identify and secure leaders with the judgement, agility, and drive your context demands.',
    description:
      'We run executive search for organisations that need high-confidence leadership appointments. We assess internal and external talent against role-critical outcomes so selection decisions are based on evidence, not proximity or pedigree.',
    includes: [
      'Leadership mandate design and success criteria definition',
      'Internal and external talent mapping across relevant and adjacent markets',
      'Evidence-based assessment of capability, judgement, agility, and drive',
      'Selection, offer, and transition support aligned to first-year outcomes',
    ],
    audience: [
      'Boards and CEOs appointing leaders for critical transitions',
      'Growth organisations needing fast, high-confidence appointments',
      'Teams replacing pivotal leaders without losing execution momentum',
    ],
    primaryActionLabel: 'Explore executive search',
    contactSubject: 'Executive Search Capability Inquiry',
  },
  {
    slug: 'leadership-assessment',
    name: 'Leadership Assessment',
    summary: 'Assess leadership capability with clear evidence for high-stakes decisions across executive and broader organisational contexts.',
    description:
      'We assess leadership capability against the real demands of your operating context. This includes executive-level assessment and broader leadership and personnel assessment where needed, with psychometric and behavioural evidence used to improve decision quality.',
    includes: [
      'Role-critical capability and risk frameworks for executive and leadership roles',
      'Psychometric, behavioural, and judgement-focused assessment design',
      'Comparative readiness analysis across internal and external candidates',
      'Practical recommendations for appointment, development, and succession decisions',
    ],
    audience: [
      'Boards and CEOs reducing leadership appointment risk',
      'Executive and people teams strengthening leadership pipeline confidence',
      'Organisations requiring evidence-led assessment across leadership layers',
    ],
    primaryActionLabel: 'Explore leadership assessment',
    contactSubject: 'Leadership Assessment Capability Inquiry',
  },
  {
    slug: 'succession-strategy',
    name: 'Succession Strategy',
    summary: 'Strengthen succession readiness before leadership transitions become urgent.',
    description:
      'We design succession strategies that are practical, governed, and decision-ready. The objective is continuity: credible internal options, clear external pathways, and stronger leadership resilience over time.',
    includes: [
      'Critical role succession risk mapping by time horizon',
      'Successor readiness scoring and bench strength analysis',
      'Internal and external pathway planning for key transitions',
      'Governance rhythm for recurring succession decisions',
    ],
    audience: [
      'Boards strengthening continuity confidence in critical roles',
      'Organisations with concentrated leadership dependency risk',
      'Executive teams building transition resilience over 12 to 36 months',
    ],
    primaryActionLabel: 'Explore succession strategy',
    contactSubject: 'Succession Strategy Capability Inquiry',
  },
  {
    slug: 'ai-readiness',
    name: 'AI Capability & Enablement',
    summary: 'Assess and develop the human capabilities that drive effective, responsible, and value-creating AI use across leaders and teams.',
    description:
      'We measure and develop the capabilities that determine whether AI use creates value or creates risk. Using the AI Orientation Survey and AI Capability Index, we identify practical gaps across mindset, judgement, integration, and learning agility — then build targeted enablement that closes them.',
    includes: [
      'AI orientation baseline using the AI Orientation Survey across leaders and teams',
      'Capability measurement via the AI Capability Index across five capability areas',
      'Risk and gap analysis across judgement, integration, and learning agility',
      'Targeted enablement design aligned to role demands and strategic priorities',
    ],
    audience: [
      'Executive teams embedding AI across core workflows and decision processes',
      'Leaders responsible for quality decisions in AI-augmented environments',
      'People and transformation teams building AI capability at scale',
    ],
    primaryActionLabel: 'Explore AI capability and enablement',
    contactSubject: 'AI Capability & Enablement Capability Inquiry',
  },
]

export const servicesBySlug: Record<ServiceContent['slug'], ServiceContent> = servicesContent.reduce(
  (acc, service) => {
    acc[service.slug] = service
    return acc
  },
  {} as Record<ServiceContent['slug'], ServiceContent>
)
