import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { updateOrganisationBranding } from '@/utils/services/admin-organisations'
import type { OrgBrandingConfig } from '@/utils/brand/org-brand-utils'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params

  const body = (await request.json().catch(() => null)) as { branding_config?: Partial<OrgBrandingConfig> } | null
  if (!body?.branding_config) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 })
  }

  const result = await updateOrganisationBranding({
    adminClient: auth.adminClient,
    organisationId: id,
    patch: body.branding_config,
  })

  if (!result.ok) {
    const status =
      result.error === 'organisation_not_found' ? 404 : result.error === 'invalid_color' ? 400 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, organisation: result.data.organisation })
}
