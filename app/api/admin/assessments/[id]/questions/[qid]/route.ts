import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { createAdminClient } from '@/utils/supabase/admin'
import type { ScoringConfig } from '@/utils/assessments/types'
import { normalizeScoringConfig } from '@/utils/assessments/scoring-config'

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>

async function syncQuestionKey(
  client: AdminClient,
  assessmentId: string,
  questionKey: string,
  fromDimension: string | null,
  toDimension: string | null
) {
  if (!fromDimension && !toDimension) return

  const { data: assessment } = await client
    .from('assessments')
    .select('scoring_config')
    .eq('id', assessmentId)
    .single()

  if (!assessment) return

  const config = normalizeScoringConfig(assessment.scoring_config as ScoringConfig)
  const updatedDimensions = config.dimensions.map((dim) => {
    let keys = [...dim.question_keys]
    if (dim.key === fromDimension) {
      keys = keys.filter((k) => k !== questionKey)
    }
    if (dim.key === toDimension && !keys.includes(questionKey)) {
      keys = [...keys, questionKey]
    }
    return { ...dim, question_keys: keys }
  })

  await client
    .from('assessments')
    .update({ scoring_config: { ...config, dimensions: updatedDimensions } })
    .eq('id', assessmentId)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id, qid } = await params

  // Fetch current state before updating so we can sync question_keys
  const { data: existing } = await auth.adminClient
    .from('assessment_questions')
    .select('question_key, dimension')
    .eq('assessment_id', id)
    .eq('id', qid)
    .single()

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
    .from('assessment_questions')
    .update(updates)
    .eq('assessment_id', id)
    .eq('id', qid)
    .select('id, assessment_id, question_key, text, dimension, is_reverse_coded, sort_order, is_active')
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'question_update_failed' }, { status: 500 })
  }

  // Sync question_keys if dimension or question_key changed
  if (existing) {
    const oldKey = existing.question_key
    const newKey = data.question_key
    const oldDim = existing.dimension
    const newDim = data.dimension

    if (oldKey !== newKey || oldDim !== newDim) {
      await syncQuestionKey(auth.adminClient, id, oldKey, oldDim, null)
      await syncQuestionKey(auth.adminClient, id, newKey, null, newDim)
    }
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

  // Fetch current state before deleting so we can remove from question_keys
  const { data: existing } = await auth.adminClient
    .from('assessment_questions')
    .select('question_key, dimension')
    .eq('assessment_id', id)
    .eq('id', qid)
    .single()

  const { error } = await auth.adminClient
    .from('assessment_questions')
    .delete()
    .eq('assessment_id', id)
    .eq('id', qid)

  if (error) {
    return NextResponse.json({ ok: false, error: 'question_delete_failed' }, { status: 500 })
  }

  if (existing) {
    await syncQuestionKey(
      auth.adminClient,
      id,
      existing.question_key,
      existing.dimension,
      null
    )
  }

  return NextResponse.json({ ok: true })
}
