import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { exportAdminAssessmentV2QuestionBankCsv } from '@/utils/services/admin-assessment-v2-question-bank'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const template = searchParams.get('template') === '1'
  const result = await exportAdminAssessmentV2QuestionBankCsv({
    adminClient: auth.adminClient,
    assessmentId: id,
    template,
  })

  if (!result.ok) {
    return new Response(JSON.stringify({ ok: false, error: result.error }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(result.data.csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="assessment-v2-questions-${template ? 'template' : 'export'}.csv"`,
    },
  })
}
