import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import {
  normalizeReportTemplate,
  createEmptyReportTemplate,
  type ReportTemplateDefinition,
} from '@/utils/assessments/assessment-report-template'

type AdminClient = RouteAuthSuccess['adminClient']

type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string }

// ---------------------------------------------------------------------------
// Load template for an assessment (inline takes priority over reference)
// ---------------------------------------------------------------------------

export async function getAdminAssessmentV2ReportTemplate(input: {
  adminClient: AdminClient
  assessmentId: string
}): Promise<ServiceResult<{ template: ReportTemplateDefinition }>> {
  const { adminClient, assessmentId } = input

  // Try to select the v2_report_template columns
  const { data, error } = await adminClient
    .from('assessments')
    .select('id, v2_report_template, v2_report_template_id')
    .eq('id', assessmentId)
    .maybeSingle()

  if (error) {
    // If columns don't exist yet (migration lag), return empty
    const msg = [error.message, error.details, error.hint].filter(Boolean).join(' ').toLowerCase()
    if (msg.includes('v2_report_template') && (msg.includes('column') || msg.includes('schema'))) {
      return { ok: true, data: { template: createEmptyReportTemplate() } }
    }
    return { ok: false, error: error.message }
  }

  if (!data) {
    return { ok: false, error: 'assessment_not_found' }
  }

  // Inline template takes priority
  if (data.v2_report_template && typeof data.v2_report_template === 'object') {
    return { ok: true, data: { template: normalizeReportTemplate(data.v2_report_template) } }
  }

  // Referenced template
  if (data.v2_report_template_id) {
    const ref = await adminClient
      .from('v2_report_templates')
      .select('template_definition')
      .eq('id', data.v2_report_template_id)
      .maybeSingle()

    if (ref.data?.template_definition) {
      return { ok: true, data: { template: normalizeReportTemplate(ref.data.template_definition) } }
    }
  }

  return { ok: true, data: { template: createEmptyReportTemplate() } }
}

// ---------------------------------------------------------------------------
// Save inline template on an assessment
// ---------------------------------------------------------------------------

export async function saveAdminAssessmentV2ReportTemplate(input: {
  adminClient: AdminClient
  assessmentId: string
  template: unknown
}): Promise<ServiceResult<{ template: ReportTemplateDefinition }>> {
  const { adminClient, assessmentId } = input

  const normalized = normalizeReportTemplate(input.template)

  const { error } = await adminClient
    .from('assessments')
    .update({ v2_report_template: normalized as unknown as Record<string, unknown> })
    .eq('id', assessmentId)

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true, data: { template: normalized } }
}
