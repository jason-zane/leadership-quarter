'use client'

import Link from 'next/link'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { useUnsavedChanges } from '@/components/dashboard/hooks/use-unsaved-changes'
import { ReportCompetencyCopyEditor } from '@/components/dashboard/assessments/report-competency-copy-editor'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSelect } from '@/components/ui/foundation/field'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import { DashboardDataTableShell } from '@/components/dashboard/ui/data-table-shell'
import { normalizeReportConfig, type ReportCompetencyOverrides } from '@/utils/assessments/experience-config'
import {
  getReportCompetencyDefinitions,
  normalizeCampaignAssessmentReportDeliveryConfig,
  normalizeCampaignAssessmentReportOverrides,
} from '@/utils/reports/report-overrides'

type AssessmentOption = { id: string; name: string; key: string; status: string }
type ReportVariantOption = {
  id: string
  name: string
  version: number
  is_default: boolean
  definitionLabel: string
}
type CampaignAssessment = {
  id: string
  assessment_id: string
  sort_order: number
  is_active: boolean
  report_overrides?: Record<string, unknown>
  report_delivery_config?: Record<string, unknown>
  created_at: string
  assessments: {
    id: string
    key: string
    name: string
    external_name?: string
    status: string
    report_config?: unknown
    scoring_config?: unknown
  } | null
}

export function CampaignAssessmentDeliveryPanel({ campaignId }: { campaignId: string }) {
  const [assessments, setAssessments] = useState<CampaignAssessment[]>([])
  const [availableAssessments, setAvailableAssessments] = useState<AssessmentOption[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [expandedAssessmentId, setExpandedAssessmentId] = useState<string | null>(null)
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, ReportCompetencyOverrides>>({})
  const [deliveryDrafts, setDeliveryDrafts] = useState<Record<string, {
    publicDefaultReportVariantId: string
    internalAllowedReportVariantIds: string[]
  }>>({})
  const [variantOptionsByAssessmentId, setVariantOptionsByAssessmentId] = useState<Record<string, ReportVariantOption[]>>({})
  const [savingOverrideId, setSavingOverrideId] = useState<string | null>(null)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [overrideSavedId, setOverrideSavedId] = useState<string | null>(null)
  const unsavedSnapshot = useMemo(
    () => ({ overrideDrafts, deliveryDrafts }),
    [deliveryDrafts, overrideDrafts]
  )
  const { isDirty, markSaved } = useUnsavedChanges(unsavedSnapshot)

  const load = useCallback(async () => {
    setLoading(true)
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
    const nextOverrideDrafts = Object.fromEntries(
      currentAssessments.map((assessment) => [
        assessment.id,
        normalizeCampaignAssessmentReportOverrides(assessment.report_overrides).competency_overrides,
      ])
    )
    const nextDeliveryDrafts = Object.fromEntries(
      currentAssessments.map((assessment) => [
        assessment.id,
        (() => {
          const delivery = normalizeCampaignAssessmentReportDeliveryConfig(
            assessment.report_delivery_config,
            assessment.report_overrides
          )
          return {
            publicDefaultReportVariantId: delivery.public_default_report_variant_id ?? '',
            internalAllowedReportVariantIds: delivery.internal_allowed_report_variant_ids,
          }
        })(),
      ])
    )
    setOverrideDrafts(nextOverrideDrafts)
    setDeliveryDrafts(nextDeliveryDrafts)
    markSaved({ overrideDrafts: nextOverrideDrafts, deliveryDrafts: nextDeliveryDrafts })

    const variantEntries = await Promise.all(
      currentAssessments.map(async (assessment) => {
        const response = await fetch(`/api/admin/assessments/${assessment.assessment_id}/report-variants`, {
          cache: 'no-store',
        })
        const body = (await response.json().catch(() => null)) as {
          ok?: boolean
          variants?: Array<{
            id: string
            name: string
            version: number
            is_default: boolean
            status: string
            report_definition_id: string
          }>
          definitions?: Array<{ id: string; name: string }>
        } | null

        if (!response.ok || !body?.ok) {
          return [assessment.assessment_id, []] as const
        }

        const definitionNameById = new Map(
          (body.definitions ?? []).map((definition) => [definition.id, definition.name])
        )

        return [
          assessment.assessment_id,
          (body.variants ?? [])
            .filter((variant) => variant.status === 'published')
            .map((variant) => ({
              id: variant.id,
              name: variant.name,
              version: variant.version,
              is_default: variant.is_default,
              definitionLabel: definitionNameById.get(variant.report_definition_id) ?? 'Report',
            })),
        ] as const
      })
    )

    setVariantOptionsByAssessmentId(Object.fromEntries(variantEntries))

    const attachedIds = new Set(currentAssessments.map((assessment) => assessment.assessment_id))
    setAvailableAssessments(
      (assessmentsBody.assessments ?? assessmentsBody.surveys ?? []).filter(
        (assessment) => assessment.status === 'active' && !attachedIds.has(assessment.id)
      )
    )
    setLoading(false)
  }, [campaignId, markSaved])

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

  async function saveReportOverrides(campaignAssessment: CampaignAssessment) {
    setOverrideError(null)
    setOverrideSavedId(null)
    setSavingOverrideId(campaignAssessment.id)

    try {
      const response = await fetch(
        `/api/admin/campaigns/${campaignId}/assessments/${campaignAssessment.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_overrides: {
              competency_overrides: overrideDrafts[campaignAssessment.id] ?? {},
            },
            report_delivery_config: {
              public_default_report_variant_id: deliveryDrafts[campaignAssessment.id]?.publicDefaultReportVariantId || null,
              internal_allowed_report_variant_ids: deliveryDrafts[campaignAssessment.id]?.internalAllowedReportVariantIds ?? [],
            },
          }),
        }
      )

      const body = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!response.ok || !body?.ok) {
        setOverrideError(body?.error ?? 'Failed to save report overrides.')
        return
      }

      setOverrideSavedId(campaignAssessment.id)
      await load()
    } finally {
      setSavingOverrideId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <FoundationSurface className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Attached assessments</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--admin-text-primary)]">{assessments.length}</p>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">Assessments currently attached to this campaign journey.</p>
        </FoundationSurface>
        <FoundationSurface className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Available to add</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--admin-text-primary)]">{availableAssessments.length}</p>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">Active assessments that are not yet part of this campaign.</p>
        </FoundationSurface>
        <FoundationSurface className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Delivery state</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--admin-text-primary)]">{isDirty ? 'Draft' : 'Saved'}</p>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">Candidate-facing defaults and internal variant access per assessment.</p>
        </FoundationSurface>
      </div>

      <FoundationSurface className="space-y-3 p-5">
        <div>
          <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Assessment delivery</h2>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
            Attach assessments, choose the participant-facing default report for each one, and allow extra internal-only variants where needed.
          </p>
        </div>
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
            {adding ? 'Adding...' : 'Attach assessment'}
          </FoundationButton>
        </form>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {isDirty ? <p className="text-xs font-medium text-amber-700">Unsaved changes</p> : null}
      </FoundationSurface>

      <DashboardDataTableShell>
        <table className="admin-data-table">
          <thead>
            <tr>
              <th className="px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Assessment</th>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Delivery</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr className="admin-data-table-empty"><td colSpan={6}>Loading assessments...</td></tr>
            ) : assessments.length === 0 ? (
              <tr className="admin-data-table-empty"><td colSpan={6}>No assessments attached yet.</td></tr>
            ) : (
              assessments.map((assessment, idx) => (
                <Fragment key={assessment.id}>
                  <tr>
                    <td className="px-4 py-3 text-[var(--admin-text-muted)]">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-[var(--admin-text-primary)]">
                      {assessment.assessments?.name ?? assessment.assessment_id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--admin-text-muted)]">{assessment.assessments?.key ?? '-'}</td>
                    <td className="px-4 py-3 text-xs text-[var(--admin-text-muted)]">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full border border-[rgba(103,127,159,0.16)] px-2 py-1">
                          Candidate: {(() => {
                            const configured = deliveryDrafts[assessment.id]?.publicDefaultReportVariantId ?? ''
                            const variants = variantOptionsByAssessmentId[assessment.assessment_id] ?? []
                            const matched = variants.find((variant) => variant.id === configured)
                            return matched?.name ?? 'Assessment default'
                          })()}
                        </span>
                        <span className="rounded-full border border-[rgba(103,127,159,0.16)] px-2 py-1">
                          Internal: {deliveryDrafts[assessment.id]?.internalAllowedReportVariantIds.length ?? 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--admin-text-muted)]">{assessment.is_active ? 'Active' : 'Inactive'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <FoundationButton
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            setExpandedAssessmentId((current) =>
                              current === assessment.id ? null : assessment.id
                            )
                          }
                        >
                          {expandedAssessmentId === assessment.id ? 'Hide settings' : 'Open settings'}
                        </FoundationButton>
                        <FoundationButton type="button" size="sm" variant="danger" onClick={() => void handleRemove(assessment.id)}>
                          Remove
                        </FoundationButton>
                      </div>
                    </td>
                  </tr>
                  {expandedAssessmentId === assessment.id ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-4">
                        <div className="space-y-4 rounded-xl border border-[rgba(103,127,159,0.12)] bg-[rgba(255,255,255,0.68)] p-4">
                          <div className="grid gap-4 xl:grid-cols-2">
                            <div className="space-y-2 rounded-lg border border-[rgba(103,127,159,0.12)] bg-white p-4">
                              <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Candidate-facing default report</h3>
                              <p className="text-xs text-[var(--admin-text-muted)]">
                                Pick the single report this campaign should deliver to participants for future completions.
                              </p>
                              <FoundationSelect
                                value={deliveryDrafts[assessment.id]?.publicDefaultReportVariantId ?? ''}
                                onChange={(event) => {
                                  setOverrideSavedId(null)
                                  setDeliveryDrafts((current) => ({
                                    ...current,
                                    [assessment.id]: {
                                      publicDefaultReportVariantId: event.target.value,
                                      internalAllowedReportVariantIds: current[assessment.id]?.internalAllowedReportVariantIds ?? [],
                                    },
                                  }))
                                }}
                              >
                                <option value="">Use assessment default report</option>
                                {(variantOptionsByAssessmentId[assessment.assessment_id] ?? []).map((variant) => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.name} ({variant.definitionLabel} v{variant.version}{variant.is_default ? ', assessment default' : ''})
                                  </option>
                                ))}
                              </FoundationSelect>
                              {(variantOptionsByAssessmentId[assessment.assessment_id] ?? []).length === 0 ? (
                                <p className="text-xs text-[var(--admin-text-muted)]">
                                  No published variants are available yet. Publish one in{' '}
                                  <Link
                                    href={`/dashboard/assessments/${assessment.assessment_id}/reports`}
                                    className="font-medium underline underline-offset-2"
                                  >
                                    Reports
                                  </Link>.
                                </p>
                              ) : null}
                            </div>

                            <div className="space-y-2 rounded-lg border border-[rgba(103,127,159,0.12)] bg-white p-4">
                              <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Internal-only report variants</h3>
                              <p className="text-xs text-[var(--admin-text-muted)]">
                                Allow extra report variants for internal users opening responses and portal views.
                              </p>
                              <div className="space-y-2 rounded-lg border border-[rgba(103,127,159,0.12)] bg-white p-3 text-sm">
                                {(variantOptionsByAssessmentId[assessment.assessment_id] ?? []).length === 0 ? (
                                  <p className="text-[var(--admin-text-muted)]">
                                    No published variants available yet. Open{' '}
                                    <Link
                                      href={`/dashboard/assessments/${assessment.assessment_id}/reports`}
                                      className="font-medium underline underline-offset-2"
                                    >
                                      Reports
                                    </Link>{' '}
                                    to publish one first.
                                  </p>
                                ) : (
                                  (variantOptionsByAssessmentId[assessment.assessment_id] ?? []).map((variant) => {
                                    const checked = deliveryDrafts[assessment.id]?.internalAllowedReportVariantIds.includes(variant.id) ?? false
                                    return (
                                      <label key={variant.id} className="flex items-start gap-3">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(event) => {
                                            setOverrideSavedId(null)
                                            setDeliveryDrafts((current) => {
                                              const existing = current[assessment.id] ?? {
                                                publicDefaultReportVariantId: '',
                                                internalAllowedReportVariantIds: [],
                                              }
                                              return {
                                                ...current,
                                                [assessment.id]: {
                                                  ...existing,
                                                  internalAllowedReportVariantIds: event.target.checked
                                                    ? [...new Set([...existing.internalAllowedReportVariantIds, variant.id])]
                                                    : existing.internalAllowedReportVariantIds.filter((item) => item !== variant.id),
                                                },
                                              }
                                            })
                                          }}
                                        />
                                        <span>
                                          {variant.name} ({variant.definitionLabel} v{variant.version}{variant.is_default ? ', assessment default' : ''})
                                        </span>
                                      </label>
                                    )
                                  })
                                )}
                              </div>
                            </div>
                          </div>

                          <details className="rounded-lg border border-dashed border-[rgba(103,127,159,0.2)] px-4 py-3">
                            <summary className="cursor-pointer text-sm font-medium text-[var(--admin-text-primary)]">
                              Advanced campaign copy
                            </summary>
                            <div className="mt-3">
                              <ReportCompetencyCopyEditor
                                title="Campaign report copy"
                                description="Override the public competency label and description for this assessment within this campaign only."
                                competencies={getReportCompetencyDefinitions(assessment.assessments?.scoring_config)}
                                value={overrideDrafts[assessment.id] ?? {}}
                                onChange={(nextOverrides) => {
                                  setOverrideSavedId(null)
                                  setOverrideDrafts((current) => ({
                                    ...current,
                                    [assessment.id]: nextOverrides,
                                  }))
                                }}
                              />
                            </div>
                          </details>

                          <div className="flex flex-wrap items-center gap-3">
                            <FoundationButton
                              type="button"
                              variant="primary"
                              onClick={() => void saveReportOverrides(assessment)}
                              disabled={savingOverrideId === assessment.id}
                            >
                              {savingOverrideId === assessment.id ? 'Saving...' : 'Save delivery and copy'}
                            </FoundationButton>
                            <FoundationButton
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                setOverrideSavedId(null)
                                const normalizedOverrides = normalizeCampaignAssessmentReportOverrides(
                                  assessment.report_overrides
                                )
                                setOverrideDrafts((current) => ({
                                  ...current,
                                  [assessment.id]: normalizedOverrides.competency_overrides,
                                }))
                                const normalizedDelivery = normalizeCampaignAssessmentReportDeliveryConfig(
                                  assessment.report_delivery_config,
                                  assessment.report_overrides
                                )
                                setDeliveryDrafts((current) => ({
                                  ...current,
                                  [assessment.id]: {
                                    publicDefaultReportVariantId: normalizedDelivery.public_default_report_variant_id ?? '',
                                    internalAllowedReportVariantIds: normalizedDelivery.internal_allowed_report_variant_ids,
                                  },
                                }))
                              }}
                            >
                              Reset changes
                            </FoundationButton>
                            {overrideSavedId === assessment.id ? (
                              <span className="text-xs text-emerald-600">Saved</span>
                            ) : null}
                          </div>

                          {overrideError ? (
                            <p className="text-sm text-red-600">{overrideError}</p>
                          ) : null}

                          {assessment.assessments ? (
                            <div className="rounded-lg border border-[rgba(103,127,159,0.12)] bg-white px-4 py-3 text-xs text-[var(--admin-text-muted)]">
                              Assessment report title: {normalizeReportConfig(assessment.assessments.report_config).title}
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </DashboardDataTableShell>
    </div>
  )
}
