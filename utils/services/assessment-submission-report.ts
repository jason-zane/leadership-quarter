import { createAdminClient } from '@/utils/supabase/admin'
import {
  buildV2SubmissionArtifacts,
  type V2SubmissionReportData,
  type V2SubmissionReportScoreItem,
  type V2SubmissionRuntimeMetadata,
  type V2SubmissionScoringResult,
} from '@/utils/assessments/assessment-runtime-model'
import { getAssessmentRuntime } from '@/utils/services/assessment-runtime'
import { normalizeAssessmentReportRecord } from '@/utils/reports/assessment-report-records'
import { normalizeReportTemplate } from '@/utils/assessments/assessment-report-template'
import { getBaseReportFor, resolveReportTemplate } from '@/utils/reports/assessment-report-inheritance'
import {
  emptyBrandingConfig,
  normalizeOrgBrandingConfig,
  buildBrandCssOverrides,
} from '@/utils/brand/org-brand-utils'
import type { ReportMeta } from '@/utils/reports/assessment-report-block-data'
import { normalizeQuestionBank } from '@/utils/assessments/assessment-question-bank'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

type SubmissionRow = {
  id: string
  assessment_id: string
  first_name: string | null
  last_name: string | null
  email: string | null
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
  created_at?: string | null
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
  const personName = typeof value.personName === 'string' ? value.personName : ''
  const role = typeof value.role === 'string' ? value.role : ''
  const organisation = typeof value.organisation === 'string' ? value.organisation : ''
  const staticContent = typeof value.static_content === 'string' ? value.static_content : ''
  const classification =
    isObject(value.classification)
    && typeof value.classification.key === 'string'
    && typeof value.classification.label === 'string'
    && typeof value.classification.description === 'string'
      ? {
          key: value.classification.key,
          label: value.classification.label,
          description: value.classification.description,
        }
      : null

  const hasUsefulPayload = Boolean(
    personName
    || role
    || organisation
    || staticContent
    || classification
    || dimensionScores.length
    || competencyScores.length
    || traitScores.length
    || interpretations.length
    || recommendations.length
  )

  if (!hasUsefulPayload) {
    return null
  }

  const normalizeScoreRows = (rows: unknown[]): V2SubmissionReportScoreItem[] => rows.map((item) => ({
    key: isObject(item) && typeof item.key === 'string' ? item.key : '',
    label: isObject(item) && typeof item.label === 'string' ? item.label : '',
    value: isObject(item) && typeof item.value === 'number' ? item.value : 0,
    raw_value: isObject(item) && typeof item.raw_value === 'number'
      ? item.raw_value
      : (isObject(item) && typeof item.value === 'number' ? item.value : 0),
    display_value: isObject(item) && typeof item.display_value === 'number'
      ? item.display_value
      : (isObject(item) && typeof item.value === 'number' ? item.value : 0),
    display_min: isObject(item) && typeof item.display_min === 'number' ? item.display_min : 0,
    display_max: isObject(item) && typeof item.display_max === 'number' ? item.display_max : 100,
    band: isObject(item) && typeof item.band === 'string' ? item.band : '',
    band_key: isObject(item) && typeof item.band_key === 'string' ? item.band_key : '',
    sten_value: isObject(item) && typeof item.sten_value === 'number' ? item.sten_value : null,
    percentile_value: isObject(item) && typeof item.percentile_value === 'number' ? item.percentile_value : null,
  }))

  return {
    personName,
    role,
    organisation,
    classification,
    dimension_scores: normalizeScoreRows(dimensionScores),
    competency_scores: normalizeScoreRows(competencyScores),
    trait_scores: normalizeScoreRows(traitScores),
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
    static_content: staticContent,
  }
}

export async function getSubmissionReportData(input: {
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
    .select('id, assessment_id, first_name, last_name, email, organisation, role, responses, scores, bands, classification, recommendations, v2_runtime_metadata, v2_submission_result, v2_report_context, created_at')
    .eq('id', input.submissionId)
    .maybeSingle()

  const missingArtifactColumns =
    isMissingColumn(primary.error, 'v2_runtime_metadata')
    || isMissingColumn(primary.error, 'v2_submission_result')
    || isMissingColumn(primary.error, 'v2_report_context')

  const fallback = missingArtifactColumns
    ? await adminClient
      .from('assessment_submissions')
      .select('id, assessment_id, first_name, last_name, email, organisation, role, responses, scores, bands, classification, recommendations, created_at')
      .eq('id', input.submissionId)
      .maybeSingle()
    : null

  const submissionRow = primary.data ?? fallback?.data ?? null
  const submissionError = primary.error && !missingArtifactColumns ? primary.error : fallback?.error ?? null

  if (submissionError || !submissionRow) {
    return { ok: false as const, error: 'submission_not_found' as const }
  }

  const submission = submissionRow as SubmissionRow
  const runtime = await getAssessmentRuntime({
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

  const reports = (reportRows ?? []).map((row) => normalizeAssessmentReportRecord(row))
  const requestedReportId = input.reportId?.trim() || null
  const report = requestedReportId
    ? reports.find((item) => item.id === requestedReportId)
    : reports.find((item) => item.reportKind === 'audience' && item.status === 'published' && item.isDefault)
      ?? reports.find((item) => item.reportKind === 'audience' && item.status === 'published')
      ?? reports[0]

  if (!report) {
    return { ok: false as const, error: 'report_not_found' as const }
  }

  const resolvedTemplate = normalizeReportTemplate(resolveReportTemplate({
    report,
    baseReport: getBaseReportFor({ report, reports }),
  }))

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

  // Resolve org branding via campaign_assessments → campaigns → organisations
  let reportMeta: ReportMeta | undefined
  try {
    const { data: caRow } = await adminClient
      .from('campaign_assessments')
      .select('campaigns(organisations(name, branding_config))')
      .eq('assessment_id', submission.assessment_id)
      .limit(1)
      .maybeSingle()

    const org = (caRow as { campaigns?: { organisations?: { name?: string; branding_config?: unknown } | null } | null } | null)
      ?.campaigns?.organisations ?? null
    const orgBranding = normalizeOrgBrandingConfig(org?.branding_config ?? null)
    const templateBranding = resolvedTemplate.global.branding ?? { mode: 'inherit_org' as const }
    const baseBranding =
      templateBranding.mode === 'force_lq'
        ? emptyBrandingConfig()
        : orgBranding
    const resolvedBranding = templateBranding.mode === 'custom_override'
      ? {
          ...baseBranding,
          branding_enabled:
            baseBranding.branding_enabled
            || Boolean(
              templateBranding.logo_url
              || templateBranding.company_name
              || templateBranding.primary_color
              || templateBranding.secondary_color
            ),
          logo_url: templateBranding.logo_url ?? baseBranding.logo_url,
          company_name: templateBranding.company_name ?? baseBranding.company_name,
          primary_color: templateBranding.primary_color ?? baseBranding.primary_color,
          secondary_color: templateBranding.secondary_color ?? baseBranding.secondary_color,
          show_lq_attribution: templateBranding.show_lq_attribution ?? baseBranding.show_lq_attribution,
        }
      : baseBranding
    const useCustomBranding = templateBranding.mode !== 'force_lq' && resolvedBranding.branding_enabled
    const cssOverrides = useCustomBranding ? buildBrandCssOverrides(resolvedBranding) : ''

    reportMeta = {
      title: resolvedTemplate.name.trim() || report.name || 'Assessment report',
      subtitle: resolvedTemplate.description?.trim() || '',
      participantName: reportData.personName || '',
      recipientEmail: submission.email ?? null,
      completedAt: submission.created_at ?? null,
      orgLogoUrl: useCustomBranding ? (resolvedBranding.logo_url ?? null) : null,
      orgName: useCustomBranding
        ? (resolvedBranding.company_name ?? (org?.name as string | undefined) ?? null)
        : null,
      brandingCssOverrides: cssOverrides,
      showLqAttribution: useCustomBranding && resolvedBranding.show_lq_attribution !== false,
    }
  } catch {
    // Non-fatal — report still works without org branding
  }

  return {
    ok: true as const,
    data: {
      report,
      template: resolvedTemplate,
      context: {
        assessmentId: submission.assessment_id,
        submissionId: submission.id,
        scoringConfig: runtime.data.definition.scoringConfig,
        questionBank: normalizeQuestionBank(runtime.data.definition.questionBank),
        v2Report: reportData,
        reportMeta,
      },
      participantName: reportData.personName,
    },
  }
}
