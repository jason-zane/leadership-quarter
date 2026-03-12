import type { RouteAuthSuccess } from '@/utils/assessments/api-auth'

type AdminClient = RouteAuthSuccess['adminClient']

type AdminOrganisationCreatePayload = {
  name?: string
  slug?: string
  website?: string
}

async function logAdminAction(input: {
  adminClient: AdminClient
  actorUserId: string
  action: string
  details?: Record<string, string | number | boolean | null>
}) {
  await input.adminClient.from('admin_audit_logs').insert({
    actor_user_id: input.actorUserId,
    action: input.action,
    details: input.details ?? {},
  })
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

export async function deleteAdminOrganisation(input: {
  adminClient: AdminClient
  actorUserId: string
  organisationId: string
}): Promise<
  | { ok: true }
  | { ok: false; error: 'organisation_not_found' | 'delete_failed' }
> {
  const { data: existing, error: existingError } = await input.adminClient
    .from('organisations')
    .select('id, name, slug')
    .eq('id', input.organisationId)
    .maybeSingle()

  if (existingError || !existing) {
    return { ok: false, error: 'organisation_not_found' }
  }

  const { error } = await input.adminClient
    .from('organisations')
    .delete()
    .eq('id', input.organisationId)

  if (error) {
    return { ok: false, error: 'delete_failed' }
  }

  await logAdminAction({
    adminClient: input.adminClient,
    actorUserId: input.actorUserId,
    action: 'organisation_deleted',
    details: {
      organisation_id: existing.id,
      organisation_name: existing.name,
      organisation_slug: existing.slug,
    },
  })

  return { ok: true }
}
