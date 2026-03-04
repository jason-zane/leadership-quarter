import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: campaignId } = await params

  const body = (await request.json().catch(() => null)) as {
    assessment_id?: string
    // legacy alias
    survey_id?: string
    sort_order?: number
  } | null

  const assessmentId = String(body?.assessment_id ?? body?.survey_id ?? '').trim()
  if (!assessmentId) {
    return NextResponse.json({ ok: false, error: 'survey_id_required' }, { status: 400 })
  }

  const { data, error } = await auth.adminClient
    .from('campaign_assessments')
    .insert({
      campaign_id: campaignId,
      assessment_id: assessmentId,
      sort_order: body?.sort_order ?? 0,
    })
    .select('id, campaign_id, assessment_id, sort_order, is_active, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: false, error: 'assessment_already_added' }, { status: 409 })
    }
    return NextResponse.json({ ok: false, error: 'add_assessment_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, assessment: data }, { status: 201 })
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: campaignId } = await params

  const url = new URL(request.url)
  const assessmentId = url.searchParams.get('assessmentId')
  if (!assessmentId) {
    return NextResponse.json({ ok: false, error: 'assessmentId_required' }, { status: 400 })
  }

  const { error } = await auth.adminClient
    .from('campaign_assessments')
    .delete()
    .eq('id', assessmentId)
    .eq('campaign_id', campaignId)

  if (error) {
    return NextResponse.json({ ok: false, error: 'remove_assessment_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
