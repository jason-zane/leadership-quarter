import {
  createEmptyV2ReportTemplate,
  normalizeV2ReportTemplate,
  type V2ReportTemplateDefinition,
} from '@/utils/assessments/v2-report-template'

export type V2ReportAudienceRole = 'candidate' | 'practitioner' | 'internal' | 'client' | 'base'
export type V2AssessmentReportStatus = 'draft' | 'published' | 'archived'
export type V2AssessmentReportKind = 'base' | 'audience'

export type V2AssessmentReportOverrideDefinition = {
  templateDefinition: V2ReportTemplateDefinition | null
}

export type V2AssessmentReportRecord = {
  id: string
  assessmentId: string
  name: string
  reportKind: V2AssessmentReportKind
  audienceRole: V2ReportAudienceRole
  baseReportId: string | null
  overrideDefinition: V2AssessmentReportOverrideDefinition
  status: V2AssessmentReportStatus
  isDefault: boolean
  sortOrder: number
  templateDefinition: V2ReportTemplateDefinition
  createdAt: string
  updatedAt: string
}

const VALID_AUDIENCE_ROLES: V2ReportAudienceRole[] = [
  'candidate',
  'practitioner',
  'internal',
  'client',
  'base',
]

const VALID_STATUSES: V2AssessmentReportStatus[] = ['draft', 'published', 'archived']
const VALID_REPORT_KINDS: V2AssessmentReportKind[] = ['base', 'audience']

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

export function getV2ReportAudienceRoleLabel(role: V2ReportAudienceRole) {
  switch (role) {
    case 'base':
      return 'Base'
    case 'candidate':
      return 'Candidate'
    case 'practitioner':
      return 'Practitioner'
    case 'internal':
      return 'Internal'
    case 'client':
      return 'Client'
  }
}

function normalizeOverrideDefinition(
  input: unknown,
  fallback?: Partial<V2AssessmentReportOverrideDefinition>
): V2AssessmentReportOverrideDefinition {
  const raw = typeof input === 'object' && input ? (input as Record<string, unknown>) : {}
  const templateDefinition = raw.templateDefinition ?? raw.template_definition ?? fallback?.templateDefinition

  return {
    templateDefinition:
      templateDefinition && typeof templateDefinition === 'object'
        ? normalizeV2ReportTemplate(templateDefinition)
        : null,
  }
}

export function createDefaultV2AssessmentReport(input?: {
  assessmentId?: string
  name?: string
  reportKind?: V2AssessmentReportKind
  audienceRole?: V2ReportAudienceRole
  baseReportId?: string | null
  overrideDefinition?: unknown
  status?: V2AssessmentReportStatus
  isDefault?: boolean
  sortOrder?: number
  templateDefinition?: unknown
}) {
  const now = new Date().toISOString()

  return {
    id: '',
    assessmentId: input?.assessmentId ?? '',
    name: input?.name?.trim() || 'Candidate report',
    reportKind: input?.reportKind ?? 'audience',
    audienceRole: input?.audienceRole ?? (input?.reportKind === 'base' ? 'base' : 'candidate'),
    baseReportId: input?.baseReportId ?? null,
    overrideDefinition: normalizeOverrideDefinition(input?.overrideDefinition),
    status: input?.status ?? 'draft',
    isDefault: input?.isDefault ?? false,
    sortOrder: input?.sortOrder ?? 0,
    templateDefinition: input?.templateDefinition
      ? normalizeV2ReportTemplate(input.templateDefinition)
      : createEmptyV2ReportTemplate(),
    createdAt: now,
    updatedAt: now,
  } satisfies V2AssessmentReportRecord
}

export function normalizeV2AssessmentReportRecord(
  input: unknown,
  fallback?: Partial<V2AssessmentReportRecord>
): V2AssessmentReportRecord {
  const raw = typeof input === 'object' && input ? (input as Record<string, unknown>) : {}
  const reportKind =
    VALID_REPORT_KINDS.find((kind) => kind === raw.reportKind || kind === raw.report_kind)
    ?? fallback?.reportKind
    ?? 'audience'

  const audienceRole =
    (reportKind === 'base'
      ? 'base'
      : VALID_AUDIENCE_ROLES.find((role) => role === raw.audienceRole || role === raw.audience_role))
    ?? fallback?.audienceRole
    ?? 'candidate'

  const status =
    VALID_STATUSES.find((value) => value === raw.status)
    ?? fallback?.status
    ?? 'draft'

  return {
    id: asString(raw.id) || fallback?.id || '',
    assessmentId: asString(raw.assessmentId ?? raw.assessment_id) || fallback?.assessmentId || '',
    name: asString(raw.name).trim() || fallback?.name || 'Candidate report',
    reportKind,
    audienceRole,
    baseReportId: asString(raw.baseReportId ?? raw.base_report_id) || fallback?.baseReportId || null,
    overrideDefinition: normalizeOverrideDefinition(
      raw.overrideDefinition ?? raw.override_definition,
      fallback?.overrideDefinition
    ),
    status,
    isDefault: asBoolean(raw.isDefault ?? raw.is_default, fallback?.isDefault ?? false),
    sortOrder: asNumber(raw.sortOrder ?? raw.sort_order, fallback?.sortOrder ?? 0),
    templateDefinition: normalizeV2ReportTemplate(
      raw.templateDefinition ?? raw.template_definition ?? fallback?.templateDefinition
    ),
    createdAt: asString(raw.createdAt ?? raw.created_at) || fallback?.createdAt || new Date().toISOString(),
    updatedAt: asString(raw.updatedAt ?? raw.updated_at) || fallback?.updatedAt || new Date().toISOString(),
  }
}
