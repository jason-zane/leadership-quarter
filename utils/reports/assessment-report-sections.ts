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

const DEFAULT_ASSESSMENT_REPORT_SECTION_LABELS: Record<AssessmentReportSectionId, string> = {
  overall_profile: 'Overall profile',
  competency_cards: 'Competency cards',
  percentile_benchmark: 'Percentile benchmark',
  narrative_insights: 'Narrative insights',
  development_recommendations: 'Development recommendations',
}

const STEN_ASSESSMENT_REPORT_SECTION_LABELS: Record<AssessmentReportSectionId, string> = {
  overall_profile: 'Overall profile',
  competency_cards: 'Competency profiles',
  percentile_benchmark: 'Trait profiles',
  narrative_insights: 'Narrative insights',
  development_recommendations: 'Development recommendations',
}

function getSectionLabels(reportConfig: Pick<ReportConfig, 'report_template'>) {
  return reportConfig.report_template === 'sten_profile'
    ? STEN_ASSESSMENT_REPORT_SECTION_LABELS
    : DEFAULT_ASSESSMENT_REPORT_SECTION_LABELS
}

export function getAssessmentReportSectionLabelMap(
  reportConfig: Pick<ReportConfig, 'report_template'>
): Record<AssessmentReportSectionId, string> {
  return getSectionLabels(reportConfig)
}

function getEnabledState(
  reportConfig: Pick<
    ReportConfig,
    | 'report_template'
    | 'show_overall_classification'
    | 'show_dimension_scores'
    | 'show_trait_scores'
    | 'show_interpretation_text'
    | 'show_recommendations'
    | 'pdf_hidden_sections'
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
    | 'report_template'
    | 'show_overall_classification'
    | 'show_dimension_scores'
    | 'show_trait_scores'
    | 'show_interpretation_text'
    | 'show_recommendations'
    | 'pdf_hidden_sections'
  >,
  availability: AssessmentReportSectionAvailability,
  options?: { mode?: 'web' | 'pdf' }
): AssessmentReportSectionState[] {
  const enabledState = getEnabledState(reportConfig)
  const labels = getSectionLabels(reportConfig)

  return STANDARD_ASSESSMENT_REPORT_SECTION_ORDER.map((id) => {
    const hiddenInPdf =
      options?.mode === 'pdf' && reportConfig.pdf_hidden_sections.includes(id)

    return {
      id,
      label: labels[id],
      enabled: enabledState[id],
      available: availability[id],
      visible: enabledState[id] && availability[id] && !hiddenInPdf,
    }
  })
}

export function getAssessmentReportSectionLabels(
  reportConfig: Pick<
    ReportConfig,
    | 'report_template'
    | 'show_overall_classification'
    | 'show_dimension_scores'
    | 'show_trait_scores'
    | 'show_interpretation_text'
    | 'show_recommendations'
    | 'pdf_hidden_sections'
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
    | 'dimensionProfiles'
    | 'traitProfiles'
    | 'profileStatus'
    | 'traitScores'
    | 'interpretations'
    | 'recommendations'
    | 'hasPsychometricData'
    | 'reportConfig'
  >
): AssessmentReportSectionAvailability {
  const hasPercentiles = report.traitScores.some((trait) => typeof trait.percentile === 'number')
  const isStenTemplate = report.reportConfig.report_template === 'sten_profile'
  const showsDimensionProfiles =
    report.reportConfig.profile_card_scope === 'dimension'
    || report.reportConfig.profile_card_scope === 'both'
  const showsTraitProfiles =
    report.reportConfig.profile_card_scope === 'trait'
    || report.reportConfig.profile_card_scope === 'both'

  return {
    overall_profile: Boolean(report.classification.label?.trim()),
    competency_cards: isStenTemplate
      ? showsDimensionProfiles
        && (report.dimensionProfiles.length > 0 || report.profileStatus.dimension === 'hidden_until_norms')
      : report.dimensions.length > 0,
    percentile_benchmark: isStenTemplate
      ? showsTraitProfiles
        && (report.traitProfiles.length > 0 || report.profileStatus.trait === 'hidden_until_norms')
      : report.reportConfig.scoring_display_mode !== 'raw'
        && report.hasPsychometricData
        && hasPercentiles,
    narrative_insights: report.hasPsychometricData && report.interpretations.length > 0,
    development_recommendations: report.recommendations.length > 0,
  }
}
