import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { resetPlatformBrandConfig } from '@/utils/brand/platform-brand'
import { LQ_BRAND_CONFIG } from '@/utils/brand/org-brand-utils'

export async function POST() {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const result = await resetPlatformBrandConfig(auth.adminClient)

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, brand: LQ_BRAND_CONFIG })
}
