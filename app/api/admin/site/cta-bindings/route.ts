import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { listSiteCtaBindings, saveSiteCtaBindings } from '@/utils/services/site-cta-bindings'

export async function GET() {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const result = await listSiteCtaBindings({
    adminClient: auth.adminClient,
  })
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: 'bindings_load_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function PUT(request: Request) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const result = await saveSiteCtaBindings({
    adminClient: auth.adminClient,
    actorUserId: auth.user.id,
    payload: (await request.json().catch(() => null)) as { bindings?: { slot: string; campaign_slug: string | null }[] } | null,
  })
  if (!result.ok) {
    const status =
      result.error === 'invalid_payload' ||
      result.error === 'invalid_slot' ||
      result.error === 'duplicate_slot' ||
      result.error === 'campaign_not_active'
        ? 400
        : 500

    return NextResponse.json(
      { ok: false, error: result.error, ...(result.slug ? { slug: result.slug } : {}) },
      { status }
    )
  }

  return NextResponse.json({ ok: true, ...result.data })
}
