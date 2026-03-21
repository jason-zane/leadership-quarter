import {
  normalizeV2ReportTemplate,
  type V2ReportTemplateDefinition,
} from '@/utils/assessments/assessment-report-template'
import {
  normalizeV2AssessmentReportRecord,
  type V2AssessmentReportOverrideDefinition,
  type V2AssessmentReportRecord,
} from '@/utils/reports/assessment-report-records'
import {
  ensureV2TemplateHasComposition,
} from '@/utils/reports/assessment-report-composer'

function normalizeTemplate(value: unknown) {
  return ensureV2TemplateHasComposition(normalizeV2ReportTemplate(value))
}

export function hasV2ReportOverrides(report: Pick<V2AssessmentReportRecord, 'overrideDefinition'>) {
  return Boolean(report.overrideDefinition.templateDefinition)
}

export function createV2ReportOverrideDefinition(
  templateDefinition: V2ReportTemplateDefinition | null | undefined
): V2AssessmentReportOverrideDefinition {
  return {
    templateDefinition: templateDefinition ? normalizeTemplate(templateDefinition) : null,
  }
}

export function resolveV2ReportTemplate(input: {
  report: V2AssessmentReportRecord
  baseReport?: V2AssessmentReportRecord | null
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

export function resolveV2ReportRecord(input: {
  report: V2AssessmentReportRecord
  baseReport?: V2AssessmentReportRecord | null
}) {
  return normalizeV2AssessmentReportRecord({
    ...input.report,
    templateDefinition: resolveV2ReportTemplate(input),
  }, input.report)
}

export function getBaseReportFor(input: {
  report: Pick<V2AssessmentReportRecord, 'reportKind' | 'id' | 'baseReportId'>
  reports: V2AssessmentReportRecord[]
}) {
  if (input.report.reportKind === 'base') return null

  if (input.report.baseReportId) {
    return input.reports.find((candidate) => candidate.id === input.report.baseReportId) ?? null
  }

  return input.reports.find((candidate) => candidate.reportKind === 'base') ?? null
}
