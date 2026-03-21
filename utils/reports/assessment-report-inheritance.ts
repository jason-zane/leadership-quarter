import {
  normalizeReportTemplate,
  type ReportTemplateDefinition,
} from '@/utils/assessments/assessment-report-template'
import {
  normalizeAssessmentReportRecord,
  type AssessmentReportOverrideDefinition,
  type AssessmentReportRecord,
} from '@/utils/reports/assessment-report-records'
import {
  ensureTemplateHasComposition,
} from '@/utils/reports/assessment-report-composer'

function normalizeTemplate(value: unknown) {
  return ensureTemplateHasComposition(normalizeReportTemplate(value))
}

export function hasReportOverrides(report: Pick<AssessmentReportRecord, 'overrideDefinition'>) {
  return Boolean(report.overrideDefinition.templateDefinition)
}

export function createReportOverrideDefinition(
  templateDefinition: ReportTemplateDefinition | null | undefined
): AssessmentReportOverrideDefinition {
  return {
    templateDefinition: templateDefinition ? normalizeTemplate(templateDefinition) : null,
  }
}

export function resolveReportTemplate(input: {
  report: AssessmentReportRecord
  baseReport?: AssessmentReportRecord | null
}) {
  const { report, baseReport } = input
  if (report.reportKind === 'base') {
    return normalizeTemplate(report.templateDefinition)
  }

  if (report.overrideDefinition.templateDefinition) {
    return normalizeTemplate(report.overrideDefinition.templateDefinition)
  }

  if (baseReport) {
    return normalizeTemplate(baseReport.templateDefinition)
  }

  return normalizeTemplate(report.templateDefinition)
}

export function resolveReportRecord(input: {
  report: AssessmentReportRecord
  baseReport?: AssessmentReportRecord | null
}) {
  return normalizeAssessmentReportRecord({
    ...input.report,
    templateDefinition: resolveReportTemplate(input),
  }, input.report)
}

export function getBaseReportFor(input: {
  report: Pick<AssessmentReportRecord, 'reportKind' | 'id' | 'baseReportId'>
  reports: AssessmentReportRecord[]
}) {
  if (input.report.reportKind === 'base') return null

  if (input.report.baseReportId) {
    return input.reports.find((candidate) => candidate.id === input.report.baseReportId) ?? null
  }

  return input.reports.find((candidate) => candidate.reportKind === 'base') ?? null
}
