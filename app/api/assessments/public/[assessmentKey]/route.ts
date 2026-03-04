import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(_request: Request, { params }: { params: Promise<{ assessmentKey: string }> }) {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json(
      { ok: false, error: 'missing_service_role', message: 'Supabase admin credentials are not configured.' },
      { status: 500 }
    )
  }

  const { assessmentKey } = await params

  const { data: assessmentRow } = await adminClient
    .from('assessments')
    .select('id, key, name, description, version, status, is_public')
    .eq('key', assessmentKey)
    .eq('status', 'active')
    .eq('is_public', true)
    .maybeSingle()

  if (!assessmentRow) {
    return NextResponse.json({ ok: false, error: 'survey_not_found' }, { status: 404 })
  }

  const { data: questionRows, error: questionError } = await adminClient
    .from('assessment_questions')
    .select('id, question_key, text, dimension, is_reverse_coded, sort_order')
    .eq('assessment_id', assessmentRow.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (questionError) {
    return NextResponse.json({ ok: false, error: 'questions_load_failed' }, { status: 500 })
  }

  const assessmentPayload = {
    id: assessmentRow.id,
    key: assessmentRow.key,
    name: assessmentRow.name,
    description: assessmentRow.description,
    version: assessmentRow.version,
  }

  return NextResponse.json({
    ok: true,
    assessment: assessmentPayload,
    // Backward compatibility for existing clients.
    survey: assessmentPayload,
    questions: questionRows ?? [],
  })
}
