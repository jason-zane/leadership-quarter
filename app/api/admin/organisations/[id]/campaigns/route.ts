import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params

  const { data, error } = await auth.adminClient
    .from('campaigns')
    .select('id, external_name, slug, status, created_at, campaign_assessments(count)')
    .eq('organisation_id', id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 })
  }

  const campaigns = (data ?? []).map((row) => {
    const countRelation = row.campaign_assessments as unknown
    const assessmentCount = Array.isArray(countRelation)
      ? (countRelation[0] as { count?: number } | undefined)?.count ?? 0
      : 0
    return {
      id: row.id,
      external_name: row.external_name,
      slug: row.slug,
      status: row.status,
      created_at: row.created_at,
      assessment_count: assessmentCount,
    }
  })

  return NextResponse.json({ ok: true, campaigns })
}
