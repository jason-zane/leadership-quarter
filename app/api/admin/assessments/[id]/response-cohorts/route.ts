import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params

  const { data, error } = await auth.adminClient
    .from('response_cohorts')
    .select('id, assessment_id, name, submission_ids, created_at, updated_at')
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

  const body = (await request.json().catch(() => null)) as {
    name?: string
    submissionIds?: string[]
  } | null

  const name = String(body?.name ?? '').trim()
  const submissionIds = Array.isArray(body?.submissionIds) ? body.submissionIds.filter((s) => typeof s === 'string') : []

  if (!name) {
    return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 })
  }
  if (submissionIds.length === 0) {
    return NextResponse.json({ ok: false, error: 'submission_ids_required' }, { status: 400 })
  }

  const { data, error } = await auth.adminClient
    .from('response_cohorts')
    .insert({ assessment_id: id, name, submission_ids: submissionIds })
    .select('id, assessment_id, name, submission_ids, created_at, updated_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'cohort_create_failed', message: error?.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, cohort: data }, { status: 201 })
}
