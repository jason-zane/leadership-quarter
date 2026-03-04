import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params

  const { data, error } = await auth.adminClient
    .from('assessment_cohorts')
    .select('id, assessment_id, name, description, status, created_by, created_at, updated_at')
    .eq('assessment_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: 'cohorts_list_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, cohorts: data ?? [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = (await request.json().catch(() => null)) as
    | {
        name?: string
        description?: string
        status?: 'draft' | 'active' | 'closed'
      }
    | null

  const name = String(body?.name ?? '').trim()
  if (!name) {
    return NextResponse.json({ ok: false, error: 'invalid_fields' }, { status: 400 })
  }

  const { data, error } = await auth.adminClient
    .from('assessment_cohorts')
    .insert({
      assessment_id: id,
      name,
      description: String(body?.description ?? '').trim() || null,
      status: body?.status ?? 'draft',
      created_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .select('id, assessment_id, name, description, status, created_at, updated_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'cohort_create_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, cohort: data }, { status: 201 })
}
