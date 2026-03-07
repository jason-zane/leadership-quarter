import { NextResponse } from 'next/server'
import { getPublicBaseUrl } from '@/utils/hosts'
import { renderUrlToPdfBuffer } from '@/utils/pdf/render-route'
import {
  getAssessmentReportData,
  getAssessmentReportFilename,
} from '@/utils/reports/assessment-report'
import { verifyReportAccessToken } from '@/utils/security/report-access'
import { createAdminClient } from '@/utils/supabase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const access = searchParams.get('access')
  const payload = access ? verifyReportAccessToken(access, 'assessment') : null

  if (!payload) {
    return NextResponse.json({ ok: false, error: 'invalid_access' }, { status: 403 })
  }

  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const report = await getAssessmentReportData(adminClient, payload.submissionId)
  if (!report) {
    return NextResponse.json({ ok: false, error: 'report_not_found' }, { status: 404 })
  }

  try {
    const pdfBuffer = await renderUrlToPdfBuffer(
      `${getPublicBaseUrl()}/assess/r/assessment?access=${encodeURIComponent(access ?? '')}&render=pdf`
    )

    return new NextResponse(pdfBuffer, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${getAssessmentReportFilename(report)}"`,
        'cache-control': 'private, no-store, max-age=0',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'pdf_render_failed'
    return NextResponse.json({ ok: false, error: 'pdf_render_failed', message }, { status: 503 })
  }
}
