'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSelect } from '@/components/ui/foundation/field'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'

type AssessmentOption = { id: string; name: string; key: string; status: string }
type CampaignAssessment = {
  id: string
  assessment_id: string
  sort_order: number
  is_active: boolean
  created_at: string
  assessments: { id: string; key: string; name: string; status: string } | null
}

export default function CampaignAssessmentsPage() {
  const params = useParams<{ id: string }>()
  const campaignId = params.id
  const [assessments, setAssessments] = useState<CampaignAssessment[]>([])
  const [availableAssessments, setAvailableAssessments] = useState<AssessmentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [campaignRes, assessmentsRes] = await Promise.all([
      fetch(`/api/admin/campaigns/${campaignId}`, { cache: 'no-store' }),
      fetch('/api/admin/assessments', { cache: 'no-store' }),
    ])
    const campaignBody = (await campaignRes.json()) as {
      campaign?: { campaign_assessments?: CampaignAssessment[] }
    }
    const assessmentsBody = (await assessmentsRes.json()) as {
      assessments?: AssessmentOption[]
      surveys?: AssessmentOption[]
    }

    const currentAssessments = campaignBody.campaign?.campaign_assessments ?? []
    setAssessments(currentAssessments.sort((a, b) => a.sort_order - b.sort_order))

    const attachedIds = new Set(currentAssessments.map((assessment) => assessment.assessment_id))
    setAvailableAssessments(
      (assessmentsBody.assessments ?? assessmentsBody.surveys ?? []).filter(
        (assessment) => assessment.status === 'active' && !attachedIds.has(assessment.id)
      )
    )
    setLoading(false)
  }, [campaignId])

  useEffect(() => { void load() }, [load])

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

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Campaigns"
        title="Assessments"
        description="Attach active assessments to this campaign and control sequencing."
      />

      <DashboardKpiStrip
        items={[
          { label: 'Attached', value: assessments.length },
          { label: 'Available', value: availableAssessments.length },
          { label: 'Active attached', value: assessments.filter((assessment) => assessment.is_active).length },
        ]}
      />

      <FoundationSurface className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-[var(--admin-text-primary)]">Add assessment</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1">
            <FoundationSelect
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              required
            >
              <option value="">Select an assessment...</option>
              {availableAssessments.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>{assessment.name}</option>
              ))}
            </FoundationSelect>
          </div>
          <FoundationButton type="submit" variant="primary" disabled={adding || !selectedAssessmentId}>
            {adding ? 'Adding...' : 'Add'}
          </FoundationButton>
        </form>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </FoundationSurface>

      <DashboardDataTableShell>
        <table className="w-full text-left text-sm">
          <thead className="bg-[rgba(255,255,255,0.68)] text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Assessment</th>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">Loading assessments...</td></tr>
            ) : assessments.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">No assessments attached yet.</td></tr>
            ) : (
              assessments.map((assessment, idx) => (
                <tr key={assessment.id} className="border-t border-[rgba(103,127,159,0.12)]">
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-[var(--admin-text-primary)]">
                    {assessment.assessments?.name ?? assessment.assessment_id}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--admin-text-muted)]">{assessment.assessments?.key ?? '—'}</td>
                  <td className="px-4 py-3 text-[var(--admin-text-muted)]">{assessment.is_active ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-3">
                    <FoundationButton type="button" size="sm" variant="danger" onClick={() => void handleRemove(assessment.id)}>
                      Remove
                    </FoundationButton>
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
