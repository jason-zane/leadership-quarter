import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId } = await params
  const { adminClient } = auth

  // Find all trait_question_mappings that differ from assessment_questions.is_reverse_coded
  const { data: mappings, error: mappingsError } = await adminClient
    .from('trait_question_mappings')
    .select('id, question_id, reverse_scored, assessment_traits!inner(assessment_id)')
    .eq('assessment_traits.assessment_id', assessmentId)

  if (mappingsError) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }

  const questionIds = [...new Set((mappings ?? []).map((m) => m.question_id as string))]
  if (questionIds.length === 0) {
    return NextResponse.json({ updated: 0 })
  }

  const { data: questions, error: questionsError } = await adminClient
    .from('assessment_questions')
    .select('id, is_reverse_coded')
    .in('id', questionIds)

  if (questionsError) {
    return NextResponse.json({ error: 'fetch_failed' }, { status: 500 })
  }

  const questionReverseMap = new Map(
    (questions ?? []).map((q) => [q.id as string, Boolean(q.is_reverse_coded)])
  )

  const toUpdate = (mappings ?? []).filter((m) => {
    const questionReverse = questionReverseMap.get(m.question_id as string)
    return questionReverse !== undefined && Boolean(m.reverse_scored) !== questionReverse
  })

  let updated = 0
  for (const mapping of toUpdate) {
    const questionReverse = questionReverseMap.get(mapping.question_id as string)!
    const { error } = await adminClient
      .from('trait_question_mappings')
      .update({ reverse_scored: questionReverse })
      .eq('id', mapping.id as string)
    if (!error) updated++
  }

  return NextResponse.json({ updated })
}
