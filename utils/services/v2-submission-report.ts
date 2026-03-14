import { createAdminClient } from '@/utils/supabase/admin'
import {
  buildV2SubmissionArtifacts,
  type V2SubmissionReportData,
  type V2SubmissionRuntimeMetadata,
  type V2SubmissionScoringResult,
} from '@/utils/assessments/v2-runtime'
import { getAssessmentV2Runtime } from '@/utils/services/assessment-runtime-v2'
import { normalizeV2AssessmentReportRecord } from '@/utils/reports/v2-assessment-reports'
import { normalizeV2ReportTemplate } from '@/utils/assessments/v2-report-template'
import { getBaseReportFor, resolveV2ReportTemplate } from '@/utils/reports/v2-report-inheritance'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

type SubmissionRow = {
  id: string
  assessment_id: string
  first_name: string | null
  last_name: string | null
  organisation: string | null
  role: string | null
  responses: Record<string, number> | null
  scores: Record<string, number> | null
  bands: Record<string, string> | null
  classification: { key?: string; label?: string; description?: string } | null
  recommendations: unknown[] | null
  v2_runtime_metadata?: V2SubmissionRuntimeMetadata | null
  v2_submission_result?: V2SubmissionScoringResult | null
  v2_report_context?: V2SubmissionReportData | null
}

function isMissingColumn(
  error: { message?: string; details?: string | null; hint?: string | null } | null | undefined,
  column: string
) {
  const text = [error?.message, error?.details, error?.hint].filter(Boolean).join(' ').toLowerCase()
  return text.includes(column) && (text.includes('column') || text.includes('schema'))
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeStoredReportContext(value: unknown): V2SubmissionReportData | null {
  if (!isObject(value)) return null
  const dimensionScores = Array.isArray(value.dimension_scores) ? value.dimension_scores : []
  const competencyScores = Array.isArray(value.competency_scores) ? value.competency_scores : []
  const traitScores = Array.isArray(value.trait_scores) ? value.trait_scores : []
  const interpretations = Array.isArray(value.interpretations) ? value.interpretations : []
  const recommendations = Array.isArray(value.recommendations) ? value.recommendations : []

  return {
    personName: typeof value.personName === 'string' ? value.personName : '',
    role: typeof value.role === 'string' ? value.role : '',
    organisation: typeof value.organisation === 'string' ? value.organisation : '',
    classification:
      isObject(value.classification)
      && typeof value.classification.key === 'string'
      && typeof value.classification.label === 'string'
      && typeof value.classification.description === 'string'
        ? {
            key: value.classification.key,
            label: value.classification.label,
            description: value.classification.description,
          }
        : null,
    dimension_scores: dimensionScores.map((item) => ({
      key: isObject(item) && typeof item.key === 'string' ? item.key : '',
      label: isObject(item) && typeof item.label === 'string' ? item.label : '',
      value: isObject(item) && typeof item.value === 'number' ? item.value : 0,
      band: isObject(item) && typeof item.band === 'string' ? item.band : '',
    })),
    competency_scores: competencyScores.map((item) => ({
      key: isObject(item) && typeof item.key === 'string' ? item.key : '',
      label: isObject(item) && typeof item.label === 'string' ? item.label : '',
      value: isObject(item) && typeof item.value === 'number' ? item.value : 0,
      band: isObject(item) && typeof item.band === 'string' ? item.band : '',
    })),
    trait_scores: traitScores.map((item) => ({
      key: isObject(item) && typeof item.key === 'string' ? item.key : '',
      label: isObject(item) && typeof item.label === 'string' ? item.label : '',
      value: isObject(item) && typeof item.value === 'number' ? item.value : 0,
      band: isObject(item) && typeof item.band === 'string' ? item.band : '',
    })),
    interpretations: interpretations.map((item) => ({
      key: isObject(item) && typeof item.key === 'string' ? item.key : '',
      label: isObject(item) && typeof item.label === 'string' ? item.label : '',
      description: isObject(item) && typeof item.description === 'string' ? item.description : '',
    })),
    recommendations: recommendations.map((item, index) => ({
      key: isObject(item) && typeof item.key === 'string' ? item.key : `recommendation_${index + 1}`,
      label: isObject(item) && typeof item.label === 'string' ? item.label : `Recommendation ${index + 1}`,
      description: isObject(item) && typeof item.description === 'string' ? item.description : '',
    })),
    static_content: typeof value.static_content === 'string' ? value.static_content : '',
  }
}

export async function getV2SubmissionReport(input: {
  adminClient?: AdminClient | null
  submissionId: string
  reportId?: string | null
}) {
  const adminClient = input.adminClient ?? createAdminClient()
  if (!adminClient) {
    return { ok: false as const, error: 'missing_service_role' as const }
  }

  const primary = await adminClient
    .from('assessment_submissions')
    .select('id, assessment_id, first_name, last_name, organisation, role, responses, scores, bands, classification, recommendations, v2_runtime_metadata, v2_submission_result, v2_report_context')
    .eq('id', input.submissionId)
    .maybeSingle()

  const missingArtifactColumns =
    isMissingColumn(primary.error, 'v2_runtime_metadata')
    || isMissingColumn(primary.error, 'v2_submission_result')
    || isMissingColumn(primary.error, 'v2_report_context')

  const fallback = missingArtifactColumns
    ? await adminClient
      .from('assessment_submissions')
      .select('id, assessment_id, first_name, last_name, organisation, role, responses, scores, bands, classification, recommendations')
      .eq('id', input.submissionId)
      .maybeSingle()
    : null

  const submissionRow = primary.data ?? fallback?.data ?? null
  const submissionError = primary.error && !missingArtifactColumns ? primary.error : fallback?.error ?? null

  if (submissionError || !submissionRow) {
    return { ok: false as const, error: 'submission_not_found' as const }
  }

  const submission = submissionRow as SubmissionRow
  const runtime = await getAssessmentV2Runtime({
    adminClient,
    assessmentId: submission.assessment_id,
  })
  if (!runtime.ok) {
    return { ok: false as const, error: 'assessment_not_found' as const }
  }

  const { data: reportRows } = await adminClient
    .from('v2_assessment_reports')
    .select('id, assessment_id, name, report_kind, audience_role, base_report_id, override_definition, status, is_default, sort_order, template_definition, created_at, updated_at')
    .eq('assessment_id', submission.assessment_id)
    .order('sort_order')

  const reports = (reportRows ?? []).map((row) => normalizeV2AssessmentReportRecord(row))
  const requestedReportId = input.reportId?.trim() || null
  const report = requestedReportId
    ? reports.find((item) => item.id === requestedReportId)
    : reports.find((item) => item.reportKind === 'audience' && item.status === 'published' && item.isDefault)
      ?? reports.find((item) => item.reportKind === 'audience' && item.status === 'published')
      ?? reports[0]

  if (!report) {
    return { ok: false as const, error: 'report_not_found' as const }
  }

  const storedReportData = normalizeStoredReportContext(submission.v2_report_context)
  const artifacts = storedReportData
    ? null
    : buildV2SubmissionArtifacts({
        questionBank: runtime.data.definition.questionBank,
        scoringConfig: runtime.data.definition.scoringConfig,
        responses: submission.responses ?? {},
        participant: {
          firstName: submission.first_name,
          lastName: submission.last_name,
          organisation: submission.organisation,
          role: submission.role,
        },
        metadata: {
          assessmentVersion: runtime.data.definition.assessment.version,
          deliveryMode: submission.v2_runtime_metadata?.deliveryMode ?? 'live',
          runtimeSchemaVersion: submission.v2_runtime_metadata?.runtimeSchemaVersion ?? 1,
          scoredAt: submission.v2_runtime_metadata?.scoredAt,
        },
      })
  const reportData = storedReportData ?? artifacts?.reportContext

  if (!reportData) {
    return { ok: false as const, error: 'report_not_found' as const }
  }

  return {
    ok: true as const,
    data: {
      report,
      template: normalizeV2ReportTemplate(resolveV2ReportTemplate({
        report,
        baseReport: getBaseReportFor({ report, reports }),
      })),
      context: {
        assessmentId: submission.assessment_id,
        submissionId: submission.id,
        scoringConfig: runtime.data.definition.scoringConfig,
        v2Report: reportData,
      },
      participantName: reportData.personName,
    },
  }
}
