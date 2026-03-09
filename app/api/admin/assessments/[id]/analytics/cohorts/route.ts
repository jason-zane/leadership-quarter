import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { getCohortComparison } from '@/utils/services/admin-assessment-analytics'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const { searchParams } = new URL(request.url)
  const traitId = searchParams.get('traitId')
  const cohortAId = searchParams.get('cohortA')
  const cohortBId = searchParams.get('cohortB')

  if (!traitId || !cohortAId || !cohortBId) {
    return NextResponse.json(
      { ok: false, error: 'missing_params', required: ['traitId', 'cohortA', 'cohortB'] },
      { status: 400 }
    )
  }

  const result = await getCohortComparison({
    adminClient: auth.adminClient,
    assessmentId,
    traitId,
    cohortAId,
    cohortBId,
  })

  if (!result.ok) {
    const status =
      result.error === 'trait_not_found' || result.error === 'cohort_not_found' ? 404 : 422
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
