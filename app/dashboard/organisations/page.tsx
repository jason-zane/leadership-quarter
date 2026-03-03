'use client'

import { useEffect, useState } from 'react'

type Organisation = {
  id: string
  name: string
  slug: string
  website: string | null
  status: string
  created_at: string
}

function CreateOrganisationForm({ onCreated }: { onCreated: () => void }) {
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
      const body = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !body.ok) {
        setError(body.error === 'slug_taken' ? 'That slug is already in use.' : 'Failed to create organisation.')
        return
      }
      setName('')
      setSlug('')
      setWebsite('')
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">New organisation</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Name</label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            pattern="[a-z0-9][a-z0-9-]*"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Website (optional)</label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            type="url"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
      </div>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {submitting ? 'Creating...' : 'Create organisation'}
      </button>
    </form>
  )
}

export default function OrganisationsPage() {
  const [orgs, setOrgs] = useState<Organisation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    const res = await fetch('/api/admin/organisations', { cache: 'no-store' })
    const body = (await res.json()) as { organisations?: Organisation[] }
    setOrgs(body.organisations ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Organisations</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {showForm ? 'Cancel' : '+ New organisation'}
        </button>
      </div>

      {showForm && (
        <CreateOrganisationForm onCreated={() => { setShowForm(false); void load() }} />
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Website</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">Loading...</td></tr>
            ) : orgs.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">No organisations yet.</td></tr>
            ) : (
              orgs.map((org) => (
                <tr key={org.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{org.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{org.slug}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {org.website
                      ? <a href={org.website} target="_blank" rel="noreferrer" className="hover:underline">{org.website}</a>
                      : '—'
                    }
                  </td>
                  <td className="px-4 py-3 capitalize text-zinc-500">{org.status}</td>
                  <td className="px-4 py-3 text-zinc-500">
                    {new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(org.created_at))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
