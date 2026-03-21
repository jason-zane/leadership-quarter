import {
  createEmptyReportTemplate,
  normalizeReportTemplate,
  type ReportTemplateDefinition,
} from '@/utils/assessments/assessment-report-template'

export type ReportAudienceRole = 'candidate' | 'practitioner' | 'internal' | 'client' | 'base'
export type AssessmentReportStatus = 'draft' | 'published' | 'archived'
export type AssessmentReportKind = 'base' | 'audience'

export type AssessmentReportOverrideDefinition = {
  templateDefinition: ReportTemplateDefinition | null
}

export type AssessmentReportRecord = {
  id: string
  assessmentId: string
  name: string
  reportKind: AssessmentReportKind
  audienceRole: ReportAudienceRole
  baseReportId: string | null
  overrideDefinition: AssessmentReportOverrideDefinition
  status: AssessmentReportStatus
  isDefault: boolean
  sortOrder: number
  templateDefinition: ReportTemplateDefinition
  createdAt: string
  updatedAt: string
}

const VALID_AUDIENCE_ROLES: ReportAudienceRole[] = [
  'candidate',
  'practitioner',
  'internal',
  'client',
  'base',
]

const VALID_STATUSES: AssessmentReportStatus[] = ['draft', 'published', 'archived']
const VALID_REPORT_KINDS: AssessmentReportKind[] = ['base', 'audience']

function asString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

export function getReportAudienceRoleLabel(role: ReportAudienceRole) {
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
  fallback?: Partial<AssessmentReportOverrideDefinition>
): AssessmentReportOverrideDefinition {
  const raw = typeof input === 'object' && input ? (input as Record<string, unknown>) : {}
  const templateDefinition = raw.templateDefinition ?? raw.template_definition ?? fallback?.templateDefinition

  return {
    templateDefinition:
      templateDefinition && typeof templateDefinition === 'object'
        ? normalizeReportTemplate(templateDefinition)
        : null,
  }
}

export function createDefaultAssessmentReport(input?: {
  assessmentId?: string
  name?: string
  reportKind?: AssessmentReportKind
  audienceRole?: ReportAudienceRole
  baseReportId?: string | null
  overrideDefinition?: unknown
  status?: AssessmentReportStatus
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
      ? normalizeReportTemplate(input.templateDefinition)
      : createEmptyReportTemplate(),
    createdAt: now,
    updatedAt: now,
  } satisfies AssessmentReportRecord
}

export function normalizeAssessmentReportRecord(
  input: unknown,
  fallback?: Partial<AssessmentReportRecord>
): AssessmentReportRecord {
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
    templateDefinition: normalizeReportTemplate(
      raw.templateDefinition ?? raw.template_definition ?? fallback?.templateDefinition
    ),
    createdAt: asString(raw.createdAt ?? raw.created_at) || fallback?.createdAt || new Date().toISOString(),
    updatedAt: asString(raw.updatedAt ?? raw.updated_at) || fallback?.updatedAt || new Date().toISOString(),
  }
}
