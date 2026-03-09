import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'

type AdminClient = RouteAuthSuccess['adminClient']

type AdminOrganisationCreatePayload = {
  name?: string
  slug?: string
  website?: string
}

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

function isValidSlug(slug: string) {
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(slug) || /^[a-z0-9]$/.test(slug)
}

export function parseOrganisationPagination(searchParams: URLSearchParams) {
  const page = toPositiveInt(searchParams.get('page'), 1)
  const pageSize = Math.min(toPositiveInt(searchParams.get('pageSize'), 50), 200)
  return { page, pageSize }
}

export async function listAdminOrganisations(input: {
  adminClient: AdminClient
  page: number
  pageSize: number
}): Promise<
  | {
      ok: true
      data: {
        organisations: unknown[]
        pagination: {
          page: number
          pageSize: number
          total: number
          totalPages: number
        }
      }
    }
  | { ok: false; error: 'organisations_list_failed' }
> {
  const from = (input.page - 1) * input.pageSize
  const to = from + input.pageSize - 1

  const { data, error, count } = await input.adminClient
    .from('organisations')
    .select('id, name, slug, website, status, created_at', { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to)

  if (error) {
    return { ok: false, error: 'organisations_list_failed' }
  }

  return {
    ok: true,
    data: {
      organisations: data ?? [],
      pagination: {
        page: input.page,
        pageSize: input.pageSize,
        total: count ?? 0,
        totalPages: Math.max(1, Math.ceil((count ?? 0) / input.pageSize)),
      },
    },
  }
}

export async function createAdminOrganisation(input: {
  adminClient: AdminClient
  payload: AdminOrganisationCreatePayload | null
}): Promise<
  | { ok: true; data: { organisation: unknown } }
  | { ok: false; error: 'name_required' | 'invalid_slug' | 'slug_taken' | 'create_failed' }
> {
  const name = String(input.payload?.name ?? '').trim()
  if (!name) {
    return { ok: false, error: 'name_required' }
  }

  const slug = String(input.payload?.slug ?? '').trim() || slugify(name)
  if (!isValidSlug(slug)) {
    return { ok: false, error: 'invalid_slug' }
  }

  const website = String(input.payload?.website ?? '').trim() || null

  const { data, error } = await input.adminClient
    .from('organisations')
    .insert({ name, slug, website })
    .select('id, name, slug, website, status, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'slug_taken' }
    }

    return { ok: false, error: 'create_failed' }
  }

  return {
    ok: true,
    data: {
      organisation: data,
    },
  }
}
