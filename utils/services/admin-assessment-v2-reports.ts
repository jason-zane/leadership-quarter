import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import { normalizeV2ReportTemplate } from '@/utils/assessments/v2-report-template'
import {
  createDefaultV2AssessmentReport,
  normalizeV2AssessmentReportRecord,
  type V2AssessmentReportKind,
  type V2AssessmentReportRecord,
  type V2AssessmentReportStatus,
  type V2ReportAudienceRole,
} from '@/utils/reports/v2-assessment-reports'
import { createDemoV2ReportBlocks } from '@/utils/reports/v2-report-builder-defaults'
import {
  createDefaultV2ReportComposition,
  ensureV2TemplateHasComposition,
} from '@/utils/reports/v2-report-composer'
import {
  createV2ReportOverrideDefinition,
  getBaseReportFor,
  hasV2ReportOverrides,
  resolveV2ReportRecord,
  resolveV2ReportTemplate,
} from '@/utils/reports/v2-report-inheritance'
import { getV2SubmissionReport } from '@/utils/services/v2-submission-report'

type AdminClient = RouteAuthSuccess['adminClient']

type ServiceSuccess<T> = { ok: true; data: T }
type ServiceError = { ok: false; error: string }
type ServiceResult<T> = ServiceSuccess<T> | ServiceError

type V2AssessmentReportRow = {
  id: string
  assessment_id: string
  name: string
  report_kind: V2AssessmentReportKind
  audience_role: V2ReportAudienceRole
  base_report_id: string | null
  override_definition: unknown
  status: V2AssessmentReportStatus
  is_default: boolean
  sort_order: number
  template_definition: unknown
  created_at: string
  updated_at: string
}

export type V2ReportPreviewSubmissionRow = {
  id: string
  participantName: string
  email: string | null
  organisation: string | null
  role: string | null
  submittedAt: string
}

function isSchemaError(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes('column') || normalized.includes('schema') || normalized.includes('does not exist')
}

function mapRow(row: V2AssessmentReportRow): V2AssessmentReportRecord {
  return normalizeV2AssessmentReportRecord(row)
}

function sortReports(reports: V2AssessmentReportRecord[]) {
  return [...reports].sort((left, right) => {
    if (left.reportKind !== right.reportKind) {
      return left.reportKind === 'base' ? -1 : 1
    }

    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder
    }

    return left.name.localeCompare(right.name)
  })
}

function resolveReports(reports: V2AssessmentReportRecord[]) {
  return sortReports(
    reports.map((report) =>
      resolveV2ReportRecord({
        report,
        baseReport: getBaseReportFor({ report, reports }),
      })
    )
  )
}

async function ensureLegacyTemplateSeed(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const { adminClient, assessmentId } = input

  const existing = await adminClient
    .from('v2_assessment_reports')
    .select('id', { head: true, count: 'exact' })
    .eq('assessment_id', assessmentId)

  if ((existing.count ?? 0) > 0) {
    return
  }

  const assessment = await adminClient
    .from('assessments')
    .select('id, v2_report_template')
    .eq('id', assessmentId)
    .maybeSingle()

  const legacyTemplate = assessment.data?.v2_report_template
  if (!legacyTemplate || typeof legacyTemplate !== 'object') {
    return
  }

  const seed = createDefaultV2AssessmentReport({
    assessmentId,
    name: 'Candidate report',
    audienceRole: 'candidate',
    reportKind: 'audience',
    status: 'draft',
    isDefault: false,
    sortOrder: 0,
    templateDefinition: legacyTemplate,
  })

  await adminClient.from('v2_assessment_reports').insert({
    assessment_id: seed.assessmentId,
    name: seed.name,
    report_kind: seed.reportKind,
    audience_role: seed.audienceRole,
    base_report_id: seed.baseReportId,
    override_definition: seed.overrideDefinition,
    status: seed.status,
    is_default: seed.isDefault,
    sort_order: seed.sortOrder,
    template_definition: seed.templateDefinition,
    updated_at: new Date().toISOString(),
  })
}

async function listRows(input: {
  adminClient: AdminClient
  assessmentId: string
}): Promise<ServiceResult<V2AssessmentReportRow[]>> {
  const { adminClient, assessmentId } = input

  const result = await adminClient
    .from('v2_assessment_reports')
    .select('id, assessment_id, name, report_kind, audience_role, base_report_id, override_definition, status, is_default, sort_order, template_definition, created_at, updated_at')
    .eq('assessment_id', assessmentId)
    .order('sort_order')
    .order('updated_at', { ascending: false })

  if (result.error) {
    return { ok: false, error: result.error.message }
  }

  return { ok: true, data: (result.data ?? []) as V2AssessmentReportRow[] }
}

async function getRow(input: {
  adminClient: AdminClient
  assessmentId: string
  reportId: string
}): Promise<ServiceResult<V2AssessmentReportRow>> {
  const result = await input.adminClient
    .from('v2_assessment_reports')
    .select('id, assessment_id, name, report_kind, audience_role, base_report_id, override_definition, status, is_default, sort_order, template_definition, created_at, updated_at')
    .eq('assessment_id', input.assessmentId)
    .eq('id', input.reportId)
    .maybeSingle()

  if (result.error) {
    return { ok: false, error: result.error.message }
  }

  if (!result.data) {
    return { ok: false, error: 'report_not_found' }
  }

  return { ok: true, data: result.data as V2AssessmentReportRow }
}

async function ensureBaseReport(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  const rows = await listRows(input)
  if (!rows.ok) {
    if (isSchemaError(rows.error)) {
      return { ok: false as const, error: rows.error }
    }
    return rows
  }

  const mapped = rows.data.map(mapRow)
  const existingBase = mapped.find((report) => report.reportKind === 'base')
  if (existingBase) {
    return { ok: true as const, data: { baseReport: existingBase } }
  }

  const seedTemplate = mapped[0]?.templateDefinition
    ?? ensureV2TemplateHasComposition({
      ...createDefaultV2AssessmentReport().templateDefinition,
      composition: createDefaultV2ReportComposition(),
      blocks: createDemoV2ReportBlocks(),
    })

  const insert = await input.adminClient
    .from('v2_assessment_reports')
    .insert({
      assessment_id: input.assessmentId,
      name: 'Base composition',
      report_kind: 'base',
      audience_role: 'base',
      base_report_id: null,
      override_definition: createV2ReportOverrideDefinition(null),
      status: 'draft',
      is_default: false,
      sort_order: -1,
      template_definition: seedTemplate,
      updated_at: new Date().toISOString(),
    })
    .select('id, assessment_id, name, report_kind, audience_role, base_report_id, override_definition, status, is_default, sort_order, template_definition, created_at, updated_at')
    .single()

  if (insert.error || !insert.data) {
    return { ok: false as const, error: insert.error?.message ?? 'base_report_create_failed' }
  }

  const baseReport = mapRow(insert.data as V2AssessmentReportRow)

  for (const row of mapped.filter((report) => report.reportKind !== 'base')) {
    await input.adminClient
      .from('v2_assessment_reports')
      .update({
        report_kind: 'audience',
        base_report_id: baseReport.id,
        override_definition: createV2ReportOverrideDefinition(row.templateDefinition),
        updated_at: new Date().toISOString(),
      })
      .eq('assessment_id', input.assessmentId)
      .eq('id', row.id)
  }

  return { ok: true as const, data: { baseReport } }
}

async function loadResolvedReports(input: {
  adminClient: AdminClient
  assessmentId: string
}) {
  await ensureLegacyTemplateSeed(input)
  const base = await ensureBaseReport(input)
  if (!base.ok) {
    return base
  }

  const rows = await listRows(input)
  if (!rows.ok) {
    return rows
  }

  const reports = resolveReports(rows.data.map(mapRow))
  return {
    ok: true as const,
    data: {
      reports,
      baseReport: reports.find((report) => report.reportKind === 'base') ?? null,
    },
  }
}

export async function listAdminAssessmentV2Reports(input: {
  adminClient: AdminClient
  assessmentId: string
}): Promise<ServiceResult<{ reports: V2AssessmentReportRecord[]; baseReport: V2AssessmentReportRecord | null }>> {
  const resolved = await loadResolvedReports(input)
  if (!resolved.ok) {
    if (isSchemaError(resolved.error)) {
      return { ok: true, data: { reports: [], baseReport: null } }
    }
    return resolved
  }

  return {
    ok: true,
    data: resolved.data,
  }
}

export async function getAdminAssessmentV2Report(input: {
  adminClient: AdminClient
  assessmentId: string
  reportId: string
}): Promise<ServiceResult<{ report: V2AssessmentReportRecord; baseReport: V2AssessmentReportRecord | null }>> {
  const resolved = await loadResolvedReports({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
  })
  if (!resolved.ok) {
    return resolved
  }

  const report = resolved.data.reports.find((candidate) => candidate.id === input.reportId)
  if (!report) {
    return { ok: false, error: 'report_not_found' }
  }

  return {
    ok: true,
    data: {
      report,
      baseReport: report.reportKind === 'base'
        ? report
        : resolved.data.baseReport,
    },
  }
}

export async function createAdminAssessmentV2Report(input: {
  adminClient: AdminClient
  assessmentId: string
  payload: {
    name?: string
    audienceRole?: V2ReportAudienceRole
  } | null
}): Promise<ServiceResult<{ report: V2AssessmentReportRecord }>> {
  const resolved = await loadResolvedReports({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
  })

  if (!resolved.ok) {
    return resolved
  }

  const baseReport = resolved.data.baseReport
  if (!baseReport) {
    return { ok: false, error: 'base_report_missing' }
  }

  const audienceReports = resolved.data.reports.filter((report) => report.reportKind === 'audience')
  const sortOrder = audienceReports.length > 0
    ? Math.max(...audienceReports.map((report) => report.sortOrder)) + 1
    : 0

  const draft = createDefaultV2AssessmentReport({
    assessmentId: input.assessmentId,
    name: input.payload?.name?.trim() || 'New report',
    reportKind: 'audience',
    audienceRole: input.payload?.audienceRole === 'base' ? 'candidate' : (input.payload?.audienceRole ?? 'candidate'),
    baseReportId: baseReport.id,
    overrideDefinition: createV2ReportOverrideDefinition(null),
    status: 'draft',
    isDefault: false,
    sortOrder,
    templateDefinition: baseReport.templateDefinition,
  })

  const result = await input.adminClient
    .from('v2_assessment_reports')
    .insert({
      assessment_id: draft.assessmentId,
      name: draft.name,
      report_kind: draft.reportKind,
      audience_role: draft.audienceRole,
      base_report_id: draft.baseReportId,
      override_definition: draft.overrideDefinition,
      status: draft.status,
      is_default: draft.isDefault,
      sort_order: draft.sortOrder,
      template_definition: draft.templateDefinition,
      updated_at: new Date().toISOString(),
    })
    .select('id, assessment_id, name, report_kind, audience_role, base_report_id, override_definition, status, is_default, sort_order, template_definition, created_at, updated_at')
    .single()

  if (result.error || !result.data) {
    return { ok: false, error: result.error?.message ?? 'report_create_failed' }
  }

  const created = mapRow(result.data as V2AssessmentReportRow)

  return {
    ok: true,
    data: {
      report: resolveV2ReportRecord({
        report: created,
        baseReport,
      }),
    },
  }
}

export async function updateAdminAssessmentV2Report(input: {
  adminClient: AdminClient
  assessmentId: string
  reportId: string
  payload: {
    name?: string
    audienceRole?: V2ReportAudienceRole
    status?: V2AssessmentReportStatus
    isDefault?: boolean
    templateDefinition?: unknown
    resetOverrides?: boolean
  } | null
}): Promise<ServiceResult<{ report: V2AssessmentReportRecord; baseReport: V2AssessmentReportRecord | null }>> {
  if (!input.payload) {
    return { ok: false, error: 'invalid_payload' }
  }

  const resolved = await loadResolvedReports({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
  })
  if (!resolved.ok) {
    return resolved
  }

  const existing = resolved.data.reports.find((report) => report.id === input.reportId)
  if (!existing) {
    return { ok: false, error: 'report_not_found' }
  }

  const baseReport = getBaseReportFor({ report: existing, reports: resolved.data.reports })
  const nextStatus = existing.reportKind === 'base'
    ? 'draft'
    : (input.payload.status ?? existing.status)
  const nextIsDefault =
    existing.reportKind === 'audience'
    && Boolean(input.payload.isDefault)
    && nextStatus === 'published'

  if (nextIsDefault) {
    await input.adminClient
      .from('v2_assessment_reports')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('assessment_id', input.assessmentId)
      .eq('report_kind', 'audience')
      .neq('id', input.reportId)
  }

  const providedTemplate = typeof input.payload.templateDefinition === 'undefined'
    ? null
    : normalizeV2ReportTemplate(input.payload.templateDefinition)
  const resetOverrides = input.payload.resetOverrides === true
  const nextOverrideDefinition =
    existing.reportKind === 'base'
      ? createV2ReportOverrideDefinition(null)
      : resetOverrides
        ? createV2ReportOverrideDefinition(null)
        : providedTemplate
          ? createV2ReportOverrideDefinition(providedTemplate)
          : existing.overrideDefinition
  const nextTemplate =
    existing.reportKind === 'base'
      ? (providedTemplate ?? existing.templateDefinition)
      : providedTemplate
        ? providedTemplate
        : resetOverrides
          ? resolveV2ReportTemplate({ report: existing, baseReport })
          : hasV2ReportOverrides(existing)
            ? (existing.overrideDefinition.templateDefinition ?? existing.templateDefinition)
            : existing.templateDefinition

  const result = await input.adminClient
    .from('v2_assessment_reports')
    .update({
      name: input.payload.name?.trim() || existing.name,
      report_kind: existing.reportKind,
      audience_role:
        existing.reportKind === 'base'
          ? 'base'
          : (input.payload.audienceRole === 'base' ? existing.audienceRole : (input.payload.audienceRole ?? existing.audienceRole)),
      base_report_id: existing.reportKind === 'base' ? null : (existing.baseReportId ?? baseReport?.id ?? null),
      override_definition: nextOverrideDefinition,
      status: nextStatus,
      is_default: nextIsDefault,
      template_definition: nextTemplate,
      updated_at: new Date().toISOString(),
    })
    .eq('assessment_id', input.assessmentId)
    .eq('id', input.reportId)
    .select('id, assessment_id, name, report_kind, audience_role, base_report_id, override_definition, status, is_default, sort_order, template_definition, created_at, updated_at')
    .single()

  if (result.error || !result.data) {
    return { ok: false, error: result.error?.message ?? 'report_update_failed' }
  }

  const updated = mapRow(result.data as V2AssessmentReportRow)

  return {
    ok: true,
    data: {
      report: resolveV2ReportRecord({
        report: updated,
        baseReport: existing.reportKind === 'base' ? updated : baseReport,
      }),
      baseReport: existing.reportKind === 'base' ? updated : baseReport,
    },
  }
}

export async function duplicateAdminAssessmentV2Report(input: {
  adminClient: AdminClient
  assessmentId: string
  reportId: string
}): Promise<ServiceResult<{ report: V2AssessmentReportRecord }>> {
  const resolved = await loadResolvedReports({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
  })
  if (!resolved.ok) {
    return resolved
  }

  const source = resolved.data.reports.find((report) => report.id === input.reportId)
  if (!source) {
    return { ok: false, error: 'report_not_found' }
  }

  const baseReport = getBaseReportFor({ report: source, reports: resolved.data.reports })
  const audienceReports = resolved.data.reports.filter((report) => report.reportKind === 'audience')
  const targetSortOrder = audienceReports.length > 0
    ? Math.max(...audienceReports.map((report) => report.sortOrder)) + 1
    : 0
  const resolvedTemplate = resolveV2ReportTemplate({ report: source, baseReport })

  const duplicate = await input.adminClient
    .from('v2_assessment_reports')
    .insert({
      assessment_id: input.assessmentId,
      name: `${source.name} copy`,
      report_kind: 'audience',
      audience_role: source.reportKind === 'base' ? 'candidate' : source.audienceRole,
      base_report_id: baseReport?.id ?? resolved.data.baseReport?.id ?? null,
      override_definition: createV2ReportOverrideDefinition(resolvedTemplate),
      status: 'draft',
      is_default: false,
      sort_order: targetSortOrder,
      template_definition: resolvedTemplate,
      updated_at: new Date().toISOString(),
    })
    .select('id, assessment_id, name, report_kind, audience_role, base_report_id, override_definition, status, is_default, sort_order, template_definition, created_at, updated_at')
    .single()

  if (duplicate.error || !duplicate.data) {
    return { ok: false, error: duplicate.error?.message ?? 'report_duplicate_failed' }
  }

  const duplicated = mapRow(duplicate.data as V2AssessmentReportRow)

  return {
    ok: true,
    data: {
      report: resolveV2ReportRecord({
        report: duplicated,
        baseReport: baseReport ?? resolved.data.baseReport,
      }),
    },
  }
}

export async function listAdminAssessmentV2ReportPreviewSubmissions(input: {
  adminClient: AdminClient
  assessmentId: string
  query?: string | null
}): Promise<ServiceResult<{ submissions: V2ReportPreviewSubmissionRow[] }>> {
  let query = input.adminClient
    .from('assessment_submissions')
    .select('id, first_name, last_name, email, organisation, role, created_at')
    .eq('assessment_id', input.assessmentId)
    .order('created_at', { ascending: false })
    .limit(50)

  const q = input.query?.trim()
  if (q) {
    query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,organisation.ilike.%${q}%`)
  }

  const result = await query

  if (result.error) {
    return { ok: false, error: result.error.message }
  }

  return {
    ok: true,
    data: {
      submissions: ((result.data ?? []) as Array<{
        id: string
        first_name: string | null
        last_name: string | null
        email: string | null
        organisation: string | null
        role: string | null
        created_at: string
      }>).map((row) => ({
        id: row.id,
        participantName: [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Participant',
        email: row.email,
        organisation: row.organisation,
        role: row.role,
        submittedAt: row.created_at,
      })),
    },
  }
}

export async function getAdminAssessmentV2ReportPreview(input: {
  adminClient: AdminClient
  assessmentId: string
  reportId: string
  submissionId: string
}) {
  const result = await getV2SubmissionReport({
    adminClient: input.adminClient,
    submissionId: input.submissionId,
    reportId: input.reportId,
  })

  if (!result.ok) {
    return result
  }

  if (result.data.context.assessmentId !== input.assessmentId) {
    return { ok: false as const, error: 'submission_not_found' as const }
  }

  return {
    ok: true as const,
    data: result.data,
  }
}
