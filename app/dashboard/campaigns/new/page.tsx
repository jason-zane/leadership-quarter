'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { CampaignConfig, RegistrationPosition, ReportAccess } from '@/utils/assessments/campaign-types'
import { DEFAULT_CAMPAIGN_CONFIG } from '@/utils/assessments/campaign-types'

type Organisation = { id: string; name: string; slug: string }
type AssessmentOption = { id: string; name: string; key: string; status: string }

function deriveSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function NewCampaignPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [orgId, setOrgId] = useState('')
  const [registrationPosition, setRegistrationPosition] = useState<RegistrationPosition>('before')
  const [reportAccess, setReportAccess] = useState<ReportAccess>('immediate')
  const [demographicsEnabled, setDemographicsEnabled] = useState(false)
  const [selectedAssessmentIds, setSelectedAssessmentIds] = useState<string[]>([])
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [availableAssessments, setAvailableAssessments] = useState<AssessmentOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/organisations?pageSize=200', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/admin/assessments', { cache: 'no-store' }).then((r) => r.json()),
    ]).then(([orgBody, assessmentBody]: [{ organisations?: Organisation[] }, { assessments?: AssessmentOption[]; surveys?: AssessmentOption[] }]) => {
      setOrganisations(orgBody.organisations ?? [])
      const list = assessmentBody.assessments ?? assessmentBody.surveys ?? []
      setAvailableAssessments(list.filter((assessment) => assessment.status === 'active'))
    }).catch(() => null)
  }, [])

  function handleNameChange(value: string) {
    setName(value)
    if (!slug || slug === deriveSlug(name)) {
      setSlug(deriveSlug(value))
    }
  }

  function toggleAssessment(id: string) {
    setSelectedAssessmentIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const config: CampaignConfig = {
      ...DEFAULT_CAMPAIGN_CONFIG,
      registration_position: registrationPosition,
      report_access: reportAccess,
      demographics_enabled: demographicsEnabled,
    }

    try {
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          organisation_id: orgId || null,
          config,
          assessment_ids: selectedAssessmentIds,
        }),
      })
      const body = (await res.json()) as { ok?: boolean; error?: string; campaign?: { id: string } }
      if (!res.ok || !body.ok) {
        setError(body.error === 'slug_taken' ? 'That slug is already in use.' : 'Failed to create campaign.')
        return
      }
      router.push(`/dashboard/campaigns/${body.campaign!.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">New campaign</h1>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 md:p-8">
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
            {slug && (
              <p className="mt-1 text-xs text-zinc-400">URL: /c/{slug}</p>
            )}
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
              <option value="before">Before assessment</option>
              <option value="after">After assessment</option>
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
          <div className="flex items-center gap-3">
            <input
              id="demographics"
              type="checkbox"
              checked={demographicsEnabled}
              onChange={(e) => setDemographicsEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            <label htmlFor="demographics" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Collect demographics
            </label>
          </div>
        </div>

        {availableAssessments.length > 0 && (
          <div>
            <label className="mb-2 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Assessments</label>
            <div className="space-y-2">
              {availableAssessments.map((assessment) => (
                <label key={assessment.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2.5 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={selectedAssessmentIds.includes(assessment.id)}
                    onChange={() => toggleAssessment(assessment.id)}
                    className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                  />
                  <span className="text-sm text-zinc-900 dark:text-zinc-100">{assessment.name}</span>
                  <span className="ml-auto font-mono text-xs text-zinc-400">{assessment.key}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {submitting ? 'Creating...' : 'Create campaign'}
          </button>
          <Link
            href="/dashboard/campaigns"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
