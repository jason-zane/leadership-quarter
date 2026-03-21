import { lq8Applications, lq8Competencies, lq8Quadrants } from '@/utils/brand/lq8-content'
import { createAdminClient } from '@/utils/supabase/admin'
import {
  aiCapabilityCompetencyChapters,
  aiCapabilityDeploymentLevels,
  aiCapabilityInterdependencePatterns,
  aiCapabilityStructuralModel,
} from '@/utils/reports/ai-capability-model-content'
import {
  getAiOrientationSurveyReportData,
  getAiOrientationSurveyReportFilename,
} from '@/utils/reports/ai-orientation-report'
import type { ReportAccessKind } from '@/utils/security/report-access'
import { verifyReportAccessToken } from '@/utils/security/report-access'
import { getV2SubmissionReport } from '@/utils/services/v2-submission-report'
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

function toAssessmentFilename(participantName: string) {
  const slug = participantName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${slug || 'assessment'}-report.pdf`
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
    const resolved = await getV2SubmissionReport({
      adminClient,
      submissionId: payload.submissionId,
      reportId: payload.reportVariantId,
    })

    if (!resolved.ok) {
      return { ok: false, error: 'report_not_found' }
    }

    const data: AssessmentReportDocument = {
      kind: 'assessment',
      templateVersion: 'v2',
      filename: toAssessmentFilename(resolved.data.participantName),
      template: resolved.data.template,
      context: resolved.data.context,
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
