import { NextResponse } from 'next/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { normalizeReportConfig, normalizeRunnerConfig } from '@/utils/assessments/experience-config'

export async function GET(_request: Request, { params }: { params: Promise<{ assessmentKey: string }> }) {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return NextResponse.json({ ok: false, error: 'missing_service_role' }, { status: 500 })
  }

  const { assessmentKey } = await params

  const { data: assessment, error: assessmentError } = await adminClient
    .from('assessments')
    .select('id, key, name, description, status, is_public, version, runner_config, report_config')
    .eq('key', assessmentKey)
    .eq('status', 'active')
    .eq('is_public', true)
    .maybeSingle()

  if (assessmentError || !assessment) {
    return NextResponse.json({ ok: false, error: 'assessment_not_found' }, { status: 404 })
  }

  const { data: questions, error: questionsError } = await adminClient
    .from('assessment_questions')
    .select('id, question_key, text, dimension, is_reverse_coded, sort_order')
    .eq('assessment_id', assessment.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (questionsError) {
    return NextResponse.json({ ok: false, error: 'questions_load_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    context: 'public',
    assessment: {
      id: assessment.id,
      key: assessment.key,
      name: assessment.name,
      description: assessment.description,
      version: assessment.version,
    },
    questions: questions ?? [],
    runnerConfig: normalizeRunnerConfig(assessment.runner_config),
    reportConfig: normalizeReportConfig(assessment.report_config),
  })
}
