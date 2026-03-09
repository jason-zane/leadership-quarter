import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'
import {
  createPortalCampaign,
  listPortalCampaigns,
  parsePortalCampaignsQuery,
} from '@/utils/services/portal-campaigns'

export async function GET(request: Request) {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const result = await listPortalCampaigns({
    adminClient: auth.adminClient,
    organisationId: auth.context.organisationId,
    filters: parsePortalCampaignsQuery(searchParams),
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function POST(request: Request) {
  const auth = await requirePortalApiAuth({
    allowedRoles: ['org_owner', 'org_admin', 'campaign_manager'],
  })
  if (!auth.ok) return auth.response

  const result = await createPortalCampaign({
    adminClient: auth.adminClient,
    organisationId: auth.context.organisationId,
    userId: auth.user.id,
    payload: (await request.json().catch(() => null)) as {
      name?: string
      slug?: string
      config?: Record<string, unknown>
      assessment_ids?: string[]
    } | null,
  })

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error, message: result.message },
      {
        status:
          result.error === 'validation_error'
            ? 400
            : result.error === 'forbidden'
              ? 403
              : result.error === 'conflict'
                ? 409
                : 500,
      }
    )
  }

  return NextResponse.json({ ok: true, ...result.data }, { status: 201 })
}
