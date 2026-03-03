import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/surveys/api-auth'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { id } = await params
  const { data, error } = await auth.adminClient
    .from('surveys')
    .select('id, key, name, description, status, is_public, version, scoring_config, public_url, created_at, updated_at')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'survey_not_found' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, survey: data })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const body = (await request.json().catch(() => null)) as
    | {
        key?: string
        name?: string
        description?: string | null
        status?: 'draft' | 'active' | 'archived'
        isPublic?: boolean
        version?: number
      }
    | null

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof body?.key === 'string') {
    updates.key = body.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
  }
  if (typeof body?.name === 'string') updates.name = body.name.trim()
  if (typeof body?.description === 'string' || body?.description === null) {
    updates.description = body.description ? body.description.trim() : null
  }
  if (body?.status) updates.status = body.status
  if (typeof body?.isPublic === 'boolean') updates.is_public = body.isPublic
  if (typeof body?.version === 'number' && Number.isInteger(body.version) && body.version > 0) {
    updates.version = body.version
  }

  const { data, error } = await auth.adminClient
    .from('surveys')
    .update(updates)
    .eq('id', id)
    .select('id, key, name, description, status, is_public, version, updated_at')
    .single()

  if (error || !data) {
    return NextResponse.json({ ok: false, error: 'survey_update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, survey: data })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params
  const { error } = await auth.adminClient.from('surveys').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ ok: false, error: 'survey_delete_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
