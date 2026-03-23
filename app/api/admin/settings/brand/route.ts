import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { getPlatformBrandConfig, savePlatformBrandConfig } from '@/utils/brand/platform-brand'
import { normalizeOrgBrandingConfig, validateHexColor } from '@/utils/brand/org-brand-utils'

export async function GET() {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const brand = await getPlatformBrandConfig(auth.adminClient)
  return NextResponse.json({ ok: true, brand })
}

export async function PUT(request: Request) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const body = (await request.json().catch(() => null)) as {
    brand?: unknown
  } | null

  if (!body?.brand || typeof body.brand !== 'object') {
    return NextResponse.json(
      { ok: false, error: 'Missing brand object.' },
      { status: 400 }
    )
  }

  const config = normalizeOrgBrandingConfig(body.brand)

  // Validate all hex colour fields
  const hexFields: Array<[string, string | null]> = [
    ['hero_gradient_start_color', config.hero_gradient_start_color],
    ['hero_gradient_end_color', config.hero_gradient_end_color],
    ['canvas_tint_color', config.canvas_tint_color],
    ['primary_cta_color', config.primary_cta_color],
    ['secondary_cta_accent_color', config.secondary_cta_accent_color],
    ['hero_text_color_override', config.hero_text_color_override],
  ]

  for (const [field, value] of hexFields) {
    if (value && !validateHexColor(value)) {
      return NextResponse.json(
        { ok: false, error: `Invalid hex colour for ${field}.` },
        { status: 400 }
      )
    }
  }

  // Platform brand is always enabled
  const brandConfig = { ...config, branding_enabled: true }

  const result = await savePlatformBrandConfig(
    auth.adminClient,
    brandConfig,
    auth.user.id
  )

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, brand: brandConfig })
}
