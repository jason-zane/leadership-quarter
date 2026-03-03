'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { CampaignConfig, RegistrationPosition, ReportAccess } from '@/utils/surveys/campaign-types'
import { DEFAULT_CAMPAIGN_CONFIG } from '@/utils/surveys/campaign-types'

type Organisation = {
  id: string
  name: string
  slug: string
}

type Campaign = {
  id: string
  name: string
  slug: string
  status: string
  config: CampaignConfig
  created_at: string
  organisations: Organisation | null
}

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  archived: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function getSiteUrl() {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

function CopyLinkButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(`${getSiteUrl()}/survey/c/${slug}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
      {copied ? 'Copied' : 'Copy link'}
    </button>
  )
}

function CreateCampaignForm({
  surveyId,
  organisations,
  onCreated,
}: {
  surveyId: string
  organisations: Organisation[]
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [orgId, setOrgId] = useState('')
  const [registrationPosition, setRegistrationPosition] = useState<RegistrationPosition>('before')
  const [reportAccess, setReportAccess] = useState<ReportAccess>('immediate')
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

    const config: Partial<CampaignConfig> = {
      ...DEFAULT_CAMPAIGN_CONFIG,
      registration_position: registrationPosition,
      report_access: reportAccess,
    }

    try {
      const res = await fetch(`/api/admin/surveys/${surveyId}/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          organisation_id: orgId || null,
          config,
        }),
      })
      const body = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !body.ok) {
        setError(body.error === 'slug_taken' ? 'That slug is already in use.' : 'Failed to create campaign.')
        return
      }
      setName('')
      setSlug('')
      setOrgId('')
      onCreated()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">New campaign</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Name</label>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            pattern="[a-z0-9][a-z0-9-]*"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Organisation (optional)</label>
          <select
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="">None (public)</option>
            {organisations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Registration position</label>
          <select
            value={registrationPosition}
            onChange={(e) => setRegistrationPosition(e.target.value as RegistrationPosition)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="before">Before survey</option>
            <option value="after">After survey</option>
            <option value="none">None (anonymous)</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Report access</label>
          <select
            value={reportAccess}
            onChange={(e) => setReportAccess(e.target.value as ReportAccess)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          >
            <option value="immediate">Immediate</option>
            <option value="gated">Gated (download form)</option>
            <option value="none">None</option>
          </select>
        </div>
      </div>
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {submitting ? 'Creating...' : 'Create campaign'}
      </button>
    </form>
  )
}

export default function SurveyCampaignsPage() {
  const params = useParams<{ id: string }>()
  const surveyId = params.id
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    const [cRes, oRes] = await Promise.all([
      fetch(`/api/admin/surveys/${surveyId}/campaigns`, { cache: 'no-store' }),
      fetch('/api/admin/organisations?pageSize=200', { cache: 'no-store' }),
    ])
    const cBody = (await cRes.json()) as { campaigns?: Campaign[] }
    const oBody = (await oRes.json()) as { organisations?: Organisation[] }
    setCampaigns(cBody.campaigns ?? [])
    setOrganisations(oBody.organisations ?? [])
    setLoading(false)
  }, [surveyId])

  useEffect(() => { void load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {showForm ? 'Cancel' : '+ New campaign'}
        </button>
      </div>

      {showForm && (
        <CreateCampaignForm
          surveyId={surveyId}
          organisations={organisations}
          onCreated={() => { setShowForm(false); void load() }}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Organisation</th>
              <th className="px-4 py-3 font-medium">URL</th>
              <th className="px-4 py-3 font-medium">Registration</th>
              <th className="px-4 py-3 font-medium">Report</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-400">Loading...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-zinc-400">No campaigns yet.</td></tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{campaign.name}</td>
                  <td className="px-4 py-3 text-zinc-500">{campaign.organisations?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-zinc-500">/survey/c/{campaign.slug}</span>
                  </td>
                  <td className="px-4 py-3 capitalize text-zinc-500">{campaign.config.registration_position}</td>
                  <td className="px-4 py-3 capitalize text-zinc-500">{campaign.config.report_access}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[campaign.status] ?? statusColors.draft}`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <CopyLinkButton slug={campaign.slug} />
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
