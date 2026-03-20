import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { importAdminAssessmentQuestionBankCsv } from '@/utils/services/admin-assessment-question-bank'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const payload = await request.json().catch(() => null) as { csvText?: string } | null
  const csvText = String(payload?.csvText ?? '').trim()

  if (!csvText) {
    return NextResponse.json({ ok: false, error: 'invalid_csv' }, { status: 400 })
  }

  const result = await importAdminAssessmentQuestionBankCsv({
    adminClient: auth.adminClient,
    assessmentId: id,
    csvText,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, message: result.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
