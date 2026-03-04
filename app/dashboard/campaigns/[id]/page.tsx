'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import type { CampaignConfig, CampaignStatus } from '@/utils/assessments/campaign-types'
import { InviteDialog } from '@/components/dashboard/invite-dialog'

type CampaignAssessment = {
  id: string
  assessment_id: string
  is_active: boolean
  assessments: { id: string; key: string; name: string; status: string } | null
}

type Campaign = {
  id: string
  name: string
  slug: string
  status: CampaignStatus
  config: CampaignConfig
  organisation_id: string | null
  created_at: string
  updated_at: string
  organisations: { id: string; name: string; slug: string } | null
  campaign_assessments: CampaignAssessment[]
}

const statusColors: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  archived: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ['active'],
  active: ['closed'],
  closed: ['archived', 'active'],
  archived: [],
}

function getSiteUrl() {
  return typeof window !== 'undefined' ? window.location.origin : ''
}

export default function CampaignOverviewPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [responseCount, setResponseCount] = useState<number | null>(null)

  async function load() {
    const [campaignRes, responsesRes] = await Promise.all([
      fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
      fetch(`/api/admin/campaigns/${campaignId}/responses`, { cache: 'no-store' }),
    ])
    const campaignBody = (await campaignRes.json()) as { campaign?: Campaign }
    setCampaign(campaignBody.campaign ?? null)

    if (responsesRes.ok) {
      const responsesBody = (await responsesRes.json()) as { responses?: unknown[] }
      setResponseCount(responsesBody.responses?.length ?? 0)
    }

    setLoading(false)
  }

  useEffect(() => { void load() }, [campaignId])

  async function setStatus(status: CampaignStatus) {
    setSaving(true)
    await fetch(`/api/admin/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
    setSaving(false)
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading...</p>
  }

  if (!campaign) {
    return <p className="text-sm text-red-500">Campaign not found.</p>
  }

  const campaignUrl = `${getSiteUrl()}/c/${campaign.slug}`
  const activeAssessments = campaign.campaign_assessments.filter((a) => a.is_active).length
  const transitions = STATUS_TRANSITIONS[campaign.status] ?? []

  const surveyOptions = campaign.campaign_assessments
    .filter((a) => a.assessments)
    .map((a) => ({ id: a.assessment_id, name: a.assessments!.name }))

  return (
    <div className="space-y-6">
      {/* Status + actions */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${statusColors[campaign.status] ?? statusColors.draft}`}>
          {campaign.status}
        </span>
        {transitions.map((next) => (
          <button
            key={next}
            onClick={() => void setStatus(next)}
            disabled={saving}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {next === 'active' ? 'Activate' : next === 'closed' ? 'Close' : next === 'archived' ? 'Archive' : next}
          </button>
        ))}
        {surveyOptions.length > 0 && (
          <InviteDialog assessments={surveyOptions} onInvited={() => void load()} />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Assessments" value={activeAssessments} />
        <StatCard label="Organisation" value={campaign.organisations?.name ?? 'Public'} />
        <StatCard label="Registration" value={campaign.config.registration_position} />
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Responses</p>
          <p className="mt-1 text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-100">
            {responseCount ?? '—'}
          </p>
          <Link href={`/dashboard/campaigns/${campaignId}/responses`} className="mt-1 block text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            View all →
          </Link>
        </div>
      </div>

      {/* Campaign URL */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Campaign URL</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 rounded-lg bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {campaignUrl}
          </code>
          <CopyButton text={campaignUrl} />
        </div>
      </div>

      {/* Config details */}
      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-400">Configuration</p>
        <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <ConfigRow label="Report access" value={campaign.config.report_access} />
          <ConfigRow label="Demographics" value={campaign.config.demographics_enabled ? 'Enabled' : 'Disabled'} />
          <ConfigRow label="Created" value={new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(campaign.created_at))} />
        </dl>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-100">{value}</p>
    </div>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-medium capitalize text-zinc-900 dark:text-zinc-100">{value}</dd>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button
      onClick={copy}
      className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}
