import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params

  const body = (await request.json().catch(() => null)) as {
    name?: string
    submissionIds?: string[]
  } | null

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body?.name !== undefined) {
    const name = String(body.name).trim()
    if (!name) return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 })
    updates.name = name
  }

  if (body?.submissionIds !== undefined) {
    if (!Array.isArray(body.submissionIds)) {
      return NextResponse.json({ ok: false, error: 'invalid_submission_ids' }, { status: 400 })
    }
    updates.submission_ids = body.submissionIds.filter((s) => typeof s === 'string')
  }

  const { data, error } = await auth.adminClient
    .from('response_cohorts')
    .update(updates)
    .eq('id', id)
    .select('id, assessment_id, name, submission_ids, created_at, updated_at')
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'cohort_update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, cohort: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params

  const { error } = await auth.adminClient
    .from('response_cohorts')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ ok: false, error: 'cohort_delete_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
