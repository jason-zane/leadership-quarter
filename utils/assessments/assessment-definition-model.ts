import {
  normalizeReportConfig,
  normalizeRunnerConfig,
  type ReportConfig,
  type RunnerConfig,
} from '@/utils/assessments/experience-config'
import {
  normalizePsychometricsConfig,
  type PsychometricsConfig,
} from '@/utils/assessments/assessment-psychometrics'
import {
  normalizeQuestionBank,
  type QuestionBank,
} from '@/utils/assessments/assessment-question-bank'
import {
  normalizeScoringConfig,
  type ScoringConfig,
} from '@/utils/assessments/assessment-scoring'
import type { AssessmentReportRecord } from '@/utils/reports/assessment-report-records'

export type AssessmentDefinition = {
  assessment: {
    id: string
    key: string
    name: string
    description: string | null
    status: string
    version: number
    runnerConfigSource: unknown
    runnerConfig: RunnerConfig
    reportConfig: ReportConfig
  }
  questionBank: QuestionBank
  scoringConfig: ScoringConfig
  psychometricsConfig: PsychometricsConfig
  reports: AssessmentReportRecord[]
}

export type DefinitionValidationIssue = {
  key: string
  severity: 'error' | 'warning'
  message: string
}

export type DefinitionValidation = {
  issues: DefinitionValidationIssue[]
  authoringValid: boolean
  previewValid: boolean
  cutoverValid: boolean
}

export function createAssessmentDefinition(input: {
  assessment: {
    id: string
    key: string
    name: string
    description?: string | null
    status: string
    version: number
    runner_config?: unknown
    report_config?: unknown
  }
  questionBank: unknown
  scoringConfig: unknown
  psychometricsConfig: unknown
  reports: AssessmentReportRecord[]
}): AssessmentDefinition {
  return {
    assessment: {
      id: input.assessment.id,
      key: input.assessment.key,
      name: input.assessment.name,
      description: input.assessment.description ?? null,
      status: input.assessment.status,
      version: input.assessment.version,
      runnerConfigSource: input.assessment.runner_config ?? null,
      runnerConfig: normalizeRunnerConfig(input.assessment.runner_config),
      reportConfig: normalizeReportConfig(input.assessment.report_config),
    },
    questionBank: normalizeQuestionBank(input.questionBank),
    scoringConfig: normalizeScoringConfig(input.scoringConfig),
    psychometricsConfig: normalizePsychometricsConfig(input.psychometricsConfig),
    reports: input.reports,
  }
}

export function validateAssessmentDefinition(definition: AssessmentDefinition): DefinitionValidation {
  const issues: DefinitionValidationIssue[] = []

  if (definition.questionBank.scoredItems.length === 0) {
    issues.push({
      key: 'question_bank_missing_items',
      severity: 'error',
      message: 'Add at least one scored item to the V2 question bank.',
    })
  }

  if (definition.questionBank.traits.length === 0) {
    issues.push({
      key: 'question_bank_missing_traits',
      severity: 'error',
      message: 'Add at least one trait before the V2 engine can score responses.',
    })
  }

  const traitKeys = new Set(definition.questionBank.traits.map((trait) => trait.key))
  for (const item of definition.questionBank.scoredItems) {
    if (!traitKeys.has(item.traitKey)) {
      issues.push({
        key: `unknown_trait_${item.key}`,
        severity: 'error',
        message: `Scored item "${item.key}" points to missing trait "${item.traitKey}".`,
      })
    }
  }

  for (const trait of definition.questionBank.traits) {
    const hasBanding = definition.scoringConfig.bandings.some(
      (banding) => banding.level === 'trait' && banding.targetKey === trait.key && banding.bands.length > 0
    )
    if (!hasBanding) {
      issues.push({
        key: `trait_banding_${trait.key}`,
        severity: 'warning',
        message: `Trait "${trait.key}" has no scoring bands yet.`,
      })
    }
  }

  if (definition.scoringConfig.bandings.length === 0) {
    issues.push({
      key: 'scoring_missing_bandings',
      severity: 'error',
      message: 'Configure at least one scoring band set for the V2 engine.',
    })
  }

  if (!definition.assessment.reportConfig.v2_runtime_enabled) {
    issues.push({
      key: 'runtime_disabled',
      severity: 'warning',
      message: 'V2 runtime preview is still disabled in the assessment experience settings.',
    })
  }

  if (!definition.reports.some((report) => report.reportKind === 'audience' && report.status === 'published')) {
    issues.push({
      key: 'published_report_missing',
      severity: 'error',
      message: 'Publish at least one V2 report before cutover.',
    })
  }

  if (
    definition.psychometricsConfig.referenceGroups.length === 0
    && definition.psychometricsConfig.validationRuns.length === 0
  ) {
    issues.push({
      key: 'psychometrics_unvalidated',
      severity: 'warning',
      message: 'No reference groups or validation runs are configured for the V2 engine yet.',
    })
  }

  const authoringValid = !issues.some((issue) =>
    issue.severity === 'error' && issue.key !== 'published_report_missing'
  )
  const previewValid = authoringValid && definition.assessment.reportConfig.v2_runtime_enabled
  const cutoverValid = previewValid && !issues.some((issue) => issue.severity === 'error')

  return {
    issues,
    authoringValid,
    previewValid,
    cutoverValid,
  }
}
