'use client'

import { useCallback, useEffect, useState } from 'react'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSelect } from '@/components/ui/foundation/field'
import { FoundationSurface } from '@/components/ui/foundation/surface'

type AssessmentOption = { id: string; name: string; key: string; status: string }
type CampaignAssessment = {
  id: string
  assessment_id: string
  sort_order: number
  is_active: boolean
  assessment_quota: number | null
  assessments: {
    id: string
    key: string
    name: string
    status: string
  } | null
}

type CampaignQuotaStatus = {
  campaign_assessment_id: string
  assessment_id: string
  used: number
  limit: number | null
  is_exceeded: boolean
}

type OrgQuotaStatus = {
  assessment_id: string
  used: number
  limit: number | null
}

export function CampaignAssessmentDeliveryPanel({ campaignId }: { campaignId: string }) {
  const [assessments, setAssessments] = useState<CampaignAssessment[]>([])
  const [availableAssessments, setAvailableAssessments] = useState<AssessmentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [campaignQuotaByAssessmentId, setCampaignQuotaByAssessmentId] = useState<Record<string, CampaignQuotaStatus>>({})
  const [orgQuotaByAssessmentId, setOrgQuotaByAssessmentId] = useState<Record<string, OrgQuotaStatus>>({})
  const [orgId, setOrgId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [campaignRes, assessmentsRes] = await Promise.all([
      fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
      fetch('/api/admin/assessments', { cache: 'no-store' }),
    ])
    const campaignBody = (await campaignRes.json()) as {
      campaign?: { campaign_assessments?: CampaignAssessment[]; organisation_id?: string | null }
    }
    const assessmentsBody = (await assessmentsRes.json()) as {
      assessments?: AssessmentOption[]
      surveys?: AssessmentOption[]
    }

    const currentAssessments = campaignBody.campaign?.campaign_assessments ?? []
    setAssessments(currentAssessments.sort((a, b) => a.sort_order - b.sort_order))

    const resolvedOrgId = campaignBody.campaign?.organisation_id ?? null
    setOrgId(resolvedOrgId)

    const attachedIds = new Set(currentAssessments.map((a) => a.assessment_id))
    setAvailableAssessments(
      (assessmentsBody.assessments ?? assessmentsBody.surveys ?? []).filter(
        (a) => a.status === 'active' && !attachedIds.has(a.id)
      )
    )

    const quotaFetches: Promise<void>[] = []

    quotaFetches.push(
      fetch(`/api/admin/campaigns/${campaignId}/assessment-quota`, { cache: 'no-store' })
        .then((res) => res.ok ? res.json() : null)
        .then((body: { statuses?: CampaignQuotaStatus[] } | null) => {
          setCampaignQuotaByAssessmentId(
            Object.fromEntries((body?.statuses ?? []).map((s) => [s.assessment_id, s]))
          )
        })
    )

    if (resolvedOrgId && currentAssessments.length > 0) {
      quotaFetches.push(
        fetch(`/api/admin/organisations/${resolvedOrgId}/assessment-quota`, { cache: 'no-store' })
          .then((res) => res.ok ? res.json() : null)
          .then((body: { statuses?: OrgQuotaStatus[] } | null) => {
            setOrgQuotaByAssessmentId(
              Object.fromEntries((body?.statuses ?? []).map((s) => [s.assessment_id, s]))
            )
          })
      )
    } else {
      setOrgQuotaByAssessmentId({})
    }

    await Promise.all(quotaFetches)
    setLoading(false)
  }, [campaignId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedAssessmentId) return
    setError(null)
    setAdding(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaignId}/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessment_id: selectedAssessmentId, sort_order: assessments.length }),
      })
      const body = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !body.ok) {
        setError('Failed to add assessment.')
        return
      }
      setSelectedAssessmentId('')
      await load()
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(assessmentId: string) {
    const res = await fetch(
      `/api/admin/campaigns/${campaignId}/assessments?assessmentId=${assessmentId}`,
      { method: 'DELETE' }
    )
    if (res.ok) await load()
  }

  async function handleUpdateCampaignQuota(campaignAssessmentId: string, quota: number | null) {
    await fetch(`/api/admin/campaigns/${campaignId}/assessments/${campaignAssessmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessment_quota: quota }),
    })
    await load()
  }

  const showOrgQuota = orgId !== null

  return (
    <FoundationSurface className="space-y-4 p-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Assessment setup</p>
        <h3 className="mt-2 font-serif text-[1.45rem] leading-[1.05] text-[var(--admin-text-primary)]">
          Attached assessments
        </h3>
        <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
          Manage which assessments are included in this campaign. Campaign quota limits how many participants can be invited to each assessment within this campaign specifically.
        </p>
      </div>

      <form onSubmit={(e) => { void handleAdd(e) }} className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <FoundationSelect
            value={selectedAssessmentId}
            onChange={(e) => setSelectedAssessmentId(e.target.value)}
            required
          >
            <option value="">Select an assessment to attach...</option>
            {availableAssessments.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </FoundationSelect>
        </div>
        <FoundationButton type="submit" variant="primary" disabled={adding || !selectedAssessmentId}>
          {adding ? 'Adding...' : 'Attach assessment'}
        </FoundationButton>
        {error ? <p className="w-full text-sm text-red-600">{error}</p> : null}
      </form>

      {loading ? (
        <p className="text-sm text-[var(--admin-text-muted)]">Loading...</p>
      ) : (
        <DashboardDataTableShell>
          <table className="w-full text-left text-sm">
            <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
              <tr>
                <th className="px-4 py-3">Assessment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Campaign used</th>
                <th className="px-4 py-3">Campaign quota</th>
                {showOrgQuota ? <th className="px-4 py-3">Org used / quota</th> : null}
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {assessments.length === 0 ? (
                <tr>
                  <td colSpan={showOrgQuota ? 6 : 5} className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">
                    No assessments attached yet. Select one above to get started.
                  </td>
                </tr>
              ) : (
                assessments.map((ca) => {
                  const cq = campaignQuotaByAssessmentId[ca.assessment_id] ?? null
                  const oq = orgQuotaByAssessmentId[ca.assessment_id] ?? null
                  return (
                    <tr key={ca.id} className="border-t border-[rgba(103,127,159,0.12)]">
                      <td className="px-4 py-3 text-[var(--admin-text-primary)]">
                        {ca.assessments?.name ?? ca.assessment_id}
                      </td>
                      <td className="px-4 py-3">
                        <span className={[
                          'inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em]',
                          ca.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600',
                        ].join(' ')}>
                          {ca.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                        {cq ? String(cq.used) : '0'}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          key={ca.assessment_quota ?? 'null'}
                          type="number"
                          min="1"
                          placeholder="∞"
                          defaultValue={ca.assessment_quota ?? ''}
                          className="w-20 rounded border border-[rgba(103,127,159,0.2)] px-2 py-1 text-center text-sm text-[var(--admin-text-primary)] placeholder-[var(--admin-text-soft)]"
                          onBlur={(e) => {
                            const raw = e.target.value.trim()
                            const value = raw === '' ? null : parseInt(raw, 10)
                            if (value !== null && (isNaN(value) || value < 1)) return
                            void handleUpdateCampaignQuota(ca.id, value)
                          }}
                        />
                      </td>
                      {showOrgQuota ? (
                        <td className="px-4 py-3 text-[var(--admin-text-muted)]">
                          {oq ? (
                            <span className={oq.limit !== null && oq.used >= oq.limit ? 'font-semibold text-red-600' : ''}>
                              {oq.used} / {oq.limit ?? '∞'}
                            </span>
                          ) : '—'}
                        </td>
                      ) : null}
                      <td className="px-4 py-3">
                        <FoundationButton
                          type="button"
                          size="sm"
                          variant="danger"
                          onClick={() => void handleRemove(ca.id)}
                        >
                          Remove
                        </FoundationButton>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </DashboardDataTableShell>
      )}
    </FoundationSurface>
  )
}
