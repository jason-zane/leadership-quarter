import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/surveys/api-auth'

function toPositiveInt(input: string | null, fallback: number) {
  const parsed = Number(input)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const page = toPositiveInt(searchParams.get('page'), 1)
  const pageSize = Math.min(toPositiveInt(searchParams.get('pageSize'), 25), 200)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const query = auth.adminClient
    .from('survey_submissions')
    .select(
      'id, survey_id, invitation_id, first_name, last_name, email, organisation, role, scores, bands, classification, recommendations, created_at',
      { count: 'exact' }
    )
    .eq('survey_id', id)
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, error, count } = await query
  if (error) {
    return NextResponse.json({ ok: false, error: 'responses_list_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    responses: data ?? [],
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  })
}
