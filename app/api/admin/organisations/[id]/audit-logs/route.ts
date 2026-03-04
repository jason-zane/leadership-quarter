import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

function toPositiveInt(input: string | null, fallback: number) {
  const parsed = Number(input)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id: organisationId } = await params
  const { searchParams } = new URL(request.url)
  const page = toPositiveInt(searchParams.get('page'), 1)
  const pageSize = Math.min(toPositiveInt(searchParams.get('pageSize'), 25), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await auth.adminClient
    .from('admin_audit_logs')
    .select('id, actor_user_id, action, target_user_id, target_email, details, created_at', {
      count: 'exact',
    })
    .filter('details->>organisation_id', 'eq', organisationId)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    return NextResponse.json({ ok: false, error: 'audit_logs_list_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    logs: data ?? [],
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  })
}
