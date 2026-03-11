import { normalizeReportConfig } from '@/utils/assessments/experience-config'
import { createAdminClient } from '@/utils/supabase/admin'
import {
  getAiReadinessRecommendations,
  type AiReadinessBands,
  type AiReadinessClassification,
} from '@/utils/services/ai-readiness-scoring'
import { getAssessmentReportData, type AssessmentReportData } from '@/utils/reports/assessment-report'
import { getAssessmentReportSectionAvailability } from '@/utils/reports/assessment-report-sections'
import type { AiOrientationSurveyReportData } from '@/utils/reports/report-document-types'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

type SubmissionRow = {
  first_name: string
  last_name: string
  email: string | null
  created_at: string
  assessment_submission_id: string | null
  answers: Record<string, unknown>
}

type SurveySubmissionRow = {
  first_name: string | null
  last_name: string | null
  email: string | null
  created_at: string
  bands: Record<string, unknown>
  classification: Record<string, unknown>
  recommendations: unknown
}

const classifications: readonly AiReadinessClassification[] = [
  'AI-Ready Operator',
  'Naive Enthusiast',
  'Cautious Traditionalist',
  'Eager but Underdeveloped',
  'AI Resistant',
  'Developing Operator',
]

const opennessBands: readonly AiReadinessBands['openness'][] = [
  'Early Adopter',
  'Conditional Adopter',
  'Resistant / Hesitant',
]

const riskBands: readonly AiReadinessBands['riskPosture'][] = [
  'Calibrated & Risk-Aware',
  'Moderate Awareness',
  'Blind Trust or Low Risk Sensitivity',
]

const capabilityBands: readonly AiReadinessBands['capability'][] = [
  'Confident & Skilled',
  'Developing',
  'Low Confidence',
]

const AI_ORIENTATION_ASSESSMENT_KEYS = new Set(['ai_readiness_orientation_v1'])
const AI_ORIENTATION_ASSESSMENT_KEY = 'ai_readiness_orientation_v1'

const classificationKeys: Record<string, AiReadinessClassification> = {
  ai_ready_operator: 'AI-Ready Operator',
  naive_enthusiast: 'Naive Enthusiast',
  cautious_traditionalist: 'Cautious Traditionalist',
  eager_but_underdeveloped: 'Eager but Underdeveloped',
  ai_resistant: 'AI Resistant',
  developing_operator: 'Developing Operator',
}

function toClassification(input: unknown): AiReadinessClassification | null {
  if (typeof input !== 'string') return null
  return classifications.find((item) => item === input) ?? null
}

function toClassificationFromKey(input: unknown): AiReadinessClassification | null {
  if (typeof input !== 'string') return null
  return classificationKeys[input] ?? null
}

function toOpennessBand(input: unknown): AiReadinessBands['openness'] | null {
  if (typeof input !== 'string') return null
  if (input === 'Experimenter / Early Adopter') return 'Early Adopter'
  return opennessBands.find((item) => item === input) ?? null
}

function toRiskBand(input: unknown): AiReadinessBands['riskPosture'] | null {
  if (typeof input !== 'string') return null
  return riskBands.find((item) => item === input) ?? null
}

function toCapabilityBand(input: unknown): AiReadinessBands['capability'] | null {
  if (typeof input !== 'string') return null
  if (input === 'Low Confidence / Skill Gap') return 'Low Confidence'
  return capabilityBands.find((item) => item === input) ?? null
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getAssessmentBandValue(report: AssessmentReportData, key: string) {
  const direct = report.bands[key]
  if (typeof direct === 'string' && direct.trim()) {
    return direct
  }

  const fallbackKeys = key === 'riskPosture' ? ['risk_posture', 'risk-posture'] : []

  for (const fallbackKey of fallbackKeys) {
    const fallback = report.bands[fallbackKey]
    if (typeof fallback === 'string' && fallback.trim()) {
      return fallback
    }
  }

  const dimension = report.dimensions.find((item) => item.key === key || fallbackKeys.includes(item.key))
  return dimension?.descriptor ?? null
}

export function isAiOrientationAssessmentKey(key: string | null | undefined) {
  return typeof key === 'string' && AI_ORIENTATION_ASSESSMENT_KEYS.has(key)
}

export function isAiOrientationAssessmentReport(report: AssessmentReportData) {
  return isAiOrientationAssessmentKey(report.assessment.key)
}

export function getAiOrientationSurveyReportFilename(
  report: Pick<AiOrientationSurveyReportData, 'firstName' | 'lastName'>
) {
  const participantName = slugify(`${report.firstName} ${report.lastName}`)
  return `ai-orientation-survey-${participantName || 'participant'}-report.pdf`
}

export function mapAssessmentToAiOrientationSurveyReport(
  report: AssessmentReportData,
  options?: { force?: boolean }
): AiOrientationSurveyReportData | null {
  return mapAssessmentToAiOrientationSurveyReportWithSubmissionId(report, report.submissionId, options)
}

function mapAssessmentToAiOrientationSurveyReportWithSubmissionId(
  report: AssessmentReportData,
  submissionId: string,
  options?: { force?: boolean }
): AiOrientationSurveyReportData | null {
  if (!options?.force && !isAiOrientationAssessmentReport(report)) {
    return null
  }

  const classification = toClassification(report.classification.label)
    ?? toClassificationFromKey(report.classification.key)
  const opennessBand = toOpennessBand(getAssessmentBandValue(report, 'openness'))
  const riskBand = toRiskBand(getAssessmentBandValue(report, 'riskPosture'))
  const capabilityBand = toCapabilityBand(getAssessmentBandValue(report, 'capability'))

  if (!classification || !opennessBand || !riskBand || !capabilityBand) {
    return null
  }

  return buildAiOrientationSurveyReport({
    submissionId,
    firstName: report.participant.firstName ?? '',
    lastName: report.participant.lastName ?? '',
    email: report.participant.email ?? null,
    completedAt: report.participant.completedAt ?? report.participant.createdAt,
    classification,
    opennessBand,
    riskBand,
    capabilityBand,
    recommendations:
      report.recommendations.length > 0
        ? report.recommendations
        : getAiReadinessRecommendations(classification),
    reportConfig: report.reportConfig,
    assessmentReport: report,
    traitScores: report.traitScores,
    narrativeInsights:
      report.interpretations.length > 0
        ? report.interpretations.map((item) => ({
            title: item.title ?? 'Insight',
            body: item.body,
          }))
        : undefined,
  })
}

export function getAiOrientationAxisCommentary(axis: 'curiosity' | 'judgement' | 'skill', band: string) {
  if (axis === 'curiosity') {
    if (band === 'Early Adopter') {
      return 'You show strong motivation to engage with AI and are likely to adopt new approaches quickly.'
    }
    if (band === 'Conditional Adopter') {
      return 'You are open to AI when the context is clear and the value is evident.'
    }
    return 'You currently prefer familiar methods, which may limit early AI adoption momentum.'
  }

  if (axis === 'judgement') {
    if (band === 'Calibrated & Risk-Aware') {
      return 'You demonstrate healthy judgement by balancing opportunity with quality, ethics, and risk awareness.'
    }
    if (band === 'Moderate Awareness') {
      return 'You show baseline caution, with room to strengthen consistency in risk and verification practices.'
    }
    return 'Risk sensitivity appears low, which can increase exposure to over-trust and avoidable errors.'
  }

  if (band === 'Confident & Skilled') {
    return 'You perceive strong capability and can likely translate AI use into meaningful outcomes.'
  }
  if (band === 'Developing') {
    return 'You are building capability and would benefit from focused practice in core AI workflows.'
  }
  return 'You may be underconfident or underprepared, indicating a need for structured skill development.'
}

export function getAiOrientationProfileNarrative(classification: AiReadinessClassification) {
  if (classification === 'AI-Ready Operator') {
    return 'Your profile indicates strong readiness across curiosity, judgement, and skill. You are well positioned to contribute as an early internal champion.'
  }
  if (classification === 'Naive Enthusiast') {
    return 'You appear enthusiastic about AI, but risk calibration needs strengthening. The priority is disciplined verification and governance habits.'
  }
  if (classification === 'Cautious Traditionalist') {
    return 'You demonstrate sound judgement but lower adoption momentum. Safe experimentation can help convert caution into practical progress.'
  }
  if (classification === 'Eager but Underdeveloped') {
    return 'Your intent to adopt is clear, while execution capability needs support. Practical skill-building should be the immediate focus.'
  }
  if (classification === 'AI Resistant') {
    return 'Your current profile suggests low adoption energy and skill confidence. Start with relevance, small wins, and guided support.'
  }
  return 'Your profile is in a developing middle zone. Continued practice and targeted support can lift all three readiness axes.'
}

async function getAiOrientationReportConfig(adminClient: AdminClient) {
  const { data, error } = await adminClient
    .from('assessments')
    .select('report_config')
    .eq('key', AI_ORIENTATION_ASSESSMENT_KEY)
    .maybeSingle()

  if (error || !data || typeof data !== 'object' || !('report_config' in data)) {
    return normalizeReportConfig(null)
  }

  return normalizeReportConfig(data.report_config)
}

function resolveCompetencyLabel(
  traitScores: AssessmentReportData['traitScores'],
  dimensionCode: string,
  fallback: string
): string {
  const match = traitScores.find((ts) => ts.dimensionCode === dimensionCode)
  return match?.dimensionExternalName?.trim() || match?.dimensionName?.trim() || fallback
}

function resolveAssessmentDimension(
  dimensions: AssessmentReportData['dimensions'],
  keys: string[]
) {
  return dimensions.find((dimension) => keys.includes(dimension.key)) ?? null
}

function buildAiOrientationCompetencies(input: {
  opennessBand: AiReadinessBands['openness']
  riskBand: AiReadinessBands['riskPosture']
  capabilityBand: AiReadinessBands['capability']
  assessmentReport?: AssessmentReportData
  traitScores?: AssessmentReportData['traitScores']
}) {
  const scores = input.traitScores ?? []
  const opennessAlts = ['openness', 'Openness']
  const riskAlts = ['riskPosture', 'risk_posture', 'riskposture', 'risk-posture']
  const capabilityAlts = ['capability', 'Capability']
  const dimensions = input.assessmentReport?.dimensions ?? []
  const opennessDimension = resolveAssessmentDimension(dimensions, opennessAlts)
  const riskDimension = resolveAssessmentDimension(dimensions, riskAlts)
  const capabilityDimension = resolveAssessmentDimension(dimensions, capabilityAlts)

  const opennessLabel = opennessAlts.reduce<string>(
    (acc, code) => acc || resolveCompetencyLabel(scores, code, ''),
    ''
  )

  const riskLabel = riskAlts.reduce<string>(
    (acc, code) => acc || resolveCompetencyLabel(scores, code, ''),
    ''
  )

  const capabilityLabel = capabilityAlts.reduce<string>(
    (acc, code) => acc || resolveCompetencyLabel(scores, code, ''),
    ''
  )

  return [
    {
      key: 'curiosity' as const,
      label: opennessDimension?.label || opennessLabel || 'Curiosity',
      internalLabel: opennessDimension?.internalLabel ?? 'Curiosity',
      description: opennessDimension?.description ?? null,
      band: input.opennessBand,
      bandMeaning:
        opennessDimension?.bandMeaning
        ?? getAiOrientationAxisCommentary('curiosity', input.opennessBand),
      commentary:
        opennessDimension?.bandMeaning
        ?? getAiOrientationAxisCommentary('curiosity', input.opennessBand),
    },
    {
      key: 'judgement' as const,
      label: riskDimension?.label || riskLabel || 'Judgement',
      internalLabel: riskDimension?.internalLabel ?? 'Judgement',
      description: riskDimension?.description ?? null,
      band: input.riskBand,
      bandMeaning:
        riskDimension?.bandMeaning
        ?? getAiOrientationAxisCommentary('judgement', input.riskBand),
      commentary:
        riskDimension?.bandMeaning
        ?? getAiOrientationAxisCommentary('judgement', input.riskBand),
    },
    {
      key: 'skill' as const,
      label: capabilityDimension?.label || capabilityLabel || 'Skill',
      internalLabel: capabilityDimension?.internalLabel ?? 'Skill',
      description: capabilityDimension?.description ?? null,
      band: input.capabilityBand,
      bandMeaning:
        capabilityDimension?.bandMeaning
        ?? getAiOrientationAxisCommentary('skill', input.capabilityBand),
      commentary:
        capabilityDimension?.bandMeaning
        ?? getAiOrientationAxisCommentary('skill', input.capabilityBand),
    },
  ]
}

function buildAiOrientationSurveyReport(input: {
  submissionId: string
  firstName: string
  lastName: string
  email: string | null
  completedAt: string | null
  classification: AiReadinessClassification
  opennessBand: AiReadinessBands['openness']
  riskBand: AiReadinessBands['riskPosture']
  capabilityBand: AiReadinessBands['capability']
  recommendations: string[]
  reportConfig: ReturnType<typeof normalizeReportConfig>
  assessmentReport?: AssessmentReportData
  traitScores?: AssessmentReportData['traitScores']
  narrativeInsights?: AiOrientationSurveyReportData['narrativeInsights']
}): AiOrientationSurveyReportData {
  const profileNarrative = getAiOrientationProfileNarrative(input.classification)
  const competencies = buildAiOrientationCompetencies({
    opennessBand: input.opennessBand,
    riskBand: input.riskBand,
    capabilityBand: input.capabilityBand,
    assessmentReport: input.assessmentReport,
    traitScores: input.traitScores,
  })
  const traitScores = input.traitScores ?? []
  const narrativeInsights = input.narrativeInsights ?? competencies.map((competency) => ({
    title: competency.label,
    body: competency.commentary,
  }))
  const sectionAvailability: AiOrientationSurveyReportData['sectionAvailability'] = input.assessmentReport
    ? getAssessmentReportSectionAvailability(input.assessmentReport)
    : {
        overall_profile: Boolean(input.classification),
        competency_cards: competencies.length > 0,
        percentile_benchmark:
          input.reportConfig.scoring_display_mode !== 'raw'
          && traitScores.some((trait) => typeof trait.percentile === 'number'),
        narrative_insights: narrativeInsights.length > 0,
        development_recommendations: input.recommendations.length > 0,
      }

  return {
    submissionId: input.submissionId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    completedAt: input.completedAt,
    classification: input.classification,
    opennessBand: input.opennessBand,
    riskBand: input.riskBand,
    capabilityBand: input.capabilityBand,
    profileNarrative,
    traitScores,
    competencies,
    narrativeInsights,
    recommendations: input.recommendations,
    reportConfig: input.reportConfig,
    sectionAvailability,
  }
}

export async function getAiOrientationSurveyReportData(
  adminClient: AdminClient,
  submissionId: string
): Promise<AiOrientationSurveyReportData | null> {
  const { data, error } = await adminClient
    .from('interest_submissions')
    .select('first_name, last_name, email, created_at, assessment_submission_id, answers')
    .eq('id', submissionId)
    .maybeSingle()

  let firstName = ''
  let lastName = ''
  let email: string | null = null
  let completedAt: string | null = null
  let classification: AiReadinessClassification | null = null
  let opennessBand: AiReadinessBands['openness'] | null = null
  let riskBand: AiReadinessBands['riskPosture'] | null = null
  let capabilityBand: AiReadinessBands['capability'] | null = null
  let customRecommendations: string[] | null = null

  if (!error && data) {
    const submission = data as SubmissionRow

    if (submission.assessment_submission_id) {
      const assessmentReport = await getAssessmentReportData(
        adminClient,
        submission.assessment_submission_id
      )
      if (assessmentReport) {
        const linkedReport = mapAssessmentToAiOrientationSurveyReportWithSubmissionId(
          assessmentReport,
          submissionId
        )
        if (linkedReport) {
          return linkedReport
        }
      }
    }

    firstName = submission.first_name
    lastName = submission.last_name
    email = submission.email ?? null
    completedAt = submission.created_at
    classification = toClassification(submission.answers?.classification)
    opennessBand = toOpennessBand(submission.answers?.openness_band)
    riskBand = toRiskBand(submission.answers?.risk_posture_band)
    capabilityBand = toCapabilityBand(submission.answers?.capability_band)
  } else {
    const { data: surveyData, error: surveyError } = await adminClient
      .from('survey_submissions')
      .select('first_name, last_name, email, created_at, bands, classification, recommendations')
      .eq('id', submissionId)
      .maybeSingle()

    if (surveyError || !surveyData) {
      return null
    }

    const submission = surveyData as SurveySubmissionRow
    firstName = submission.first_name ?? ''
    lastName = submission.last_name ?? ''
    email = submission.email ?? null
    completedAt = submission.created_at
    classification = toClassification(submission.classification?.label)
    opennessBand = toOpennessBand(submission.bands?.openness)
    riskBand = toRiskBand(submission.bands?.riskPosture)
    capabilityBand = toCapabilityBand(submission.bands?.capability)
    if (Array.isArray(submission.recommendations)) {
      customRecommendations = submission.recommendations.filter(
        (item): item is string => typeof item === 'string'
      )
    }
  }

  if (!classification || !opennessBand || !riskBand || !capabilityBand) {
    return null
  }

  const reportConfig = await getAiOrientationReportConfig(adminClient)

  return buildAiOrientationSurveyReport({
    submissionId,
    firstName,
    lastName,
    email,
    completedAt,
    classification,
    opennessBand,
    riskBand,
    capabilityBand,
    recommendations:
      customRecommendations && customRecommendations.length > 0
        ? customRecommendations
        : getAiReadinessRecommendations(classification),
    reportConfig,
  })
}
