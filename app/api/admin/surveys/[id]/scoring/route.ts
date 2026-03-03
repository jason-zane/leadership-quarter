import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/surveys/api-auth'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const { data, error } = await auth.adminClient
    .from('surveys')
    .select('id, key, name, scoring_config, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'scoring_not_found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, scoringConfig: data.scoring_config, survey: data })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = (await request.json().catch(() => null)) as { scoringConfig?: unknown } | null

  if (!body?.scoringConfig || typeof body.scoringConfig !== 'object') {
    return NextResponse.json({ ok: false, error: 'invalid_scoring_config' }, { status: 400 })
  }

  const { data, error } = await auth.adminClient
    .from('surveys')
    .update({
      scoring_config: body.scoringConfig,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, scoring_config, updated_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'scoring_update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, survey: data })
}
