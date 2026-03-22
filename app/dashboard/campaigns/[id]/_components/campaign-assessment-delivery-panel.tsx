'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUnsavedChanges } from '@/components/dashboard/hooks/use-unsaved-changes'
import { ReportCompetencyCopyEditor } from '@/components/dashboard/assessments/report-competency-copy-editor'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSelect } from '@/components/ui/foundation/field'
import { FoundationSurface } from '@/components/ui/foundation/surface'
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

type DeliveryDraft = {
  publicDefaultReportVariantId: string
  internalAllowedReportVariantIds: string[]
}

function countCompetencyOverrides(value: ReportCompetencyOverrides | undefined) {
  return Object.values(value ?? {}).filter((entry) => {
    if (!entry) return false
    return Boolean(entry.label?.trim() || entry.description?.trim())
  }).length
}

function resolveVariantLabel(variants: ReportVariantOption[], variantId: string) {
  if (!variantId) return 'Assessment default'
  const matched = variants.find((variant) => variant.id === variantId)
  return matched?.name ?? 'Assessment default'
}

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <FoundationSurface className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[var(--admin-text-primary)]">{value}</p>
      <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{hint}</p>
    </FoundationSurface>
  )
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.92)] px-3 py-1.5 text-xs text-[var(--admin-text-muted)]">
      <span className="font-semibold text-[var(--admin-text-primary)]">{label}:</span>{' '}
      <span>{value}</span>
    </div>
  )
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
  const [deliveryDrafts, setDeliveryDrafts] = useState<Record<string, DeliveryDraft>>({})
  const [variantOptionsByAssessmentId, setVariantOptionsByAssessmentId] = useState<Record<string, ReportVariantOption[]>>({})
  const [savingOverrideId, setSavingOverrideId] = useState<string | null>(null)
  const [overrideError, setOverrideError] = useState<string | null>(null)
  const [overrideSavedId, setOverrideSavedId] = useState<string | null>(null)
  const unsavedSnapshot = useMemo(() => ({ overrideDrafts, deliveryDrafts }), [deliveryDrafts, overrideDrafts])
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
        <MetricCard
          label="Attached assessments"
          value={assessments.length}
          hint="Assessments currently attached to this campaign."
        />
        <MetricCard
          label="Available to add"
          value={availableAssessments.length}
          hint="Active assessments not yet attached to this campaign."
        />
        <MetricCard
          label="Delivery state"
          value={isDirty ? 'Draft' : 'Saved'}
          hint="Candidate defaults and internal variant access per assessment."
        />
      </div>

      <FoundationSurface className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--admin-text-soft)]">Assessment setup</p>
            <h3 className="mt-2 font-serif text-[1.45rem] leading-[1.05] text-[var(--admin-text-primary)]">
              Attach assessments and shape what each one delivers
            </h3>
            <p className="mt-2 max-w-3xl text-sm text-[var(--admin-text-muted)]">
              Overview controls what this campaign includes and which report experience candidates receive. Flow still owns the order those attached assessments appear in the participant journey.
            </p>
          </div>
          <Link
            href={`/dashboard/campaigns/${campaignId}/journey`}
            className="inline-flex h-11 items-center rounded-full border border-[rgba(103,127,159,0.18)] bg-white px-5 text-sm font-semibold text-[var(--admin-text-primary)] shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:-translate-y-px hover:border-[rgba(103,127,159,0.28)]"
          >
            Reorder in journey
          </Link>
        </div>

        <form onSubmit={handleAdd} className="rounded-[1.6rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.88)] p-4 md:p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-64 flex-1">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-text-soft)]">
                Add assessment
              </label>
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
          </div>
          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
          {isDirty ? <p className="mt-3 text-xs font-medium text-amber-700">Unsaved changes in delivery configuration</p> : null}
        </form>
      </FoundationSurface>

      {loading ? (
        <FoundationSurface className="p-6 text-sm text-[var(--admin-text-muted)]">Loading attached assessments...</FoundationSurface>
      ) : assessments.length === 0 ? (
        <FoundationSurface className="p-8 text-center">
          <p className="font-serif text-[1.45rem] leading-[1.05] text-[var(--admin-text-primary)]">No assessments attached yet</p>
          <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
            Add the first assessment above. Once attached, Flow can place it in the participant journey and delivery settings can be tuned here.
          </p>
        </FoundationSurface>
      ) : (
        <div className="space-y-4">
          {assessments.map((assessment, index) => {
            const variants = variantOptionsByAssessmentId[assessment.assessment_id] ?? []
            const deliveryDraft = deliveryDrafts[assessment.id] ?? {
              publicDefaultReportVariantId: '',
              internalAllowedReportVariantIds: [],
            }
            const overrideCount = countCompetencyOverrides(overrideDrafts[assessment.id])
            const isExpanded = expandedAssessmentId === assessment.id

            return (
              <FoundationSurface key={assessment.id} className="overflow-hidden p-0">
                <div className="border-b border-[rgba(103,127,159,0.1)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,251,255,0.92))] px-5 py-5 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-[rgba(47,95,153,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--admin-accent-strong)]">
                          #{index + 1}
                        </span>
                        <span className={[
                          'inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]',
                          assessment.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600',
                        ].join(' ')}>
                          {assessment.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div>
                        <h3 className="font-serif text-[1.55rem] leading-[1.02] text-[var(--admin-text-primary)]">
                          {assessment.assessments?.name ?? assessment.assessment_id}
                        </h3>
                        <p className="mt-2 max-w-3xl text-sm text-[var(--admin-text-muted)]">
                          Assessment key: <span className="font-mono text-[var(--admin-text-primary)]">{assessment.assessments?.key ?? '-'}</span>
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <SummaryPill
                          label="Candidate"
                          value={resolveVariantLabel(variants, deliveryDraft.publicDefaultReportVariantId)}
                        />
                        <SummaryPill
                          label="Internal variants"
                          value={String(deliveryDraft.internalAllowedReportVariantIds.length)}
                        />
                        <SummaryPill
                          label="Copy overrides"
                          value={overrideCount === 0 ? 'None' : String(overrideCount)}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <FoundationButton
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setExpandedAssessmentId((current) => (current === assessment.id ? null : assessment.id))
                        }
                      >
                        {isExpanded ? 'Hide settings' : 'Open settings'}
                      </FoundationButton>
                      <FoundationButton
                        type="button"
                        size="sm"
                        variant="danger"
                        onClick={() => void handleRemove(assessment.id)}
                      >
                        Remove
                      </FoundationButton>
                    </div>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="space-y-4 px-5 py-5 md:px-6 md:py-6">
                    <div className="grid gap-4 xl:grid-cols-2">
                      <FoundationSurface className="space-y-3 p-5">
                        <div>
                          <h4 className="text-sm font-semibold text-[var(--admin-text-primary)]">Candidate-facing default report</h4>
                          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                            Choose the single report variant candidates should receive for future completions.
                          </p>
                        </div>
                        <FoundationSelect
                          value={deliveryDraft.publicDefaultReportVariantId}
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
                          {variants.map((variant) => (
                            <option key={variant.id} value={variant.id}>
                              {variant.name} ({variant.definitionLabel} v{variant.version}{variant.is_default ? ', assessment default' : ''})
                            </option>
                          ))}
                        </FoundationSelect>
                        {variants.length === 0 ? (
                          <p className="text-xs text-[var(--admin-text-muted)]">
                            No published variants are available yet. Publish one in{' '}
                            <Link href={`/dashboard/assessments/${assessment.assessment_id}/reports`} className="font-medium underline underline-offset-2">
                              Reports
                            </Link>.
                          </p>
                        ) : null}
                      </FoundationSurface>

                      <FoundationSurface className="space-y-3 p-5">
                        <div>
                          <h4 className="text-sm font-semibold text-[var(--admin-text-primary)]">Internal-only report variants</h4>
                          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                            Allow extra report variants for internal users opening campaign responses and portal views.
                          </p>
                        </div>
                        <div className="space-y-2 rounded-[1.25rem] border border-[rgba(103,127,159,0.12)] bg-[rgba(247,249,252,0.82)] p-4 text-sm">
                          {variants.length === 0 ? (
                            <p className="text-[var(--admin-text-muted)]">
                              No published variants available yet. Open{' '}
                              <Link href={`/dashboard/assessments/${assessment.assessment_id}/reports`} className="font-medium underline underline-offset-2">
                                Reports
                              </Link>{' '}
                              to publish one first.
                            </p>
                          ) : (
                            variants.map((variant) => {
                              const checked = deliveryDraft.internalAllowedReportVariantIds.includes(variant.id)
                              return (
                                <label key={variant.id} className="flex items-start gap-3 rounded-[1rem] border border-[rgba(103,127,159,0.12)] bg-white/90 px-3 py-3">
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
                      </FoundationSurface>
                    </div>

                    <FoundationSurface className="space-y-3 p-5">
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--admin-text-primary)]">Campaign report copy</h4>
                        <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                          Override competency label and description copy for this assessment within this campaign only.
                        </p>
                      </div>
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
                    </FoundationSurface>

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
                          const normalizedOverrides = normalizeCampaignAssessmentReportOverrides(assessment.report_overrides)
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
                        <span className="text-xs font-medium text-emerald-600">Saved</span>
                      ) : null}
                    </div>

                    {overrideError ? <p className="text-sm text-red-600">{overrideError}</p> : null}

                    {assessment.assessments ? (
                      <div className="rounded-[1.25rem] border border-[rgba(103,127,159,0.12)] bg-[rgba(247,249,252,0.84)] px-4 py-3 text-sm text-[var(--admin-text-muted)]">
                        Assessment report title:{' '}
                        <span className="font-medium text-[var(--admin-text-primary)]">
                          {normalizeReportConfig(assessment.assessments.report_config).title}
                        </span>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </FoundationSurface>
            )
          })}
        </div>
      )}
    </div>
  )
}
