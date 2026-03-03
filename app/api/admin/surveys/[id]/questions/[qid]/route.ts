import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/surveys/api-auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id, qid } = await params
  const body = (await request.json().catch(() => null)) as
    | {
        questionKey?: string
        text?: string
        dimension?: string
        isReverseCoded?: boolean
        sortOrder?: number
        isActive?: boolean
      }
    | null

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body?.questionKey === 'string') updates.question_key = body.questionKey.trim()
  if (typeof body?.text === 'string') updates.text = body.text.trim()
  if (typeof body?.dimension === 'string') updates.dimension = body.dimension.trim()
  if (typeof body?.isReverseCoded === 'boolean') updates.is_reverse_coded = body.isReverseCoded
  if (typeof body?.sortOrder === 'number' && Number.isFinite(body.sortOrder)) {
    updates.sort_order = body.sortOrder
  }
  if (typeof body?.isActive === 'boolean') updates.is_active = body.isActive

  const { data, error } = await auth.adminClient
    .from('survey_questions')
    .update(updates)
    .eq('survey_id', id)
    .eq('id', qid)
    .select('id, survey_id, question_key, text, dimension, is_reverse_coded, sort_order, is_active')
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'question_update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, question: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id, qid } = await params
  const { error } = await auth.adminClient
    .from('survey_questions')
    .delete()
    .eq('survey_id', id)
    .eq('id', qid)

  if (error) {
    return NextResponse.json({ ok: false, error: 'question_delete_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
