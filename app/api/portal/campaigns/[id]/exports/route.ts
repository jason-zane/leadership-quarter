import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'

function csvEscape(value: unknown) {
  const text = String(value ?? '')
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { id: campaignId } = await params

  const { data: campaign } = await auth.adminClient
    .from('campaigns')
    .select('id, slug')
    .eq('id', campaignId)
    .eq('organisation_id', auth.context.organisationId)
    .maybeSingle()

  if (!campaign) {
    return NextResponse.json(
      { ok: false, error: 'not_found', message: 'Campaign was not found.' },
      { status: 404 }
    )
  }

  const { data, error } = await auth.adminClient
    .from('assessment_submissions')
    .select(
      'id, assessment_id, created_at, scores, bands, classification, recommendations, demographics, assessments(name, key), assessment_invitations(email, first_name, last_name, organisation, role, completed_at)'
    )
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to export campaign responses.' },
      { status: 500 }
    )
  }

  const header = [
    'submission_id',
    'assessment_id',
    'assessment_key',
    'assessment_name',
    'email',
    'first_name',
    'last_name',
    'organisation',
    'role',
    'submitted_at',
    'completed_at',
    'scores_json',
    'bands_json',
    'classification_json',
    'recommendations_json',
    'demographics_json',
  ]

  const lines = [header.join(',')]

  for (const row of data ?? []) {
    const assessmentRel = row.assessments as unknown
    const assessment = (Array.isArray(assessmentRel) ? assessmentRel[0] : assessmentRel) as
      | { key: string; name: string }
      | null

    const invitationRel = row.assessment_invitations as unknown
    const invitation = (Array.isArray(invitationRel) ? invitationRel[0] : invitationRel) as
      | {
          email: string | null
          first_name: string | null
          last_name: string | null
          organisation: string | null
          role: string | null
          completed_at: string | null
        }
      | null

    const values = [
      row.id,
      row.assessment_id,
      assessment?.key ?? '',
      assessment?.name ?? '',
      invitation?.email ?? '',
      invitation?.first_name ?? '',
      invitation?.last_name ?? '',
      invitation?.organisation ?? '',
      invitation?.role ?? '',
      row.created_at,
      invitation?.completed_at ?? '',
      JSON.stringify(row.scores ?? {}),
      JSON.stringify(row.bands ?? {}),
      JSON.stringify(row.classification ?? {}),
      JSON.stringify(row.recommendations ?? []),
      JSON.stringify(row.demographics ?? {}),
    ]

    lines.push(values.map(csvEscape).join(','))
  }

  const csv = lines.join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="campaign-${campaign.slug}-responses.csv"`,
    },
  })
}
