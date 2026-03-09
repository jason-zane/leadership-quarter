import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import {
  getTraitQuestionMappings,
  replaceTraitQuestionMappings,
} from '@/utils/services/admin-assessment-traits'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; traitId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { traitId } = await params
  const result = await getTraitQuestionMappings({ adminClient: auth.adminClient, traitId })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...result.data })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; traitId: string }> }
) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id: assessmentId, traitId } = await params
  const body = await request.json().catch(() => null)
  const mappings = Array.isArray(body?.mappings) ? body.mappings : []

  const result = await replaceTraitQuestionMappings({
    adminClient: auth.adminClient,
    assessmentId,
    traitId,
    mappings,
  })

  if (!result.ok) {
    const status = result.error === 'trait_not_found' ? 404 : 500
    return NextResponse.json({ ok: false, error: result.error }, { status })
  }

  return NextResponse.json({ ok: true, ...result.data })
}
