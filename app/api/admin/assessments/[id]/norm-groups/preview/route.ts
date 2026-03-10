import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { resolveNormGroupSubmissionIds } from '@/utils/assessments/norm-group-filters'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const body = (await request.json().catch(() => null)) as
    | {
        filters?: Record<string, unknown> | null
      }
    | null

  const result = await resolveNormGroupSubmissionIds({
    adminClient: auth.adminClient,
    assessmentId,
    filters: body?.filters ?? null,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    count: result.data.submissionIds.length,
    filters: result.data.filters,
  })
}
