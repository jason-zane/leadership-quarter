'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PlusIcon } from '@/components/icons'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationInput } from '@/components/ui/foundation/field'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'

type Organisation = {
  id: string
  name: string
  slug: string
  website: string | null
  status: string
  created_at: string
}

type OrganisationsResponse = {
  organisations?: Organisation[]
  viewer?: {
    canLaunchPortal?: boolean
  }
}

function CreateOrganisationForm({ onCreated }: { onCreated: (organisationId: string) => void }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [website, setWebsite] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function deriveSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function handleNameChange(value: string) {
    setName(value)
    if (!slug || slug === deriveSlug(name)) {
      setSlug(deriveSlug(value))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/admin/organisations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug, website: website || undefined }),
      })
      const body = (await res.json()) as {
        ok?: boolean
        error?: string
        organisation?: { id?: string }
      }
      if (!res.ok || !body.ok) {
        setError(
          body.error === 'slug_taken'
            ? 'That slug is already in use.'
            : 'Failed to create client.'
        )
        return
      }
      const organisationId = body.organisation?.id
      if (!organisationId) {
        setError('Client was created, but setup could not be opened. Please open it from the list.')
        return
      }
      setName('')
      setSlug('')
      setWebsite('')
      onCreated(organisationId)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FoundationSurface className="space-y-4 p-5">
      <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">New client</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Name</label>
            <FoundationInput
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              placeholder="Client name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Slug</label>
            <FoundationInput
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              pattern="[a-z0-9][a-z0-9-]*"
              className="font-mono"
              placeholder="client-slug"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Website (optional)</label>
            <FoundationInput
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              type="url"
              placeholder="https://example.com"
            />
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <FoundationButton type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create client'}
        </FoundationButton>
      </form>
    </FoundationSurface>
  )
}

export default function ClientsPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<Organisation[]>([])
  const [canLaunchPortal, setCanLaunchPortal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/organisations', { cache: 'no-store' })
    const body = (await res.json()) as OrganisationsResponse
    setOrgs(body.organisations ?? [])
    setCanLaunchPortal(body.viewer?.canLaunchPortal === true)
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true
    fetch('/api/admin/organisations', { cache: 'no-store' })
      .then((res) => res.json() as Promise<OrganisationsResponse>)
      .then((body) => {
        if (!mounted) return
        setOrgs(body.organisations ?? [])
        setCanLaunchPortal(body.viewer?.canLaunchPortal === true)
        setLoading(false)
      })
      .catch(() => {
        if (!mounted) return
        setOrgs([])
        setCanLaunchPortal(false)
        setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const activeCount = orgs.filter((org) => org.status === 'active').length

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="CRM"
        title="Clients"
        description="Manage client organisations used across campaign ownership, portal access, and reporting."
        actions={(
          <FoundationButton type="button" variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm((v) => !v)}>
            <PlusIcon className="h-4 w-4" />
            {showForm ? 'Hide form' : 'New client'}
          </FoundationButton>
        )}
      />

      <DashboardKpiStrip
        items={[
          { label: 'Total', value: orgs.length },
          { label: 'Active', value: activeCount },
          { label: 'Draft or inactive', value: orgs.length - activeCount },
        ]}
      />

      {showForm && (
        <CreateOrganisationForm
          onCreated={(organisationId) => {
            setShowForm(false)
            router.push(`/dashboard/clients/${organisationId}?setup=1&created=1`)
            router.refresh()
          }}
        />
      )}

      <DashboardDataTableShell>
        <table className="w-full text-left text-sm">
          <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Website</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">
                  Loading clients...
                </td>
              </tr>
            ) : orgs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">
                  No clients yet.
                </td>
              </tr>
            ) : (
              orgs.map((org) => (
                <tr key={org.id} className="border-t border-[rgba(103,127,159,0.12)]">
                  <td className="px-4 py-3 font-medium text-[var(--admin-text-primary)]">{org.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--admin-text-muted)]">{org.slug}</td>
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                    {org.website ? (
                      <a href={org.website} target="_blank" rel="noreferrer" className="hover:underline">
                        {org.website}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize">
                    <span className={org.status === 'active' ? 'rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700' : 'rounded-full bg-[var(--admin-accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--admin-accent-strong)]'}>
                      {org.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                    {new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(org.created_at))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/dashboard/clients/${org.id}`}
                        className="text-xs font-semibold text-[var(--admin-accent)] underline-offset-2 hover:underline"
                      >
                        Manage
                      </Link>
                      {canLaunchPortal ? (
                        <form
                          action={`/api/admin/organisations/${org.id}/portal-launch`}
                          method="post"
                          target="_blank"
                        >
                          <button
                            type="submit"
                            className="text-xs font-semibold text-[var(--admin-accent)] underline-offset-2 hover:underline"
                          >
                            Open portal
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </DashboardDataTableShell>
    </DashboardPageShell>
  )
}
