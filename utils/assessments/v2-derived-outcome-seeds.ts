import {
  getBandingConfig,
  normalizeV2ScoringConfig,
  upsertBandingConfig,
  upsertDerivedOutcomeSet,
  upsertInterpretationContent,
  type V2BandingConfig,
  type V2DerivedOutcomeSet,
  type V2InterpretationContent,
  type V2ScoringConfig,
} from '@/utils/assessments/v2-scoring'

const AI_ORIENTATION_DIMENSION_BANDINGS: V2BandingConfig[] = [
  {
    level: 'dimension',
    targetKey: 'openness',
    bands: [
      {
        id: 'resistant_hesitant',
        label: 'Resistant / Hesitant',
        min: 1,
        max: 2.9,
        color: '#D8DDE7',
        meaning: 'Prefers familiar methods and is cautious about experimenting with AI.',
        behaviouralIndicators: 'Adopts slowly, waits for proof, and tends to prefer known workflows.',
        strengths: 'Can protect quality and stability when change is still untested.',
        watchouts: 'May miss useful low-risk AI applications and delay practical learning.',
        developmentFocus: 'Build confidence through safe, role-relevant experiments.',
        narrativeText: 'Currently more likely to stay with established methods than actively explore AI in work.',
      },
      {
        id: 'conditional_adopter',
        label: 'Conditional Adopter',
        min: 3,
        max: 3.9,
        color: '#E8DFC6',
        meaning: 'Open to AI when the use case feels practical, relevant, and low-risk.',
        behaviouralIndicators: 'Engages when value is clear, but is selective about where AI fits.',
        strengths: 'Can evaluate use cases pragmatically instead of adopting for novelty.',
        watchouts: 'May need stronger momentum to build habitual capability.',
        developmentFocus: 'Translate curiosity into regular, role-level AI practice.',
        narrativeText: 'Openness is present, but adoption tends to depend on context, confidence, and relevance.',
      },
      {
        id: 'early_adopter',
        label: 'Early Adopter',
        min: 4,
        max: 5,
        color: '#CFE5D2',
        meaning: 'Actively looks for ways AI can improve quality, speed, or effectiveness.',
        behaviouralIndicators: 'Experiments readily, seeks opportunities, and adapts workflows quickly.',
        strengths: 'Brings energy and momentum to AI adoption.',
        watchouts: 'Needs balanced judgement so enthusiasm stays disciplined.',
        developmentFocus: 'Pair experimentation with verification and responsible use.',
        narrativeText: 'Shows strong motivation to engage with AI and is likely to adopt new approaches quickly.',
      },
    ],
  },
  {
    level: 'dimension',
    targetKey: 'riskPosture',
    bands: [
      {
        id: 'low_risk_sensitivity',
        label: 'Blind Trust or Low Risk Sensitivity',
        min: 1,
        max: 2.9,
        color: '#E7D0D0',
        meaning: 'May underestimate the privacy, governance, or judgement risks that come with AI use.',
        behaviouralIndicators: 'More likely to over-trust output confidence and skip verification discipline.',
        strengths: 'Can move quickly when exploring new tools.',
        watchouts: 'Greater exposure to factual, ethical, and governance errors.',
        developmentFocus: 'Build stronger routines for checking accuracy, risk, and appropriateness.',
        narrativeText: 'Risk sensitivity appears low, which can increase exposure to over-trust and avoidable errors.',
      },
      {
        id: 'moderate_awareness',
        label: 'Moderate Awareness',
        min: 3,
        max: 3.9,
        color: '#E8DFC6',
        meaning: 'Recognises some risks, but still needs stronger verification and decision routines.',
        behaviouralIndicators: 'Shows baseline caution, though follow-through may vary across situations.',
        strengths: 'Has workable awareness of core AI use risks.',
        watchouts: 'Consistency can break down in more ambiguous or time-pressured scenarios.',
        developmentFocus: 'Strengthen repeatable judgement and verification habits.',
        narrativeText: 'Shows baseline caution, with room to strengthen consistency in risk and verification practices.',
      },
      {
        id: 'calibrated_risk_aware',
        label: 'Calibrated & Risk-Aware',
        min: 4,
        max: 5,
        color: '#CFE5D2',
        meaning: 'Approaches AI use with strong verification, judgement, and ethical awareness.',
        behaviouralIndicators: 'Balances opportunity with quality controls and responsible decision-making.',
        strengths: 'Can use AI with mature judgement and practical discipline.',
        watchouts: 'May still need more confidence or capability to translate caution into impact.',
        developmentFocus: 'Keep pairing strong judgement with effective execution.',
        narrativeText: 'Demonstrates healthy judgement by balancing opportunity with quality, ethics, and risk awareness.',
      },
    ],
  },
  {
    level: 'dimension',
    targetKey: 'capability',
    bands: [
      {
        id: 'low_confidence',
        label: 'Low Confidence',
        min: 1,
        max: 2.9,
        color: '#E7D0D0',
        meaning: 'Needs more confidence and practical skill to use AI well in role-relevant work.',
        behaviouralIndicators: 'Less likely to prompt effectively or combine AI output with sound judgement.',
        strengths: 'May still be cautious and willing to learn with structure.',
        watchouts: 'Low fluency can reduce adoption quality and momentum.',
        developmentFocus: 'Build core skill through guided practice and applied feedback.',
        narrativeText: 'May be underconfident or underprepared, indicating a need for structured skill development.',
      },
      {
        id: 'developing',
        label: 'Developing',
        min: 3,
        max: 3.9,
        color: '#E8DFC6',
        meaning: 'Shows emerging ability, but still needs practice to use AI consistently and well.',
        behaviouralIndicators: 'Has some practical fluency but benefits from stronger repetition and structure.',
        strengths: 'Good base to improve quickly with practical application.',
        watchouts: 'Capability may not yet be reliable under pressure or ambiguity.',
        developmentFocus: 'Improve prompting, validation, and workflow integration habits.',
        narrativeText: 'Building capability and would benefit from focused practice in core AI workflows.',
      },
      {
        id: 'confident_skilled',
        label: 'Confident & Skilled',
        min: 4,
        max: 5,
        color: '#CFE5D2',
        meaning: 'Uses AI with practical confidence and can combine it with sound judgement.',
        behaviouralIndicators: 'Able to structure prompts, detect issues, and turn output into useful work.',
        strengths: 'More likely to create quality and efficiency gains in real tasks.',
        watchouts: 'Needs continued judgement so confidence stays calibrated.',
        developmentFocus: 'Apply skill to higher-value and more complex workflows.',
        narrativeText: 'Perceives strong capability and can likely translate AI use into meaningful outcomes.',
      },
    ],
  },
]

const AI_ORIENTATION_DERIVED_OUTCOME_SET: V2DerivedOutcomeSet = {
  id: 'ai_orientation_profile',
  key: 'ai_orientation_profile',
  name: 'AI Orientation Profile',
  description: 'Resolves an overall AI orientation profile from the combination of openness, risk posture, and capability bands.',
  level: 'dimension',
  targetKeys: ['openness', 'riskPosture', 'capability'],
  outcomes: [
    {
      id: 'ai_ready_operator',
      key: 'ai_ready_operator',
      label: 'AI-Ready Operator',
      shortDescription: 'High openness, strong capability, and sound risk judgement.',
      reportSummary: 'Strong readiness across curiosity, judgement, and skill.',
      fullNarrative: 'Your profile indicates strong readiness across curiosity, judgement, and skill. You are well positioned to contribute as an early internal champion.',
      recommendations: [
        'Involve this person in AI pilot initiatives and peer enablement.',
        'Give them ownership of high-value workflows where quality and speed both matter.',
        'Use them as a benchmark for practical, responsible AI adoption behavior.',
      ],
      sortOrder: 10,
    },
    {
      id: 'naive_enthusiast',
      key: 'naive_enthusiast',
      label: 'Naive Enthusiast',
      shortDescription: 'Enthusiastic about AI, but currently underweights risk and verification.',
      reportSummary: 'High openness with weaker risk calibration.',
      fullNarrative: 'You appear enthusiastic about AI, but risk calibration needs strengthening. The priority is disciplined verification and governance habits.',
      recommendations: [
        'Prioritize governance and output verification habits before scaling usage.',
        'Introduce simple risk-check routines for privacy, ethics, and factual reliability.',
        'Pair experimentation with quality controls to reduce avoidable errors.',
      ],
      sortOrder: 20,
    },
    {
      id: 'cautious_traditionalist',
      key: 'cautious_traditionalist',
      label: 'Cautious Traditionalist',
      shortDescription: 'Risk-aware and thoughtful, but still hesitant to adopt AI in practice.',
      reportSummary: 'Strong judgement with lower adoption momentum.',
      fullNarrative: 'You demonstrate sound judgement but lower adoption momentum. Safe experimentation can help convert caution into practical progress.',
      recommendations: [
        'Build confidence through low-risk, role-relevant AI experiments.',
        'Set short practice cycles focused on value discovery, not tool complexity.',
        'Use examples of safe, high-quality AI use to reduce adoption friction.',
      ],
      sortOrder: 30,
    },
    {
      id: 'eager_but_underdeveloped',
      key: 'eager_but_underdeveloped',
      label: 'Eager but Underdeveloped',
      shortDescription: 'Ready to engage, but still building the practical capability to do it well.',
      reportSummary: 'Strong intent to adopt, with capability still catching up.',
      fullNarrative: 'Your intent to adopt is clear, while execution capability needs support. Practical skill-building should be the immediate focus.',
      recommendations: [
        'Focus on practical skill-building: prompting, validation, and workflow integration.',
        'Use guided templates and coaching to improve outcome quality quickly.',
        'Reinforce when to escalate to human judgement in high-stakes contexts.',
      ],
      sortOrder: 40,
    },
    {
      id: 'ai_resistant',
      key: 'ai_resistant',
      label: 'AI Resistant',
      shortDescription: 'Currently reluctant to engage with AI and lacking practical confidence.',
      reportSummary: 'Low adoption energy and low practical confidence.',
      fullNarrative: 'Your current profile suggests low adoption energy and skill confidence. Start with relevance, small wins, and guided support.',
      recommendations: [
        'Start with mindset and relevance: show direct role-level benefits.',
        'Use small wins to build confidence before introducing advanced practices.',
        'Combine support, structure, and repeated practice to shift adoption behavior.',
      ],
      sortOrder: 50,
    },
    {
      id: 'developing_operator',
      key: 'developing_operator',
      label: 'Developing Operator',
      shortDescription: 'Shows some readiness, but still needs balanced development across the model.',
      reportSummary: 'A middle-zone profile with room to lift across all three axes.',
      fullNarrative: 'Your profile is in a developing middle zone. Continued practice and targeted support can lift all three readiness axes.',
      recommendations: [
        'Continue strengthening all three axes with targeted, role-specific development.',
        'Measure progress over time to move from moderate to high capability.',
        'Use practical feedback loops to improve confidence, judgement, and outcomes.',
      ],
      sortOrder: 60,
    },
  ],
  mappings: [
    { id: 'map_01', combination: { openness: 'early_adopter', riskPosture: 'calibrated_risk_aware', capability: 'confident_skilled' }, outcomeKey: 'ai_ready_operator', rationale: 'Matches V1 rule: openness >= 4, riskPosture >= 4, capability >= 4.' },
    { id: 'map_02', combination: { openness: 'early_adopter', riskPosture: 'low_risk_sensitivity', capability: '*' }, outcomeKey: 'naive_enthusiast', rationale: 'Matches V1 rule: openness >= 4 and riskPosture < 3.' },
    { id: 'map_03', combination: { openness: 'resistant_hesitant', riskPosture: 'calibrated_risk_aware', capability: '*' }, outcomeKey: 'cautious_traditionalist', rationale: 'Matches V1 rule: riskPosture >= 4 and openness < 3.' },
    { id: 'map_04', combination: { openness: 'early_adopter', riskPosture: 'moderate_awareness', capability: 'low_confidence' }, outcomeKey: 'eager_but_underdeveloped', rationale: 'Matches V1 eager rule after excluding higher-priority naive outcome.' },
    { id: 'map_05', combination: { openness: 'early_adopter', riskPosture: 'calibrated_risk_aware', capability: 'low_confidence' }, outcomeKey: 'eager_but_underdeveloped', rationale: 'Matches V1 eager rule after excluding higher-priority AI-ready outcome.' },
    { id: 'map_06', combination: { openness: 'resistant_hesitant', riskPosture: 'low_risk_sensitivity', capability: 'low_confidence' }, outcomeKey: 'ai_resistant', rationale: 'Matches V1 resistant rule when cautious-traditionalist does not apply.' },
    { id: 'map_07', combination: { openness: 'resistant_hesitant', riskPosture: 'moderate_awareness', capability: 'low_confidence' }, outcomeKey: 'ai_resistant', rationale: 'Matches V1 resistant rule when cautious-traditionalist does not apply.' },
    { id: 'map_08', combination: { openness: '*', riskPosture: '*', capability: '*' }, outcomeKey: 'developing_operator', rationale: 'Default V1 fallback when no earlier classification rule matches.' },
  ],
}

const AI_ORIENTATION_INTERPRETATIONS: V2InterpretationContent[] = [
  {
    level: 'dimension',
    targetKey: 'openness',
    lowMeaning: 'You currently prefer familiar methods, which may limit early AI adoption momentum.',
    midMeaning: 'You are open to AI when the context is clear and the value is evident.',
    highMeaning: 'You show strong motivation to engage with AI and are likely to adopt new approaches quickly.',
    behaviouralIndicators: 'Adoption appetite ranges from cautious to proactive depending on current comfort and relevance.',
    strengths: 'This axis signals how easily AI use can become practical behaviour rather than abstract interest.',
    risksWatchouts: 'Lower openness can delay experimentation, while higher openness needs balanced discipline.',
    developmentFocus: 'Build confidence through safe, role-relevant experiments and convert curiosity into regular practice.',
    narrativeText: 'Openness to AI reflects readiness to try, adopt, and integrate AI into day-to-day work.',
  },
  {
    level: 'dimension',
    targetKey: 'riskPosture',
    lowMeaning: 'Risk sensitivity appears low, which can increase exposure to over-trust and avoidable errors.',
    midMeaning: 'You show baseline caution, with room to strengthen consistency in risk and verification practices.',
    highMeaning: 'You demonstrate healthy judgement by balancing opportunity with quality, ethics, and risk awareness.',
    behaviouralIndicators: 'Judgement ranges from over-trust to disciplined verification depending on current habits.',
    strengths: 'This axis shows how effectively someone balances experimentation with governance and quality control.',
    risksWatchouts: 'Lower scores increase exposure to factual, ethical, and governance mistakes.',
    developmentFocus: 'Strengthen repeatable verification habits and make judgement routines more consistent.',
    narrativeText: 'Risk posture captures how thoughtfully and safely AI is used in real decisions and workflows.',
  },
  {
    level: 'dimension',
    targetKey: 'capability',
    lowMeaning: 'You may be underconfident or underprepared, indicating a need for structured skill development.',
    midMeaning: 'You are building capability and would benefit from focused practice in core AI workflows.',
    highMeaning: 'You perceive strong capability and can likely translate AI use into meaningful outcomes.',
    behaviouralIndicators: 'Capability ranges from hesitant to fluent depending on practical prompting and workflow skill.',
    strengths: 'This axis shows whether AI use can translate into quality outcomes, not just interest or awareness.',
    risksWatchouts: 'Lower capability can reduce adoption quality even when openness is high.',
    developmentFocus: 'Improve prompting, validation, and workflow integration habits through repeated practice.',
    narrativeText: 'Capability reflects practical fluency using AI effectively in role-relevant tasks.',
  },
]

export function withAiOrientationDerivedOutcomeSeed(config: V2ScoringConfig) {
  let nextConfig = normalizeV2ScoringConfig(config)

  for (const banding of AI_ORIENTATION_DIMENSION_BANDINGS) {
    if (getBandingConfig(nextConfig, banding.level, banding.targetKey).bands.length === 0) {
      nextConfig = upsertBandingConfig(nextConfig, banding)
    }
  }

  if (!nextConfig.derivedOutcomes.some((item) => item.key === AI_ORIENTATION_DERIVED_OUTCOME_SET.key)) {
    nextConfig = upsertDerivedOutcomeSet(nextConfig, AI_ORIENTATION_DERIVED_OUTCOME_SET)
  }

  for (const interpretation of AI_ORIENTATION_INTERPRETATIONS) {
    nextConfig = upsertInterpretationContent(nextConfig, interpretation)
  }

  return nextConfig
}

export function isAiOrientationAssessmentKey(key: string | null | undefined) {
  return typeof key === 'string' && key.trim() === 'ai_readiness_orientation_v1'
}
