'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

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

    const attachedIds = new Set(currentAssessments.map((a) => a.assessment_id))
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
    <div className="space-y-6">
      {/* Add assessment form */}
      {availableAssessments.length > 0 && (
        <form onSubmit={handleAdd} className="flex items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">Add assessment</label>
            <select
              value={selectedAssessmentId}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            >
              <option value="">Select an assessment...</option>
              {availableAssessments.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>{assessment.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={adding || !selectedAssessmentId}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </form>
      )}
      {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}

      {/* Assessments table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Survey</th>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">Loading...</td></tr>
            ) : assessments.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-400">No assessments attached yet.</td></tr>
            ) : (
              assessments.map((a, idx) => (
                <tr key={a.id} className="border-t border-zinc-100 dark:border-zinc-800">
                  <td className="px-4 py-3 text-zinc-500">{idx + 1}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {a.assessments?.name ?? a.assessment_id}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{a.assessments?.key ?? '—'}</td>
                  <td className="px-4 py-3 text-zinc-500">{a.is_active ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => void handleRemove(a.id)}
                      className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400"
                    >
                      Remove
                    </button>
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
