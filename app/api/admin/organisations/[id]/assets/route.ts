import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'
import { uploadOrganisationAsset } from '@/utils/services/admin-organisations'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const { id } = await params

  const formData = await request.formData().catch(() => null)
  const file = formData?.get('file')

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: 'file_required' }, { status: 400 })
  }

  const allowedTypes = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ ok: false, error: 'invalid_file_type' }, { status: 400 })
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: 'file_too_large' }, { status: 400 })
  }

  const result = await uploadOrganisationAsset({
    adminClient: auth.adminClient,
    organisationId: id,
    file,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, url: result.url })
}
