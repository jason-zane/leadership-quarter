import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'

type EmailTemplateRow = {
  key: string
  slug: string
  name: string
  description: string | null
  subject: string
  status: string
  updated_at: string
}

type UsageRow = {
  usage_key: string
  usage_name: string
  route_hint: string | null
  template_key: string | null
}

export default async function EmailTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.trim().toLowerCase() : ''
  const statusFilter = typeof params.status === 'string' ? params.status : 'all'

  const adminClient = createAdminClient()
  let loadError: string | null = null
  let templateRows: EmailTemplateRow[] = []
  let usageRows: UsageRow[] = []

  if (!adminClient) {
    loadError = 'Missing SUPABASE_SERVICE_ROLE_KEY. Cannot load email templates.'
  } else {
    const [{ data: templatesData, error: templatesError }, { data: usagesData, error: usagesError }] =
      await Promise.all([
        adminClient
          .from('email_templates')
          .select('key, slug, name, description, subject, status, updated_at')
          .order('updated_at', { ascending: false }),
        adminClient
          .from('email_template_usages')
          .select('usage_key, usage_name, route_hint, template_key')
          .order('usage_name', { ascending: true }),
      ])

    if (templatesError) {
      loadError = templatesError.message
    } else if (usagesError) {
      loadError = usagesError.message
    } else {
      templateRows = (templatesData ?? []) as EmailTemplateRow[]
      usageRows = (usagesData ?? []) as UsageRow[]
    }
  }

  const usagesByTemplateKey = new Map<string, UsageRow[]>()
  for (const usage of usageRows) {
    if (!usage.template_key) continue
    const existing = usagesByTemplateKey.get(usage.template_key) ?? []
    existing.push(usage)
    usagesByTemplateKey.set(usage.template_key, existing)
  }

  const filtered = templateRows.filter((template) => {
    if (statusFilter !== 'all' && template.status !== statusFilter) return false
    if (!q) return true
    const usageText = (usagesByTemplateKey.get(template.key) ?? [])
      .map((usage) => `${usage.usage_name} ${usage.usage_key}`)
      .join(' ')
      .toLowerCase()

    return (
      template.name.toLowerCase().includes(q) ||
      template.subject.toLowerCase().includes(q) ||
      template.slug.toLowerCase().includes(q) ||
      usageText.includes(q)
    )
  })

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Email Templates</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Create and manage emails with visual editing and usage mapping.
          </p>
        </div>
        <Link
          href="/dashboard/emails/new"
          className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          New Email Template
        </Link>
      </div>

      <form className="mb-6 grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-4">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search templates or attached flows..."
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400 md:col-span-3"
        />
        <div className="flex gap-2">
          <select
            name="status"
            defaultValue={statusFilter}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:focus:ring-zinc-400"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Filter
          </button>
        </div>
      </form>

      {loadError ? (
        <p className="mb-6 rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
          Could not load templates: {loadError}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.map((template) => {
          const usages = usagesByTemplateKey.get(template.key) ?? []
          return (
            <Link
              key={template.key}
              href={`/dashboard/emails/${template.key}`}
              className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
            >
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{template.name}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    template.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                  }`}
                >
                  {template.status}
                </span>
              </div>
              <p className="truncate text-sm text-zinc-600 dark:text-zinc-300">Subject: {template.subject}</p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Key: {template.key}</p>
              <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
                Updated: {new Date(template.updated_at).toLocaleString()}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {usages.length > 0 ? (
                  usages.map((usage) => (
                    <span
                      key={usage.usage_key}
                      className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    >
                      {usage.usage_name}
                    </span>
                  ))
                ) : (
                  <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    Not attached
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
