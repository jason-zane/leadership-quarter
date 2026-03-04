'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Campaign = {
  id: string
  name: string
  slug: string
  status: 'draft' | 'active' | 'closed' | 'archived'
  created_at: string
}

type AssessmentItem = {
  assessment_id: string
  assessment: { id: string; key: string; name: string }
}

export default function PortalCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [assessments, setAssessments] = useState<AssessmentItem[]>([])
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [assessmentId, setAssessmentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const [campaignRes, assessmentRes] = await Promise.all([
      fetch('/api/portal/campaigns', { cache: 'no-store' }),
      fetch('/api/portal/assessments', { cache: 'no-store' }),
    ])

    const campaignBody = (await campaignRes.json()) as { campaigns?: Campaign[] }
    const assessmentBody = (await assessmentRes.json()) as { assessments?: AssessmentItem[] }

    setCampaigns(campaignBody.campaigns ?? [])
    setAssessments(assessmentBody.assessments ?? [])
    setLoading(false)
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!mounted) return
      await load()
    })()
    return () => {
      mounted = false
    }
  }, [])

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault()
    if (!assessmentId) {
      setError('Select an assessment.')
      return
    }

    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/portal/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug: slug || undefined, assessment_ids: [assessmentId] }),
      })
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string }
      if (!res.ok || !body.ok) {
        setError(body.message ?? body.error ?? 'Failed to create campaign.')
        return
      }

      setName('')
      setSlug('')
      setAssessmentId('')
      await load()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Campaigns</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Create and manage assessment campaigns.</p>
      </div>

      <form onSubmit={createCampaign} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">New campaign</h2>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name"
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug-optional"
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
          <select
            value={assessmentId}
            onChange={(e) => setAssessmentId(e.target.value)}
            required
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <option value="">Select assessment</option>
            {assessments.map((row) => (
              <option key={row.assessment_id} value={row.assessment_id}>
                {row.assessment.name} ({row.assessment.key})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </form>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  Loading...
                </td>
              </tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
                  No campaigns yet.
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{campaign.name}</td>
                  <td className="px-4 py-3 capitalize text-zinc-500">{campaign.status}</td>
                  <td className="px-4 py-3 text-zinc-500">{new Date(campaign.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link href={`/portal/campaigns/${campaign.id}`} className="text-xs font-medium underline">
                      Open
                    </Link>
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
