import type { ReportConfig } from '@/utils/assessments/experience-config'
import type { AssessmentReportData } from '@/utils/reports/assessment-report'

export const STANDARD_ASSESSMENT_REPORT_SECTION_ORDER = [
  'overall_profile',
  'competency_cards',
  'percentile_benchmark',
  'narrative_insights',
  'development_recommendations',
] as const

export type AssessmentReportSectionId = (typeof STANDARD_ASSESSMENT_REPORT_SECTION_ORDER)[number]

export type AssessmentReportSectionAvailability = Record<AssessmentReportSectionId, boolean>

export type AssessmentReportSectionState = {
  id: AssessmentReportSectionId
  label: string
  enabled: boolean
  available: boolean
  visible: boolean
}

const ASSESSMENT_REPORT_SECTION_LABELS: Record<AssessmentReportSectionId, string> = {
  overall_profile: 'Overall profile',
  competency_cards: 'Competency cards',
  percentile_benchmark: 'Percentile benchmark',
  narrative_insights: 'Narrative insights',
  development_recommendations: 'Development recommendations',
}

function getEnabledState(
  reportConfig: Pick<
    ReportConfig,
    | 'show_overall_classification'
    | 'show_dimension_scores'
    | 'show_trait_scores'
    | 'show_interpretation_text'
    | 'show_recommendations'
  >
): Record<AssessmentReportSectionId, boolean> {
  return {
    overall_profile: reportConfig.show_overall_classification,
    competency_cards: reportConfig.show_dimension_scores,
    percentile_benchmark: reportConfig.show_trait_scores,
    narrative_insights: reportConfig.show_interpretation_text,
    development_recommendations: reportConfig.show_recommendations,
  }
}

export function getAssessmentReportSections(
  reportConfig: Pick<
    ReportConfig,
    | 'show_overall_classification'
    | 'show_dimension_scores'
    | 'show_trait_scores'
    | 'show_interpretation_text'
    | 'show_recommendations'
  >,
  availability: AssessmentReportSectionAvailability
): AssessmentReportSectionState[] {
  const enabledState = getEnabledState(reportConfig)

  return STANDARD_ASSESSMENT_REPORT_SECTION_ORDER.map((id) => ({
    id,
    label: ASSESSMENT_REPORT_SECTION_LABELS[id],
    enabled: enabledState[id],
    available: availability[id],
    visible: enabledState[id] && availability[id],
  }))
}

export function getAssessmentReportSectionLabels(
  reportConfig: Pick<
    ReportConfig,
    | 'show_overall_classification'
    | 'show_dimension_scores'
    | 'show_trait_scores'
    | 'show_interpretation_text'
    | 'show_recommendations'
  >,
  availability: AssessmentReportSectionAvailability
) {
  return getAssessmentReportSections(reportConfig, availability)
    .filter((section) => section.visible)
    .map((section) => section.label)
}

export function getAssessmentReportSectionAvailability(
  report: Pick<
    AssessmentReportData,
    | 'classification'
    | 'dimensions'
    | 'traitScores'
    | 'interpretations'
    | 'recommendations'
    | 'hasPsychometricData'
    | 'reportConfig'
  >
): AssessmentReportSectionAvailability {
  const hasPercentiles = report.traitScores.some((trait) => typeof trait.percentile === 'number')

  return {
    overall_profile: Boolean(report.classification.label?.trim()),
    competency_cards: report.dimensions.length > 0,
    percentile_benchmark:
      report.reportConfig.scoring_display_mode !== 'raw'
      && report.hasPsychometricData
      && hasPercentiles,
    narrative_insights: report.hasPsychometricData && report.interpretations.length > 0,
    development_recommendations: report.recommendations.length > 0,
  }
}
