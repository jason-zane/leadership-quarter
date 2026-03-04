import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'

export async function GET() {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  return NextResponse.json({ ok: true, context: auth.context })
}
