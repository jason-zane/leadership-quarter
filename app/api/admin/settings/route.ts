import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  listPlatformSettings,
  savePlatformSettings,
  type SettingUpdate,
  SETTING_CATEGORIES,
} from '@/utils/services/platform-settings'

export async function GET() {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const settings = await listPlatformSettings(auth.adminClient)
  return NextResponse.json({ ok: true, settings })
}

export async function PUT(request: Request) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const body = (await request.json().catch(() => null)) as {
    settings?: SettingUpdate[]
  } | null

  if (!body?.settings || !Array.isArray(body.settings)) {
    return NextResponse.json(
      { ok: false, error: 'Missing settings array.' },
      { status: 400 }
    )
  }

  const categorySet = new Set<string>(SETTING_CATEGORIES)
  const valid = body.settings.filter(
    (s): s is SettingUpdate =>
      typeof s.category === 'string' &&
      categorySet.has(s.category) &&
      typeof s.key === 'string' &&
      s.value !== undefined
  )

  if (valid.length === 0) {
    return NextResponse.json(
      { ok: false, error: 'No valid settings provided.' },
      { status: 400 }
    )
  }

  const result = await savePlatformSettings(auth.adminClient, valid, auth.user.id)
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  const settings = await listPlatformSettings(auth.adminClient)
  return NextResponse.json({ ok: true, settings })
}
