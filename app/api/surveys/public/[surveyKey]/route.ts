import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function GET(_request: Request, { params }: { params: Promise<{ surveyKey: string }> }) {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json(
      { ok: false, error: 'missing_service_role', message: 'Supabase admin credentials are not configured.' },
      { status: 500 }
    )
  }

  const { surveyKey } = await params

  const { data: surveyRow } = await adminClient
    .from('surveys')
    .select('id, key, name, description, version, status, is_public')
    .eq('key', surveyKey)
    .eq('status', 'active')
    .eq('is_public', true)
    .maybeSingle()

  if (!surveyRow) {
    return NextResponse.json({ ok: false, error: 'survey_not_found' }, { status: 404 })
  }

  const { data: questionRows, error: questionError } = await adminClient
    .from('survey_questions')
    .select('id, question_key, text, dimension, is_reverse_coded, sort_order')
    .eq('survey_id', surveyRow.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (questionError) {
    return NextResponse.json({ ok: false, error: 'questions_load_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    survey: {
      id: surveyRow.id,
      key: surveyRow.key,
      name: surveyRow.name,
      description: surveyRow.description,
      version: surveyRow.version,
    },
    questions: questionRows ?? [],
  })
}
