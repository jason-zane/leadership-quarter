import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { createAdminClient } from '@/utils/supabase/admin'
import type { ScoringConfig } from '@/utils/assessments/types'
import { normalizeScoringConfig } from '@/utils/assessments/scoring-config'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

type QuestionInput = {
  questionKey?: string
  text?: string
  dimension?: string
  isReverseCoded?: boolean
  sortOrder?: number
  isActive?: boolean
}

async function syncAddedQuestions(
  client: AdminClient,
  assessmentId: string,
  added: Array<{ question_key: string; dimension: string }>
) {
  if (added.length === 0) return

  const { data: assessment } = await client
    .from('assessments')
    .select('scoring_config')
    .eq('id', assessmentId)
    .single()

  if (!assessment) return

  const config = normalizeScoringConfig(assessment.scoring_config as ScoringConfig)
  const updatedDimensions = config.dimensions.map((dim) => {
    const newKeys = added
      .filter((q) => q.dimension === dim.key)
      .map((q) => q.question_key)
      .filter((k) => !dim.question_keys.includes(k))
    if (newKeys.length === 0) return dim
    return { ...dim, question_keys: [...dim.question_keys, ...newKeys] }
  })

  await client
    .from('assessments')
    .update({ scoring_config: { ...config, dimensions: updatedDimensions } })
    .eq('id', assessmentId)
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const { data, error } = await auth.adminClient
    .from('assessment_questions')
    .select('id, assessment_id, question_key, text, dimension, is_reverse_coded, sort_order, is_active, created_at, updated_at')
    .eq('assessment_id', id)
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
  const rawBody = await request.json().catch(() => null)
  const items = (Array.isArray(rawBody) ? rawBody : [rawBody]) as Array<QuestionInput | null>

  // Validate all items
  for (const item of items) {
    const questionKey = String(item?.questionKey ?? '').trim()
    const text = String(item?.text ?? '').trim()
    const dimension = String(item?.dimension ?? '').trim()
    if (!questionKey || !text || !dimension) {
      return NextResponse.json({ ok: false, error: 'invalid_fields' }, { status: 400 })
    }
  }

  // Get base sort_order
  const { data: maxRow } = await auth.adminClient
    .from('assessment_questions')
    .select('sort_order')
    .eq('assessment_id', id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  let nextSortOrder = Number(maxRow?.sort_order ?? 0) + 10

  const rows = items.map((item) => {
    const so = Number.isFinite(item?.sortOrder) ? (item!.sortOrder as number) : nextSortOrder
    nextSortOrder += 10
    return {
      assessment_id: id,
      question_key: String(item!.questionKey!).trim(),
      text: String(item!.text!).trim(),
      dimension: String(item!.dimension!).trim(),
      is_reverse_coded: item?.isReverseCoded ?? false,
      sort_order: so,
      is_active: item?.isActive ?? true,
      updated_at: new Date().toISOString(),
    }
  })

  if (rows.length === 1) {
    const { data, error } = await auth.adminClient
      .from('assessment_questions')
      .insert(rows[0])
      .select('id, assessment_id, question_key, text, dimension, is_reverse_coded, sort_order, is_active')
      .single()

    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'question_create_failed', message: error?.message }, { status: 500 })
    }

    await syncAddedQuestions(auth.adminClient, id, [
      { question_key: data.question_key, dimension: data.dimension },
    ])

    return NextResponse.json({ ok: true, question: data }, { status: 201 })
  }

  // Bulk insert
  const { data, error } = await auth.adminClient
    .from('assessment_questions')
    .insert(rows)
    .select('id, assessment_id, question_key, text, dimension, is_reverse_coded, sort_order, is_active')

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'question_create_failed', message: error?.message }, { status: 500 })
  }

  await syncAddedQuestions(
    auth.adminClient,
    id,
    data.map((q) => ({ question_key: q.question_key, dimension: q.dimension }))
  )

  return NextResponse.json({ ok: true, questions: data }, { status: 201 })
}
