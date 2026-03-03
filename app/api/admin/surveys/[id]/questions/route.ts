import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/surveys/api-auth'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const { data, error } = await auth.adminClient
    .from('survey_questions')
    .select('id, survey_id, question_key, text, dimension, is_reverse_coded, sort_order, is_active, created_at, updated_at')
    .eq('survey_id', id)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ ok: false, error: 'questions_list_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, questions: data ?? [] })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
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

  const questionKey = String(body?.questionKey ?? '').trim()
  const text = String(body?.text ?? '').trim()
  const dimension = String(body?.dimension ?? '').trim()

  if (!questionKey || !text || !dimension) {
    return NextResponse.json({ ok: false, error: 'invalid_fields' }, { status: 400 })
  }

  let sortOrder = Number(body?.sortOrder ?? NaN)
  if (!Number.isFinite(sortOrder)) {
    const { data: maxRow } = await auth.adminClient
      .from('survey_questions')
      .select('sort_order')
      .eq('survey_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    sortOrder = Number(maxRow?.sort_order ?? 0) + 10
  }

  const { data, error } = await auth.adminClient
    .from('survey_questions')
    .insert({
      survey_id: id,
      question_key: questionKey,
      text,
      dimension,
      is_reverse_coded: body?.isReverseCoded ?? false,
      sort_order: sortOrder,
      is_active: body?.isActive ?? true,
      updated_at: new Date().toISOString(),
    })
    .select('id, survey_id, question_key, text, dimension, is_reverse_coded, sort_order, is_active')
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'question_create_failed', message: error?.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, question: data }, { status: 201 })
}
