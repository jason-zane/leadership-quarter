import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { createEmptyScoringConfig } from '@/utils/assessments/scoring-config'

export async function GET() {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { data, error } = await auth.adminClient
    .from('assessments')
    .select('id, key, name, description, status, is_public, version, scoring_engine, runner_config, report_config, created_at, updated_at')
    .order('updated_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: 'surveys_list_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    assessments: data ?? [],
    // Backward compatibility alias.
    surveys: data ?? [],
  })
}

export async function POST(request: Request) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const body = (await request.json().catch(() => null)) as
    | {
        key?: string
        name?: string
        description?: string
        status?: 'draft' | 'active' | 'archived'
        isPublic?: boolean
        scoringEngine?: 'rule_based' | 'psychometric' | 'hybrid'
        runnerConfig?: unknown
        reportConfig?: unknown
      }
    | null

  const key = String(body?.key ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
  const name = String(body?.name ?? '').trim()

  if (!key || !name) {
    return NextResponse.json({ ok: false, error: 'invalid_fields' }, { status: 400 })
  }

  const { data, error } = await auth.adminClient
    .from('assessments')
    .insert({
      key,
      name,
      description: String(body?.description ?? '').trim() || null,
      status: body?.status ?? 'draft',
      is_public: body?.isPublic ?? false,
      version: 1,
      scoring_engine: body?.scoringEngine ?? 'rule_based',
      scoring_config: createEmptyScoringConfig(),
      runner_config: body?.runnerConfig ?? {},
      report_config: body?.reportConfig ?? {},
      created_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .select('id, key, name, status, is_public, version, scoring_engine, runner_config, report_config')
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'survey_create_failed', message: error?.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    assessment: data,
    // Backward compatibility alias.
    survey: data,
  }, { status: 201 })
}
