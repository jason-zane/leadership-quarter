import { lq8Applications, lq8Competencies, lq8Quadrants } from '@/utils/brand/lq8-content'
import { createAdminClient } from '@/utils/supabase/admin'
import {
  getAssessmentReportData,
  getAssessmentReportFilename,
} from '@/utils/reports/assessment-report'
import {
  aiCapabilityCompetencyChapters,
  aiCapabilityDeploymentLevels,
  aiCapabilityInterdependencePatterns,
  aiCapabilityStructuralModel,
} from '@/utils/reports/ai-capability-model-content'
import {
  getAiOrientationSurveyReportData,
  getAiOrientationSurveyReportFilename,
  mapAssessmentToAiOrientationSurveyReport,
} from '@/utils/reports/ai-orientation-report'
import type { AssessmentReportData } from '@/utils/reports/assessment-report'
import type { ReportAccessKind } from '@/utils/security/report-access'
import { verifyReportAccessToken } from '@/utils/security/report-access'
import type {
  AiCapabilityReportDocument,
  AiOrientationSurveyReportDocument,
  AssessmentReportDocument,
  Lq8ReportDocument,
  ReportDocument,
  ReportDocumentType,
} from '@/utils/reports/report-document-types'

export type AssembleReportDocumentResult =
  | { ok: true; data: ReportDocument }
  | { ok: false; error: 'invalid_access' | 'missing_service_role' | 'report_not_found' }

export function toReportAccessKind(reportType: ReportDocumentType): ReportAccessKind {
  if (reportType === 'assessment') return 'assessment'
  if (reportType === 'ai_survey') return 'ai_survey'
  if (reportType === 'ai') return 'ai'
  return 'lq8'
}

export function resolveReportAccessPayload(input: {
  reportType: ReportDocumentType
  accessToken: string
}) {
  return input.accessToken
    ? verifyReportAccessToken(input.accessToken, toReportAccessKind(input.reportType))
    : null
}

function getStaticReportFilename(reportType: Extract<ReportDocumentType, 'lq8' | 'ai'>) {
  return reportType === 'lq8' ? 'lq8-leadership-report.pdf' : 'ai-capability-model-report.pdf'
}

export async function assembleReportDocument(input: {
  reportType: ReportDocumentType
  accessToken: string
}): Promise<AssembleReportDocumentResult> {
  const payload = resolveReportAccessPayload(input)

  if (!payload) {
    return { ok: false, error: 'invalid_access' }
  }

  if (input.reportType === 'lq8') {
    const data: Lq8ReportDocument = {
      kind: 'lq8',
      templateVersion: 'v1',
      filename: getStaticReportFilename('lq8'),
      quadrants: lq8Quadrants,
      competencies: lq8Competencies,
      applications: lq8Applications,
    }
    return { ok: true, data }
  }

  if (input.reportType === 'ai') {
    const data: AiCapabilityReportDocument = {
      kind: 'ai',
      templateVersion: 'v1',
      filename: getStaticReportFilename('ai'),
      competencyChapters: aiCapabilityCompetencyChapters,
      structuralModel: aiCapabilityStructuralModel,
      interdependencePatterns: aiCapabilityInterdependencePatterns,
      deploymentLevels: aiCapabilityDeploymentLevels,
    }
    return { ok: true, data }
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return { ok: false, error: 'missing_service_role' }
  }

  if (input.reportType === 'assessment') {
    const rawReport = await getAssessmentReportData(adminClient, payload.submissionId)
    if (!rawReport) {
      return { ok: false, error: 'report_not_found' }
    }

    // Apply title/subtitle fallback chain: campaign → assessment → reportConfig
    const resolvedTitle =
      rawReport.campaign?.externalName?.trim() ||
      rawReport.assessment.name ||
      rawReport.reportConfig.title
    const resolvedSubtitle =
      rawReport.campaign?.description?.trim() ||
      rawReport.assessment.description?.trim() ||
      rawReport.reportConfig.subtitle
    const report: AssessmentReportData = {
      ...rawReport,
      reportConfig: {
        ...rawReport.reportConfig,
        title: resolvedTitle,
        subtitle: resolvedSubtitle,
      },
    }

    const aiOrientationReport = mapAssessmentToAiOrientationSurveyReport(report)
    if (aiOrientationReport) {
      const data: AiOrientationSurveyReportDocument = {
        kind: 'ai_survey',
        templateVersion: 'v1',
        filename: getAiOrientationSurveyReportFilename(aiOrientationReport),
        report: aiOrientationReport,
      }
      return { ok: true, data }
    }

    const data: AssessmentReportDocument = {
      kind: 'assessment',
      templateVersion: 'v1',
      filename: getAssessmentReportFilename(report),
      report,
    }
    return { ok: true, data }
  }

  const report = await getAiOrientationSurveyReportData(adminClient, payload.submissionId)
  if (!report) {
    return { ok: false, error: 'report_not_found' }
  }

  const data: AiOrientationSurveyReportDocument = {
    kind: 'ai_survey',
    templateVersion: 'v1',
    filename: getAiOrientationSurveyReportFilename(report),
    report,
  }
  return { ok: true, data }
}
