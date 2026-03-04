import { NextResponse } from 'next/server'
import { requireDashboardApiAuth } from '@/utils/assessments/api-auth'

function toPositiveInt(input: string | null, fallback: number) {
  const parsed = Number(input)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function GET(request: Request) {
  const auth = await requireDashboardApiAuth()
  if (!auth.ok) return auth.response

  const { searchParams } = new URL(request.url)
  const page = toPositiveInt(searchParams.get('page'), 1)
  const pageSize = Math.min(toPositiveInt(searchParams.get('pageSize'), 50), 200)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await auth.adminClient
    .from('organisations')
    .select('id, name, slug, website, status, created_at', { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to)

  if (error) {
    return NextResponse.json({ ok: false, error: 'organisations_list_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    organisations: data ?? [],
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  })
}

export async function POST(request: Request) {
  const auth = await requireDashboardApiAuth({ adminOnly: true })
  if (!auth.ok) return auth.response

  const body = (await request.json().catch(() => null)) as {
    name?: string
    slug?: string
    website?: string
  } | null

  const name = String(body?.name ?? '').trim()
  if (!name) {
    return NextResponse.json({ ok: false, error: 'name_required' }, { status: 400 })
  }

  const slug = String(body?.slug ?? '').trim() || slugify(name)
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) && !/^[a-z0-9]$/.test(slug)) {
    return NextResponse.json({ ok: false, error: 'invalid_slug' }, { status: 400 })
  }

  const website = String(body?.website ?? '').trim() || null

  const { data, error } = await auth.adminClient
    .from('organisations')
    .insert({ name, slug, website })
    .select('id, name, slug, website, status, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: false, error: 'slug_taken' }, { status: 409 })
    }
    return NextResponse.json({ ok: false, error: 'create_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, organisation: data }, { status: 201 })
}
