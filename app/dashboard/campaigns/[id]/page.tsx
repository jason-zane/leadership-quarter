'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  DEMOGRAPHICS_FIELD_OPTIONS,
  type CampaignConfig,
  type CampaignStatus,
  type RegistrationPosition,
  type ReportAccess,
} from '@/utils/assessments/campaign-types'
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
  runner_overrides?: Record<string, unknown>
  organisation_id: string | null
  created_at: string
  updated_at: string
  organisations: { id: string; name: string; slug: string } | null
  campaign_assessments: CampaignAssessment[]
}

type Organisation = { id: string; name: string; slug: string }

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

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function CampaignOverviewPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [responseCount, setResponseCount] = useState<number | null>(null)
  const [runnerOverridesText, setRunnerOverridesText] = useState('{}')
  const [overridesSaving, setOverridesSaving] = useState(false)
  const [overridesError, setOverridesError] = useState<string | null>(null)
  const [overridesSavedAt, setOverridesSavedAt] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [orgId, setOrgId] = useState('')
  const [registrationPosition, setRegistrationPosition] = useState<RegistrationPosition>('before')
  const [reportAccess, setReportAccess] = useState<ReportAccess>('immediate')
  const [demographicsEnabled, setDemographicsEnabled] = useState(false)
  const [demographicsFields, setDemographicsFields] = useState<string[]>([])
  const [configSaving, setConfigSaving] = useState(false)
  const [configError, setConfigError] = useState<string | null>(null)
  const [configSavedAt, setConfigSavedAt] = useState<string | null>(null)

  function hydrateEditForm(nextCampaign: Campaign | null) {
    if (!nextCampaign) return
    setName(nextCampaign.name)
    setSlug(nextCampaign.slug)
    setOrgId(nextCampaign.organisation_id ?? '')
    setRegistrationPosition(nextCampaign.config.registration_position)
    setReportAccess(nextCampaign.config.report_access)
    setDemographicsEnabled(nextCampaign.config.demographics_enabled)
    setDemographicsFields(nextCampaign.config.demographics_fields ?? [])
  }

  async function reloadCampaign() {
    const [campaignRes, responsesRes] = await Promise.all([
      fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
      fetch(`/api/admin/campaigns/${campaignId}/responses`, { cache: 'no-store' }),
    ])
    const campaignBody = (await campaignRes.json()) as { campaign?: Campaign }
    const nextCampaign = campaignBody.campaign ?? null
    setCampaign(nextCampaign)
    setRunnerOverridesText(JSON.stringify(nextCampaign?.runner_overrides ?? {}, null, 2))
    hydrateEditForm(nextCampaign)

    if (responsesRes.ok) {
      const responsesBody = (await responsesRes.json()) as { responses?: unknown[] }
      setResponseCount(responsesBody.responses?.length ?? 0)
    }

    setLoading(false)
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)

      const [campaignRes, responsesRes, orgRes] = await Promise.all([
        fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
        fetch(`/api/admin/campaigns/${campaignId}/responses`, { cache: 'no-store' }),
        fetch('/api/admin/organisations?pageSize=200', { cache: 'no-store' }),
      ])

      const campaignBody = (await campaignRes.json()) as { campaign?: Campaign }
      const responsesBody = responsesRes.ok ? ((await responsesRes.json()) as { responses?: unknown[] }) : { responses: [] }
      const orgBody = (await orgRes.json().catch(() => null)) as { organisations?: Organisation[] } | null

      if (!active) return
      const nextCampaign = campaignBody.campaign ?? null
      setCampaign(nextCampaign)
      setRunnerOverridesText(JSON.stringify(nextCampaign?.runner_overrides ?? {}, null, 2))
      hydrateEditForm(nextCampaign)
      setResponseCount(responsesBody.responses?.length ?? 0)
      setOrganisations(orgBody?.organisations ?? [])
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [campaignId])

  async function setStatus(status: CampaignStatus) {
    setSaving(true)
    await fetch(`/api/admin/campaigns/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await reloadCampaign()
    setSaving(false)
  }

  function toggleDemographicsField(field: string) {
    setDemographicsFields((prev) => (prev.includes(field) ? prev.filter((item) => item !== field) : [...prev, field]))
  }

  async function saveCampaignConfig() {
    setConfigSaving(true)
    setConfigError(null)
    setConfigSavedAt(null)

    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: normalizeSlug(slug),
          organisation_id: orgId || null,
          config: {
            registration_position: registrationPosition,
            report_access: reportAccess,
            demographics_enabled: demographicsEnabled,
            demographics_fields: demographicsEnabled ? demographicsFields : [],
          },
        }),
      })
      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!response.ok || !body?.ok) {
        if (body?.error === 'slug_taken') {
          setConfigError('That slug is already in use.')
          return
        }
        if (body?.error === 'invalid_slug') {
          setConfigError('Slug must contain only lowercase letters, numbers, and dashes.')
          return
        }
        setConfigError(body?.error ?? 'Failed to save campaign configuration.')
        return
      }
      setConfigSavedAt(new Date().toLocaleTimeString())
      await reloadCampaign()
    } finally {
      setConfigSaving(false)
    }
  }

  async function saveRunnerOverrides() {
    let parsed: Record<string, unknown>
    setOverridesError(null)
    setOverridesSavedAt(null)

    try {
      const raw = JSON.parse(runnerOverridesText) as unknown
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error('invalid')
      }
      parsed = raw as Record<string, unknown>
    } catch {
      setOverridesError('Runner overrides must be a valid JSON object.')
      return
    }

    setOverridesSaving(true)
    try {
      const response = await fetch(`/api/admin/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runner_overrides: parsed }),
      })
      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!response.ok || !body?.ok) {
        setOverridesError(body?.error ?? 'Failed to save runner overrides.')
        return
      }
      setOverridesSavedAt(new Date().toLocaleTimeString())
      await reloadCampaign()
    } finally {
      setOverridesSaving(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-400">Loading...</p>
  }

  if (!campaign) {
    return <p className="text-sm text-red-500">Campaign not found.</p>
  }

  const campaignUrl = `${getSiteUrl()}/assess/c/${campaign.slug}`
  const activeAssessments = campaign.campaign_assessments.filter((assessment) => assessment.is_active).length
  const transitions = STATUS_TRANSITIONS[campaign.status] ?? []

  const surveyOptions = campaign.campaign_assessments
    .filter((assessment) => assessment.assessments)
    .map((assessment) => ({ id: assessment.assessment_id, name: assessment.assessments!.name }))

  return (
    <div className="space-y-6">
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
        {surveyOptions.length > 0 ? (
          <InviteDialog assessments={surveyOptions} onInvited={() => void reloadCampaign()} />
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Assessments" value={activeAssessments} />
        <StatCard label="Organisation" value={campaign.organisations?.name ?? 'Public'} />
        <StatCard label="Registration" value={campaign.config.registration_position} />
        <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Responses</p>
          <p className="mt-1 text-lg font-semibold capitalize text-zinc-900 dark:text-zinc-100">{responseCount ?? '—'}</p>
          <Link href={`/dashboard/campaigns/${campaignId}/responses`} className="mt-1 block text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            View all →
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Campaign URL</p>
        <div className="flex items-center gap-3">
          <code className="flex-1 rounded-lg bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {campaignUrl}
          </code>
          <CopyButton text={campaignUrl} />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Edit campaign</p>
        <p className="mb-4 text-xs text-zinc-500">Update campaign settings and experience controls.</p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Slug</span>
            <input
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Organisation</span>
            <select
              value={orgId}
              onChange={(event) => setOrgId(event.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="">None (public)</option>
              {organisations.map((organisation) => (
                <option key={organisation.id} value={organisation.id}>
                  {organisation.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Registration position</span>
            <select
              value={registrationPosition}
              onChange={(event) => setRegistrationPosition(event.target.value as RegistrationPosition)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="before">Before assessment</option>
              <option value="after">After assessment</option>
              <option value="none">None (anonymous)</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Report access</span>
            <select
              value={reportAccess}
              onChange={(event) => setReportAccess(event.target.value as ReportAccess)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="immediate">Immediate</option>
              <option value="gated">Gated</option>
              <option value="none">None</option>
            </select>
          </label>
          <label className="flex items-center gap-2 pt-6 text-sm text-zinc-700 dark:text-zinc-200">
            <input
              type="checkbox"
              checked={demographicsEnabled}
              onChange={(event) => setDemographicsEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            Collect demographics
          </label>
        </div>

        {demographicsEnabled ? (
          <div className="mt-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Demographics fields</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {DEMOGRAPHICS_FIELD_OPTIONS.map((field) => (
                <label key={field.key} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                  <input
                    type="checkbox"
                    checked={demographicsFields.includes(field.key)}
                    onChange={() => toggleDemographicsField(field.key)}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {configError ? <p className="mt-3 text-sm text-red-600">{configError}</p> : null}
        {configSavedAt ? <p className="mt-3 text-xs text-emerald-600">Saved at {configSavedAt}</p> : null}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => void saveCampaignConfig()}
            disabled={configSaving}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {configSaving ? 'Saving...' : 'Save campaign settings'}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Configuration</p>
        <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <ConfigRow label="Report access" value={campaign.config.report_access} />
          <ConfigRow label="Demographics" value={campaign.config.demographics_enabled ? 'Enabled' : 'Disabled'} />
          <ConfigRow label="Created" value={new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(campaign.created_at))} />
        </dl>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">Experience overrides</p>
        <p className="mb-3 text-xs text-zinc-500">Override assessment runner config for this campaign only.</p>
        <textarea
          value={runnerOverridesText}
          onChange={(event) => setRunnerOverridesText(event.target.value)}
          rows={12}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
        />
        {overridesError ? <p className="mt-2 text-sm text-red-600">{overridesError}</p> : null}
        {overridesSavedAt ? <p className="mt-2 text-xs text-emerald-600">Saved at {overridesSavedAt}</p> : null}
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void saveRunnerOverrides()}
            disabled={overridesSaving}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {overridesSaving ? 'Saving...' : 'Save overrides'}
          </button>
        </div>
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
      onClick={() => void copy()}
      className="shrink-0 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

