import { NextResponse } from 'next/server'
import { requirePortalApiAuth } from '@/utils/portal-api-auth'

export async function GET() {
  const auth = await requirePortalApiAuth()
  if (!auth.ok) return auth.response

  if (!auth.context.isBypassAdmin) {
    return NextResponse.json(
      { ok: false, error: 'forbidden', message: 'Only internal admins can list all organisations.' },
      { status: 403 }
    )
  }

  const { data, error } = await auth.adminClient
    .from('organisations')
    .select('id, name, slug, status')
    .eq('status', 'active')
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json(
      { ok: false, error: 'internal_error', message: 'Failed to load organisations.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, organisations: data ?? [] })
}
