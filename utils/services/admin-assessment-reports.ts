import { sanitiseSearchQuery } from '@/utils/sanitise-search-query'
import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'
import {
  createAdminAssessmentV2Report,
  duplicateAdminAssessmentV2Report,
  getAdminAssessmentV2Report,
  getAdminAssessmentV2ReportPreview,
  listAdminAssessmentV2Reports,
  updateAdminAssessmentV2Report,
} from '@/utils/services/admin-assessment-reports-service'

type AdminClient = RouteAuthSuccess['adminClient']

export {
  createAdminAssessmentV2Report as createAdminAssessmentReport,
  duplicateAdminAssessmentV2Report as duplicateAdminAssessmentReport,
  getAdminAssessmentV2Report as getAdminAssessmentReport,
  getAdminAssessmentV2ReportPreview as getAdminAssessmentReportPreview,
  listAdminAssessmentV2Reports as listAdminAssessmentReports,
  updateAdminAssessmentV2Report as updateAdminAssessmentReport,
}

export async function listAdminAssessmentReportPreviewSubmissions(input: {
  adminClient: AdminClient
  assessmentId: string
  mode?: 'sample' | 'live'
  query?: string | null
}) {
  const mode = input.mode === 'sample' ? 'sample' : 'live'
  let query = input.adminClient
    .from('assessment_submissions')
    .select('id, preview_sample_key, first_name, last_name, email, organisation, role, created_at')
    .eq('assessment_id', input.assessmentId)
    .eq('is_preview_sample', mode === 'sample')
    .order('created_at', { ascending: false })
    .limit(50)

  const q = input.query?.trim()
  if (q) {
    const sq = sanitiseSearchQuery(q)
    if (sq) {
      query = query.or(`first_name.ilike.%${sq}%,last_name.ilike.%${sq}%,email.ilike.%${sq}%,organisation.ilike.%${sq}%`)
    }
  }

  const result = await query
  if (result.error) {
    return { ok: false as const, error: result.error.message }
  }

  return {
    ok: true as const,
    data: {
      submissions: ((result.data ?? []) as Array<{
        id: string
        preview_sample_key: string | null
        first_name: string | null
        last_name: string | null
        email: string | null
        organisation: string | null
        role: string | null
        created_at: string
      }>).map((row) => ({
        id: row.id,
        previewSampleKey: row.preview_sample_key,
        participantName: [row.first_name, row.last_name].filter(Boolean).join(' ') || 'Participant',
        email: row.email,
        organisation: row.organisation,
        role: row.role,
        submittedAt: row.created_at,
      })),
    },
  }
}

export async function uploadAdminAssessmentReportAsset(input: {
  adminClient: AdminClient
  assessmentId: string
  reportId: string
  file: File
}) {
  const report = await getAdminAssessmentV2Report({
    adminClient: input.adminClient,
    assessmentId: input.assessmentId,
    reportId: input.reportId,
  })

  if (!report.ok) {
    return { ok: false as const, error: report.error === 'report_not_found' ? 'report_not_found' : 'upload_failed' }
  }

  const ext = input.file.name.split('.').pop() ?? 'bin'
  const uuid = crypto.randomUUID()
  const path = `assessment-reports/${input.assessmentId}/${input.reportId}/${uuid}.${ext}`

  const { error } = await input.adminClient.storage
    .from('org-assets')
    .upload(path, input.file, { contentType: input.file.type, upsert: false })

  if (error) {
    return { ok: false as const, error: 'upload_failed' }
  }

  const { data: urlData } = input.adminClient.storage.from('org-assets').getPublicUrl(path)
  if (!urlData?.publicUrl) {
    return { ok: false as const, error: 'url_failed' }
  }

  return { ok: true as const, url: urlData.publicUrl }
}
