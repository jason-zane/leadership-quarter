import Link from 'next/link'
import { createAdminClient } from '@/utils/supabase/admin'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'

type EmailTemplateRow = {
  key: string
  slug: string
  name: string
  description: string | null
  subject: string
  status: 'active' | 'draft' | string
  updated_at: string
}

type UsageRow = {
  usage_key: string
  usage_name: string
  route_hint: string | null
  template_key: string | null
}

function compactDate(value: string) {
  return new Date(value).toLocaleString()
}

export default async function EmailTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const q = typeof params.q === 'string' ? params.q.trim().toLowerCase() : ''
  const statusFilter = typeof params.status === 'string' ? params.status : 'all'
  const attachmentFilter = typeof params.attachment === 'string' ? params.attachment : 'all'

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
    const usages = usagesByTemplateKey.get(template.key) ?? []
    const isAttached = usages.length > 0

    if (statusFilter !== 'all' && template.status !== statusFilter) return false
    if (attachmentFilter === 'attached' && !isAttached) return false
    if (attachmentFilter === 'unattached' && isAttached) return false

    if (!q) return true

    const usageText = usages
      .map((usage) => `${usage.usage_name} ${usage.usage_key} ${usage.route_hint ?? ''}`)
      .join(' ')
      .toLowerCase()

    return (
      template.name.toLowerCase().includes(q) ||
      template.subject.toLowerCase().includes(q) ||
      template.slug.toLowerCase().includes(q) ||
      template.key.toLowerCase().includes(q) ||
      usageText.includes(q)
    )
  })

  const kpis = {
    total: templateRows.length,
    active: templateRows.filter((template) => template.status === 'active').length,
    draft: templateRows.filter((template) => template.status === 'draft').length,
    attached: templateRows.filter((template) => (usagesByTemplateKey.get(template.key) ?? []).length > 0).length,
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Email operations"
        title="Email Templates"
        description="Manage templates, where they are attached, and what is ready to send."
        actions={
          <Link
            href="/dashboard/emails/new"
            className="foundation-btn foundation-btn-primary px-4 py-2 text-sm"
          >
            New template
          </Link>
        }
      />

      <DashboardKpiStrip
        items={[
          { label: 'Total templates', value: kpis.total },
          { label: 'Active', value: kpis.active },
          { label: 'Draft', value: kpis.draft },
          { label: 'Attached', value: kpis.attached },
        ]}
      />

      <form className="foundation-surface foundation-surface-admin admin-filter-bar gap-3">
        <div className="flex min-w-[260px] flex-1 items-center gap-2">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search name, subject, key, usage..."
            className="foundation-field flex-1"
          />
          <button type="submit" className="foundation-btn foundation-btn-secondary px-3 py-2 text-xs">
            Apply
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select name="status" defaultValue={statusFilter} className="foundation-field min-w-[130px]">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </select>
          <select name="attachment" defaultValue={attachmentFilter} className="foundation-field min-w-[140px]">
            <option value="all">All attachments</option>
            <option value="attached">Attached</option>
            <option value="unattached">Unattached</option>
          </select>
        </div>
      </form>

      {loadError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Could not load templates: {loadError}
        </div>
      ) : null}

      <DashboardDataTableShell>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
            <tr>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Attached flows</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--admin-text-muted)]">
                  No templates match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((template) => {
                const usages = usagesByTemplateKey.get(template.key) ?? []
                return (
                  <tr key={template.key} className="border-t border-[var(--admin-border)] align-top">
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/emails/${template.key}`}
                        className="font-medium text-[var(--admin-text-primary)] hover:text-[var(--admin-accent-strong)]"
                      >
                        {template.name}
                      </Link>
                      <p className="mt-1 text-xs text-[var(--admin-text-soft)]">{template.subject}</p>
                      <p className="mt-1 font-mono text-[11px] text-[var(--admin-text-muted)]">{template.key}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          'rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
                          template.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-[var(--admin-accent-soft)] text-[var(--admin-accent-strong)]',
                        ].join(' ')}
                      >
                        {template.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {usages.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {usages.slice(0, 3).map((usage) => (
                            <span
                              key={usage.usage_key}
                              className="rounded bg-[var(--admin-surface-alt)] px-2 py-1 text-xs text-[var(--admin-text-primary)]"
                            >
                              {usage.usage_name}
                            </span>
                          ))}
                          {usages.length > 3 ? (
                            <span className="rounded bg-[var(--admin-surface-alt)] px-2 py-1 text-xs text-[var(--admin-text-muted)]">
                              +{usages.length - 3}
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--admin-text-muted)]">Unattached</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text-muted)]">{compactDate(template.updated_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/emails/${template.key}`}
                        className="text-xs font-semibold text-[var(--admin-accent)] hover:text-[var(--admin-accent-strong)]"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </DashboardDataTableShell>
    </DashboardPageShell>
  )
}
