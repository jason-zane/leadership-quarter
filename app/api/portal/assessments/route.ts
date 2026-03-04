import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'

export async function GET() {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { data, error } = await auth.adminClient
    .from('organisation_assessment_access')
    .select(
      'id, organisation_id, assessment_id, enabled, config_override, created_at, updated_at, assessments(id, key, name, description, status)'
    )
    .eq('organisation_id', auth.context.organisationId)
    .eq('enabled', true)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to load assigned assessments.' },
      { status: 500 }
    )
  }

  const assessments = (data ?? [])
    .map((row) => {
      const relation = row.assessments as unknown
      const assessment = (Array.isArray(relation) ? relation[0] : relation) as
        | { id: string; key: string; name: string; description: string | null; status: string }
        | null

      if (!assessment || assessment.status !== 'active') return null

      return {
        id: row.id,
        assessment_id: row.assessment_id,
        enabled: row.enabled,
        config_override: row.config_override,
        assessment,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  return NextResponse.json({ ok: true, assessments })
}
