'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useBeforeUnloadWarning, useUnsavedChanges } from '@/components/dashboard/hooks/use-unsaved-changes'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import {
  normalizeV2ReportTemplate,
  type V2BlockDataSource,
  type V2BlockDisplayFormat,
  type V2ReportBlockDefinition,
  type V2ReportSectionDefinition,
  type V2ReportSectionKind,
  type V2ReportSectionLayer,
  type V2ReportTemplateDefinition,
} from '@/utils/assessments/v2-report-template'
import { normalizeV2ScoringConfig, type V2ScoringConfig } from '@/utils/assessments/v2-scoring'
import type { V2SubmissionReportData } from '@/utils/assessments/v2-runtime'
import {
  getV2ReportAudienceRoleLabel,
  type V2AssessmentReportRecord,
  type V2AssessmentReportStatus,
  type V2ReportAudienceRole,
} from '@/utils/reports/v2-assessment-reports'
import { hasV2ReportOverrides } from '@/utils/reports/v2-report-inheritance'
import { createV2ReportBlockId } from '@/utils/reports/v2-report-builder-defaults'
import {
  createV2ComposerSectionPreset,
  ensureV2TemplateHasComposition,
  inferV2ReportCompositionFromBlocks,
  syncV2TemplateBlocksFromComposition,
} from '@/utils/reports/v2-report-composer'
import { V2BlockReportView } from '@/components/reports/v2/v2-block-report-view'
import { V2_PREVIEW_SAMPLES, getV2PreviewSample } from '@/utils/reports/v2-preview-samples'

type DetailTab = 'setup' | 'composition' | 'preview' | 'advanced'
type PreviewMode = 'sample' | 'live'

type LoadPayload = {
  ok?: boolean
  report?: V2AssessmentReportRecord
  baseReport?: V2AssessmentReportRecord | null
}

type ScoringPayload = {
  ok?: boolean
  scoringConfig?: unknown
}

type PreviewSubmissionRow = {
  id: string
  participantName: string
  email: string | null
  organisation: string | null
  role: string | null
  submittedAt: string
}

type PreviewSubmissionsPayload = {
  ok?: boolean
  submissions?: PreviewSubmissionRow[]
}

type PreviewPayload = {
  ok?: boolean
  context?: {
    assessmentId: string
    submissionId: string
    scoringConfig?: unknown
    v2Report?: V2SubmissionReportData | null
  }
  participantName?: string
}

const SECTION_PRESETS: Array<{ kind: V2ReportSectionKind; label: string }> = [
  { kind: 'overall_profile', label: 'Overall profile' },
  { kind: 'score_summary', label: 'Score summary' },
  { kind: 'narrative_insights', label: 'Narrative insights' },
  { kind: 'recommendations', label: 'Recommendations' },
  { kind: 'editorial', label: 'Editorial' },
]

const SCORE_LAYOUT_OPTIONS: Array<{ value: V2BlockDisplayFormat; label: string }> = [
  { value: 'score_cards', label: 'Score cards' },
  { value: 'bar_chart', label: 'Bar chart' },
  { value: 'score_table', label: 'Score table' },
  { value: 'band_cards', label: 'Band cards' },
  { value: 'bipolar_bar', label: 'Bipolar bar' },
]

const TEXT_LAYOUT_OPTIONS: Array<{ value: V2BlockDisplayFormat; label: string }> = [
  { value: 'insight_list', label: 'Insight list' },
  { value: 'rich_text', label: 'Rich text' },
]

const RECOMMENDATION_LAYOUT_OPTIONS: Array<{ value: V2BlockDisplayFormat; label: string }> = [
  { value: 'bullet_list', label: 'Bullet list' },
  { value: 'insight_list', label: 'Insight cards' },
]

const RAW_SOURCE_OPTIONS: Array<{ value: V2BlockDataSource; label: string }> = [
  { value: 'report_header', label: 'Report header' },
  { value: 'overall_classification', label: 'Overall classification' },
  { value: 'derived_outcome', label: 'Derived outcome' },
  { value: 'archetype_profile', label: 'Archetype profile' },
  { value: 'layer_profile', label: 'Layer profile' },
  { value: 'dimension_scores', label: 'Dimension scores' },
  { value: 'competency_scores', label: 'Competency scores' },
  { value: 'trait_scores', label: 'Trait scores' },
  { value: 'interpretations', label: 'Interpretations' },
  { value: 'recommendations', label: 'Recommendations' },
  { value: 'static_content', label: 'Static content' },
  { value: 'report_cta', label: 'Call to action' },
]

const RAW_FORMAT_OPTIONS: Record<V2BlockDataSource, Array<{ value: V2BlockDisplayFormat; label: string }>> = {
  report_header: [{ value: 'hero_card', label: 'Hero card' }],
  overall_classification: [
    { value: 'hero_card', label: 'Hero card' },
    { value: 'rich_text', label: 'Rich text' },
  ],
  derived_outcome: [
    { value: 'hero_card', label: 'Hero card' },
    { value: 'rich_text', label: 'Rich text' },
    { value: 'band_cards', label: 'Band cards' },
  ],
  archetype_profile: [
    { value: 'hero_card', label: 'Hero card' },
    { value: 'rich_text', label: 'Rich text' },
  ],
  layer_profile: SCORE_LAYOUT_OPTIONS,
  dimension_scores: SCORE_LAYOUT_OPTIONS,
  competency_scores: SCORE_LAYOUT_OPTIONS,
  trait_scores: SCORE_LAYOUT_OPTIONS,
  interpretations: TEXT_LAYOUT_OPTIONS,
  recommendations: RECOMMENDATION_LAYOUT_OPTIONS,
  static_content: [{ value: 'rich_text', label: 'Rich text' }],
  report_cta: [{ value: 'rich_text', label: 'Rich text' }],
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <FoundationSurface className="p-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">{title}</h2>
        <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </FoundationSurface>
  )
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <FoundationSurface className="p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{value}</p>
    </FoundationSurface>
  )
}

function getStatusBadge(status: V2AssessmentReportStatus) {
  switch (status) {
    case 'published':
      return 'bg-emerald-100 text-emerald-700'
    case 'archived':
      return 'bg-zinc-100 text-zinc-600'
    default:
      return 'bg-amber-100 text-amber-700'
  }
}

function getSectionKindLabel(kind: V2ReportSectionKind) {
  return SECTION_PRESETS.find((preset) => preset.kind === kind)?.label ?? kind
}

function getSectionLayoutOptions(section: V2ReportSectionDefinition) {
  if (section.kind === 'overall_profile') {
    return [{ value: 'hero_card', label: 'Hero card' }]
  }
  if (section.kind === 'score_summary') {
    return SCORE_LAYOUT_OPTIONS
  }
  if (section.kind === 'narrative_insights') {
    return TEXT_LAYOUT_OPTIONS
  }
  if (section.kind === 'recommendations') {
    return RECOMMENDATION_LAYOUT_OPTIONS
  }
  return [{ value: 'rich_text', label: 'Rich text' }]
}

function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export default function AssessmentV2ReportPage() {
  const { id: assessmentId, variantId } = useParams<{ id: string; variantId: string }>()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab')
  const initialSample = searchParams.get('sample')

  const [report, setReport] = useState<V2AssessmentReportRecord | null>(null)
  const [baseReport, setBaseReport] = useState<V2AssessmentReportRecord | null>(null)
  const [template, setTemplate] = useState<V2ReportTemplateDefinition | null>(null)
  const [scoringConfig, setScoringConfig] = useState<V2ScoringConfig | null>(null)
  const [previewSubmissions, setPreviewSubmissions] = useState<PreviewSubmissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSetup, setSavingSetup] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [resettingOverrides, setResettingOverrides] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setupSavedAt, setSetupSavedAt] = useState<string | null>(null)
  const [templateSavedAt, setTemplateSavedAt] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>(
    initialTab === 'preview' || initialTab === 'advanced' || initialTab === 'setup' || initialTab === 'composition'
      ? initialTab
      : 'composition'
  )
  const [previewMode, setPreviewMode] = useState<PreviewMode>('sample')
  const [selectedSampleId, setSelectedSampleId] = useState(
    V2_PREVIEW_SAMPLES.some((sample) => sample.id === initialSample) ? initialSample! : V2_PREVIEW_SAMPLES[0]!.id
  )
  const [selectedSubmissionId, setSelectedSubmissionId] = useState('')
  const [previewQuery, setPreviewQuery] = useState('')
  const [livePreviewContext, setLivePreviewContext] = useState<PreviewPayload['context'] | null>(null)
  const [livePreviewName, setLivePreviewName] = useState('')
  const [setupDraft, setSetupDraft] = useState<{
    name: string
    audienceRole: V2ReportAudienceRole
    status: V2AssessmentReportStatus
    isDefault: boolean
  }>({
    name: '',
    audienceRole: 'candidate',
    status: 'draft',
    isDefault: false,
  })
  const [addRawSource, setAddRawSource] = useState<V2BlockDataSource>('derived_outcome')
  const [addRawFormat, setAddRawFormat] = useState<V2BlockDisplayFormat>('hero_card')
  const { isDirty: setupDirty, markSaved: markSetupSaved } = useUnsavedChanges(setupDraft, { warnOnUnload: false })
  const { isDirty: templateDirty, markSaved: markTemplateSaved } = useUnsavedChanges(template, { warnOnUnload: false })

  const sample = useMemo(() => getV2PreviewSample(selectedSampleId), [selectedSampleId])
  const compositionSections = template?.composition?.sections ?? []
  const selectedSubmission = useMemo(
    () => previewSubmissions.find((submission) => submission.id === selectedSubmissionId) ?? null,
    [previewSubmissions, selectedSubmissionId]
  )
  const inheritsBase = Boolean(report && report.reportKind === 'audience' && !hasV2ReportOverrides(report))
  const canResetToBase = Boolean(report && report.reportKind === 'audience' && hasV2ReportOverrides(report))
  const hasUnsavedChanges = setupDirty || templateDirty

  useBeforeUnloadWarning(hasUnsavedChanges)

  useEffect(() => {
    const nextFormat = RAW_FORMAT_OPTIONS[addRawSource]?.[0]?.value
    if (!nextFormat) return
    setAddRawFormat((current) =>
      RAW_FORMAT_OPTIONS[addRawSource].some((option) => option.value === current) ? current : nextFormat
    )
  }, [addRawSource])

  const loadPreviewSubmissions = useCallback(async (query = '') => {
    const response = await fetch(
      `/api/admin/assessments/${assessmentId}/v2/reports/preview-submissions?q=${encodeURIComponent(query)}`,
      { cache: 'no-store' }
    )
    const body = await response.json().catch(() => null) as PreviewSubmissionsPayload | null

    if (!response.ok || !body?.ok) {
      setError('Failed to load live preview submissions.')
      return
    }

    setPreviewSubmissions(body.submissions ?? [])
    setSelectedSubmissionId((current) => {
      if (current && (body.submissions ?? []).some((submission) => submission.id === current)) {
        return current
      }
      return body.submissions?.[0]?.id ?? ''
    })
  }, [assessmentId])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const [reportResponse, scoringResponse] = await Promise.all([
        fetch(`/api/admin/assessments/${assessmentId}/v2/reports/${variantId}`, {
          cache: 'no-store',
        }),
        fetch(`/api/admin/assessments/${assessmentId}/v2/scoring`, {
          cache: 'no-store',
        }),
      ])
      const [body, scoringBody] = await Promise.all([
        reportResponse.json().catch(() => null) as Promise<LoadPayload | null>,
        scoringResponse.json().catch(() => null) as Promise<ScoringPayload | null>,
      ])

      if (!reportResponse.ok || !body?.ok || !body.report) {
        setError('Failed to load this report.')
        return
      }

      const nextReport = {
        ...body.report,
        templateDefinition: ensureV2TemplateHasComposition(normalizeV2ReportTemplate(body.report.templateDefinition)),
      }

      setReport(nextReport)
      setBaseReport(body.baseReport ?? null)
      setTemplate(nextReport.templateDefinition)
      setScoringConfig(normalizeV2ScoringConfig(scoringBody?.scoringConfig))
      const nextSetupDraft = {
        name: nextReport.name,
        audienceRole: nextReport.audienceRole,
        status: nextReport.status,
        isDefault: nextReport.isDefault,
      }
      setSetupDraft(nextSetupDraft)
      markSetupSaved(nextSetupDraft)
      markTemplateSaved(nextReport.templateDefinition)
      setSetupSavedAt(null)
      setTemplateSavedAt(null)
      await loadPreviewSubmissions()
    } catch {
      setError('Failed to load this report.')
    } finally {
      setLoading(false)
    }
  }, [assessmentId, loadPreviewSubmissions, variantId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (previewMode !== 'live' || !report || !selectedSubmissionId) {
      setLivePreviewContext(null)
      setLivePreviewName('')
      return
    }

    let cancelled = false

    void (async () => {
      const response = await fetch(
        `/api/admin/assessments/${assessmentId}/v2/reports/${report.id}/preview?submissionId=${encodeURIComponent(selectedSubmissionId)}`,
        { cache: 'no-store' }
      )
      const body = await response.json().catch(() => null) as PreviewPayload | null

      if (cancelled) return

      if (!response.ok || !body?.ok || !body.context) {
        setLivePreviewContext(null)
        setLivePreviewName('')
        return
      }

      setLivePreviewContext(body.context)
      setLivePreviewName(body.participantName ?? '')
    })()

    return () => {
      cancelled = true
    }
  }, [assessmentId, previewMode, report, selectedSubmissionId])

  const saveSetup = async () => {
    if (!report) return

    setSavingSetup(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/v2/reports/${variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setupDraft),
      })
      const body = (await response.json().catch(() => null)) as LoadPayload | null

      if (!response.ok || !body?.ok || !body.report) {
        setError('Failed to save report setup.')
        return
      }

      const nextReport = {
        ...body.report,
        templateDefinition: ensureV2TemplateHasComposition(normalizeV2ReportTemplate(body.report.templateDefinition)),
      }
      const nextSetupDraft = {
        name: nextReport.name,
        audienceRole: nextReport.audienceRole,
        status: nextReport.status,
        isDefault: nextReport.isDefault,
      }

      setReport(nextReport)
      setBaseReport(body.baseReport ?? null)
      setTemplate(nextReport.templateDefinition)
      setSetupDraft(nextSetupDraft)
      markSetupSaved(nextSetupDraft)
      setSetupSavedAt(new Date().toLocaleTimeString())
    } catch {
      setError('Failed to save report setup.')
    } finally {
      setSavingSetup(false)
    }
  }

  const saveTemplate = async () => {
    if (!report || !template) return

    setSavingTemplate(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/v2/reports/${variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateDefinition: syncV2TemplateBlocksFromComposition(template) }),
      })
      const body = (await response.json().catch(() => null)) as LoadPayload | null

      if (!response.ok || !body?.ok || !body.report) {
        setError('Failed to save report changes.')
        return
      }

      const nextReport = {
        ...body.report,
        templateDefinition: ensureV2TemplateHasComposition(normalizeV2ReportTemplate(body.report.templateDefinition)),
      }

      setReport(nextReport)
      setBaseReport(body.baseReport ?? null)
      setTemplate(nextReport.templateDefinition)
      markTemplateSaved(nextReport.templateDefinition)
      setTemplateSavedAt(new Date().toLocaleTimeString())
    } catch {
      setError('Failed to save report changes.')
    } finally {
      setSavingTemplate(false)
    }
  }

  const resetOverrides = async () => {
    if (!report) return

    setResettingOverrides(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/v2/reports/${variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetOverrides: true }),
      })
      const body = (await response.json().catch(() => null)) as LoadPayload | null

      if (!response.ok || !body?.ok || !body.report) {
        setError('Failed to reset report overrides.')
        return
      }

      const nextReport = {
        ...body.report,
        templateDefinition: ensureV2TemplateHasComposition(normalizeV2ReportTemplate(body.report.templateDefinition)),
      }
      const nextSetupDraft = {
        name: nextReport.name,
        audienceRole: nextReport.audienceRole,
        status: nextReport.status,
        isDefault: nextReport.isDefault,
      }

      setReport(nextReport)
      setBaseReport(body.baseReport ?? null)
      setTemplate(nextReport.templateDefinition)
      setSetupDraft(nextSetupDraft)
      markSetupSaved(nextSetupDraft)
      markTemplateSaved(nextReport.templateDefinition)
      const savedTimestamp = new Date().toLocaleTimeString()
      setSetupSavedAt(savedTimestamp)
      setTemplateSavedAt(savedTimestamp)
    } catch {
      setError('Failed to reset report overrides.')
    } finally {
      setResettingOverrides(false)
    }
  }

  const updateComposition = (
    updater: (sections: V2ReportSectionDefinition[]) => V2ReportSectionDefinition[]
  ) => {
    setTemplate((current) => {
      if (!current) return current

      const normalized = ensureV2TemplateHasComposition(current)
      const nextSections = updater(normalized.composition?.sections ?? [])

      return syncV2TemplateBlocksFromComposition({
        ...normalized,
        composition: {
          version: 1,
          sections: nextSections,
        },
      })
    })
  }

  const updateRawBlocks = (
    updater: (blocks: V2ReportBlockDefinition[]) => V2ReportBlockDefinition[]
  ) => {
    setTemplate((current) => {
      if (!current) return current

      const normalized = ensureV2TemplateHasComposition(current)
      const nextBlocks = updater(normalized.blocks)

      return ensureV2TemplateHasComposition({
        ...normalized,
        blocks: nextBlocks,
        composition: inferV2ReportCompositionFromBlocks(nextBlocks),
      })
    })
  }

  const addSection = (kind: V2ReportSectionKind) => {
    updateComposition((sections) => [...sections, createV2ComposerSectionPreset(kind)])
  }

  const updateSection = (sectionId: string, patch: Partial<V2ReportSectionDefinition>) => {
    updateComposition((sections) =>
      sections.map((section) => (section.id === sectionId ? { ...section, ...patch } : section))
    )
  }

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    updateComposition((sections) => {
      const next = [...sections]
      const index = next.findIndex((section) => section.id === sectionId)
      if (index < 0) return sections

      const swapIndex = direction === 'up' ? index - 1 : index + 1
      if (swapIndex < 0 || swapIndex >= next.length) return sections

      ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
      return next
    })
  }

  const removeSection = (sectionId: string) => {
    updateComposition((sections) => sections.filter((section) => section.id !== sectionId))
  }

  const addRawBlock = () => {
    updateRawBlocks((blocks) => [
      ...blocks,
      {
        id: createV2ReportBlockId(),
        source: addRawSource,
        format: addRawFormat,
        content: {
          title: RAW_SOURCE_OPTIONS.find((option) => option.value === addRawSource)?.label ?? addRawSource,
        },
        enabled: true,
      },
    ])
  }

  const updateRawBlock = (blockId: string, patch: Partial<V2ReportBlockDefinition>) => {
    updateRawBlocks((blocks) =>
      blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block))
    )
  }

  const moveRawBlock = (blockId: string, direction: 'up' | 'down') => {
    updateRawBlocks((blocks) => {
      const next = [...blocks]
      const index = next.findIndex((block) => block.id === blockId)
      if (index < 0) return blocks

      const swapIndex = direction === 'up' ? index - 1 : index + 1
      if (swapIndex < 0 || swapIndex >= next.length) return blocks

      ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
      return next
    })
  }

  const removeRawBlock = (blockId: string) => {
    updateRawBlocks((blocks) => blocks.filter((block) => block.id !== blockId))
  }

  if (loading) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader eyebrow="Assessment workspace" title="Report" description="Loading the report..." />
        <FoundationSurface className="p-6">
          <p className="text-sm text-[var(--admin-text-muted)]">Loading the report...</p>
        </FoundationSurface>
      </DashboardPageShell>
    )
  }

  if (!report || !template) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader
          eyebrow="Assessment workspace"
          title="Report"
          description="Open a report product to configure setup, composition, preview, and advanced controls."
          actions={(
            <Link href={`/dashboard/assessments-v2/${assessmentId}/reports`} className="foundation-btn foundation-btn-secondary foundation-btn-sm">
              Back to reports
            </Link>
          )}
        />
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error ?? 'Report not found.'}
        </div>
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessment workspace"
        title={report.name}
        description={
          report.reportKind === 'base'
            ? 'Edit the shared base composition that audience reports inherit from.'
            : 'Manage this audience report, override the shared base when needed, and preview it against samples or live submissions.'
        }
        actions={(
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href={`/dashboard/assessments-v2/${assessmentId}/reports`}
                className="foundation-btn foundation-btn-secondary foundation-btn-sm"
              >
                Back to reports
              </Link>
              {canResetToBase ? (
                <FoundationButton type="button" variant="secondary" size="sm" onClick={resetOverrides} disabled={resettingOverrides}>
                  {resettingOverrides ? 'Resetting...' : 'Reset to base'}
                </FoundationButton>
              ) : null}
              {activeTab === 'setup' ? (
                <FoundationButton type="button" variant="primary" size="sm" onClick={saveSetup} disabled={savingSetup}>
                  {savingSetup ? 'Saving...' : 'Save setup'}
                </FoundationButton>
              ) : (
                <FoundationButton type="button" variant="primary" size="sm" onClick={saveTemplate} disabled={savingTemplate}>
                  {savingTemplate ? 'Saving...' : report.reportKind === 'base' ? 'Save base' : 'Save report'}
                </FoundationButton>
              )}
            </div>
            {hasUnsavedChanges ? <p className="text-xs font-medium text-amber-700">Unsaved changes</p> : null}
            {!hasUnsavedChanges && activeTab === 'setup' && setupSavedAt ? (
              <p className="text-xs text-emerald-700">Saved at {setupSavedAt}</p>
            ) : null}
            {!hasUnsavedChanges && activeTab !== 'setup' && templateSavedAt ? (
              <p className="text-xs text-emerald-700">Saved at {templateSavedAt}</p>
            ) : null}
          </div>
        )}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Type" value={report.reportKind === 'base' ? 'Base composition' : 'Audience variant'} />
        <MetricCard label="Audience" value={getV2ReportAudienceRoleLabel(report.audienceRole)} />
        <MetricCard label="Sections" value={compositionSections.length} />
        <MetricCard
          label="Inheritance"
          value={report.reportKind === 'base' ? 'Source of truth' : inheritsBase ? 'Inheriting base' : 'Customized'}
        />
      </div>

      <FoundationSurface className="p-4">
        <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Report detail sections">
          {([
            ['setup', 'Setup'],
            ['composition', 'Composition'],
            ['preview', 'Preview'],
            ['advanced', 'Advanced'],
          ] as const).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={['admin-toggle-chip', activeTab === tab ? 'admin-toggle-chip-active' : ''].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </FoundationSurface>

      {activeTab === 'setup' ? (
        <SectionCard
          title="Report setup"
          description={
            report.reportKind === 'base'
              ? 'Name and maintain the shared base composition. Base reports are never published directly.'
              : 'Define what this report is called, who it is for, and whether it is live.'
          }
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs text-[var(--admin-text-muted)]">Report name</span>
              <input
                value={setupDraft.name}
                onChange={(event) => setSetupDraft((current) => ({ ...current, name: event.target.value }))}
                className="foundation-field w-full"
              />
            </label>

            {report.reportKind === 'audience' ? (
              <>
                <label className="block space-y-1.5">
                  <span className="text-xs text-[var(--admin-text-muted)]">Audience</span>
                  <select
                    value={setupDraft.audienceRole}
                    onChange={(event) => setSetupDraft((current) => ({
                      ...current,
                      audienceRole: event.target.value as V2ReportAudienceRole,
                    }))}
                    className="foundation-field w-full"
                  >
                    <option value="candidate">Candidate</option>
                    <option value="practitioner">Practitioner</option>
                    <option value="internal">Internal</option>
                    <option value="client">Client</option>
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs text-[var(--admin-text-muted)]">Status</span>
                  <select
                    value={setupDraft.status}
                    onChange={(event) => setSetupDraft((current) => ({
                      ...current,
                      status: event.target.value as V2AssessmentReportStatus,
                    }))}
                    className="foundation-field w-full"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </label>

                <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={setupDraft.isDefault}
                      onChange={(event) => setSetupDraft((current) => ({
                        ...current,
                        isDefault: event.target.checked,
                      }))}
                    />
                    <span className="text-sm text-[var(--admin-text-primary)]">
                      Use as the default published report
                      <span className="mt-1 block text-xs text-[var(--admin-text-muted)]">
                        Default only applies when the report is published.
                      </span>
                    </span>
                  </label>
                </div>
              </>
            ) : (
              <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4 md:col-span-2">
                <p className="text-sm text-[var(--admin-text-primary)]">
                  This base composition feeds audience reports like{' '}
                  <span className="font-medium">{baseReport?.id === report.id ? 'candidate, client, internal, and practitioner' : 'audience variants'}</span>.
                </p>
                <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
                  Base reports stay in draft and cannot be the default delivery report.
                </p>
              </div>
            )}
          </div>
        </SectionCard>
      ) : null}

      {activeTab === 'composition' ? (
        <div className="space-y-4">
          <SectionCard
            title="Composition"
            description="Build this report from high-level sections. The block engine stays underneath, but the authoring surface stays at the report level."
          >
            <div className="flex flex-wrap gap-2">
              {SECTION_PRESETS.map((preset) => (
                <FoundationButton
                  key={preset.kind}
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => addSection(preset.kind)}
                >
                  Add {preset.label}
                </FoundationButton>
              ))}
            </div>
            <p className="mt-4 text-sm text-[var(--admin-text-muted)]">
              Item-level reporting is intentionally excluded. This composer is for high-level profile, score, insight, recommendation, and editorial sections.
            </p>
            {report.reportKind === 'audience' ? (
              <p className="mt-2 text-sm text-[var(--admin-text-muted)]">
                {inheritsBase
                  ? 'This report is currently inheriting the shared base. Saving changes here will create a local override for this audience.'
                  : 'This report already has local composition overrides on top of the shared base.'}
              </p>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Custom coded blocks"
            description="Some report sections will always be implemented in code first and only later generalized if they prove reusable."
          >
            <p className="text-sm text-[var(--admin-text-primary)]">
              Custom block guidance lives in <span className="font-mono text-xs">docs/report-custom-blocks.md</span>.
            </p>
          </SectionCard>

          <div className="space-y-3">
            {compositionSections.map((section, index) => (
              <FoundationSurface key={section.id} className={['p-5', section.enabled ? '' : 'opacity-60'].filter(Boolean).join(' ')}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium tabular-nums text-[var(--admin-text-soft)]">{index + 1}.</span>
                    <span className="rounded-full bg-[var(--admin-surface-alt)] px-2 py-1 text-[11px] font-medium text-[var(--admin-text-muted)]">
                      {getSectionKindLabel(section.kind)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveSection(section.id, 'up')}
                      disabled={index === 0}
                      className="rounded p-1 text-[var(--admin-text-soft)] hover:text-[var(--admin-text-primary)] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(section.id, 'down')}
                      disabled={index === compositionSections.length - 1}
                      className="rounded p-1 text-[var(--admin-text-soft)] hover:text-[var(--admin-text-primary)] disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSection(section.id, { enabled: !section.enabled })}
                      className={`rounded p-1 ${section.enabled ? 'text-emerald-700 hover:text-emerald-800' : 'text-[var(--admin-text-soft)] hover:text-[var(--admin-text-primary)]'}`}
                    >
                      {section.enabled ? 'On' : 'Off'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(section.id)}
                      className="rounded p-1 text-[var(--admin-text-soft)] hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--admin-text-muted)]">Section title</span>
                    <input
                      value={section.title}
                      onChange={(event) => updateSection(section.id, { title: event.target.value })}
                      className="foundation-field w-full"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--admin-text-muted)]">Section description</span>
                    <input
                      value={section.description ?? ''}
                      onChange={(event) => updateSection(section.id, { description: event.target.value || undefined })}
                      className="foundation-field w-full"
                    />
                  </label>

                  {section.kind === 'score_summary' ? (
                    <>
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Score layer</span>
                        <select
                          value={section.layer ?? 'dimension'}
                          onChange={(event) => updateSection(section.id, { layer: event.target.value as V2ReportSectionLayer })}
                          className="foundation-field w-full"
                        >
                          <option value="dimension">Dimension</option>
                          <option value="competency">Competency</option>
                          <option value="trait">Trait</option>
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Layout</span>
                        <select
                          value={section.layout ?? 'score_cards'}
                          onChange={(event) => updateSection(section.id, { layout: event.target.value as V2BlockDisplayFormat })}
                          className="foundation-field w-full"
                        >
                          {getSectionLayoutOptions(section).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </>
                  ) : (
                    <label className="block space-y-1.5 md:col-span-2">
                      <span className="text-xs text-[var(--admin-text-muted)]">Layout</span>
                      <select
                        value={section.layout ?? getSectionLayoutOptions(section)[0]?.value ?? 'rich_text'}
                        onChange={(event) => updateSection(section.id, { layout: event.target.value as V2BlockDisplayFormat })}
                        className="foundation-field w-full"
                      >
                        {getSectionLayoutOptions(section).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {(section.kind === 'score_summary' || section.kind === 'narrative_insights' || section.kind === 'recommendations') ? (
                    <label className="block space-y-1.5">
                      <span className="text-xs text-[var(--admin-text-muted)]">Max items</span>
                      <input
                        type="number"
                        min={1}
                        value={section.max_items ?? ''}
                        onChange={(event) => updateSection(section.id, {
                          max_items: event.target.value ? Number(event.target.value) : undefined,
                        })}
                        className="foundation-field w-full"
                      />
                    </label>
                  ) : null}

                  {section.kind === 'editorial' ? (
                    <label className="block space-y-1.5 md:col-span-2">
                      <span className="text-xs text-[var(--admin-text-muted)]">Body markdown</span>
                      <textarea
                        value={section.body_markdown ?? ''}
                        onChange={(event) => updateSection(section.id, { body_markdown: event.target.value || undefined })}
                        className="foundation-field min-h-[160px] w-full"
                      />
                    </label>
                  ) : null}

                  <label className="flex items-center gap-3 text-sm text-[var(--admin-text-primary)]">
                    <input
                      type="checkbox"
                      checked={section.pdf_break_before === true}
                      onChange={(event) => updateSection(section.id, { pdf_break_before: event.target.checked || undefined })}
                    />
                    Start on a new PDF page
                  </label>

                  <label className="flex items-center gap-3 text-sm text-[var(--admin-text-primary)]">
                    <input
                      type="checkbox"
                      checked={section.pdf_hidden === true}
                      onChange={(event) => updateSection(section.id, { pdf_hidden: event.target.checked || undefined })}
                    />
                    Hide in PDF exports
                  </label>
                </div>
              </FoundationSurface>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'preview' ? (
        <div className="space-y-4">
          <SectionCard
            title="Preview"
            description="Preview this report against curated samples or real V2 submissions. Live preview uses real submission context while rendering your current local template."
          >
            <div className="flex flex-wrap gap-2">
              <FoundationButton
                type="button"
                variant={previewMode === 'sample' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPreviewMode('sample')}
              >
                Sample profiles
              </FoundationButton>
              <FoundationButton
                type="button"
                variant={previewMode === 'live' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPreviewMode('live')}
              >
                Live submissions
              </FoundationButton>
            </div>

            {previewMode === 'sample' ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {V2_PREVIEW_SAMPLES.map((item) => (
                  <FoundationButton
                    key={item.id}
                    type="button"
                    variant={selectedSampleId === item.id ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setSelectedSampleId(item.id)}
                  >
                    {item.personName}
                  </FoundationButton>
                ))}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    value={previewQuery}
                    onChange={(event) => setPreviewQuery(event.target.value)}
                    placeholder="Search participants or organisations"
                    className="foundation-field w-full"
                  />
                  <FoundationButton type="button" variant="secondary" size="sm" onClick={() => void loadPreviewSubmissions(previewQuery)}>
                    Search
                  </FoundationButton>
                </div>
                <div className="flex flex-wrap gap-2">
                  {previewSubmissions.map((submission) => (
                    <FoundationButton
                      key={submission.id}
                      type="button"
                      variant={selectedSubmissionId === submission.id ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() => setSelectedSubmissionId(submission.id)}
                    >
                      {submission.participantName}
                    </FoundationButton>
                  ))}
                </div>
                {previewSubmissions.length === 0 ? (
                  <p className="text-sm text-[var(--admin-text-muted)]">No live submissions are available for preview yet.</p>
                ) : null}
              </div>
            )}
          </SectionCard>

          <FoundationSurface className="rounded-[24px] border border-[var(--admin-border)] bg-white p-6">
            <div className="border-b border-[var(--admin-border)] pb-5">
              {previewMode === 'sample' ? (
                <>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{sample.organisation}</p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">{sample.reportTitle}</h3>
                  <p className="mt-2 text-sm text-slate-500">{sample.reportSubtitle}</p>
                </>
              ) : selectedSubmission ? (
                <>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                    {selectedSubmission.organisation || selectedSubmission.email || 'Live submission'}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-950">{livePreviewName || selectedSubmission.participantName}</h3>
                  <p className="mt-2 text-sm text-slate-500">Submitted {formatSubmittedAt(selectedSubmission.submittedAt)}</p>
                </>
              ) : (
                <p className="text-sm text-slate-500">Choose a live submission to preview this report.</p>
              )}
            </div>

            <div className="mt-6">
              <V2BlockReportView
                template={template}
                context={
                  previewMode === 'live' && livePreviewContext?.v2Report
                    ? {
                        assessmentId,
                        submissionId: livePreviewContext.submissionId,
                        scoringConfig: normalizeV2ScoringConfig(livePreviewContext.scoringConfig),
                        v2Report: livePreviewContext.v2Report,
                      }
                    : { assessmentId, sampleProfileId: selectedSampleId, scoringConfig }
                }
                displayMode="report"
              />
            </div>
          </FoundationSurface>
        </div>
      ) : null}

      {activeTab === 'advanced' ? (
        <div className="space-y-4">
          <SectionCard
            title="Advanced block editing"
            description="Drop into the raw block layer when you need a custom coded or technical report path. This remains the escape hatch, not the default authoring flow."
          >
            <div className="grid gap-4 md:grid-cols-[minmax(0,0.8fr)_minmax(0,0.8fr)_auto]">
              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Source</span>
                <select
                  value={addRawSource}
                  onChange={(event) => setAddRawSource(event.target.value as V2BlockDataSource)}
                  className="foundation-field w-full"
                >
                  {RAW_SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Format</span>
                <select
                  value={addRawFormat}
                  onChange={(event) => setAddRawFormat(event.target.value as V2BlockDisplayFormat)}
                  className="foundation-field w-full"
                >
                  {(RAW_FORMAT_OPTIONS[addRawSource] ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex items-end">
                <FoundationButton type="button" variant="secondary" size="sm" onClick={addRawBlock}>
                  Add raw block
                </FoundationButton>
              </div>
            </div>
          </SectionCard>

          <div className="space-y-3">
            {template.blocks.map((block, index) => (
              <FoundationSurface key={block.id} className={['p-5', block.enabled ? '' : 'opacity-60'].filter(Boolean).join(' ')}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium tabular-nums text-[var(--admin-text-soft)]">{index + 1}.</span>
                    <span className="rounded-full bg-[var(--admin-surface-alt)] px-2 py-1 text-[11px] font-medium text-[var(--admin-text-muted)]">
                      {RAW_SOURCE_OPTIONS.find((option) => option.value === block.source)?.label ?? block.source}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveRawBlock(block.id, 'up')}
                      disabled={index === 0}
                      className="rounded p-1 text-[var(--admin-text-soft)] hover:text-[var(--admin-text-primary)] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRawBlock(block.id, 'down')}
                      disabled={index === template.blocks.length - 1}
                      className="rounded p-1 text-[var(--admin-text-soft)] hover:text-[var(--admin-text-primary)] disabled:opacity-30"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRawBlock(block.id, { enabled: !block.enabled })}
                      className={`rounded p-1 ${block.enabled ? 'text-emerald-700 hover:text-emerald-800' : 'text-[var(--admin-text-soft)] hover:text-[var(--admin-text-primary)]'}`}
                    >
                      {block.enabled ? 'On' : 'Off'}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRawBlock(block.id)}
                      className="rounded p-1 text-[var(--admin-text-soft)] hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--admin-text-muted)]">Source</span>
                    <select
                      value={block.source}
                      onChange={(event) => updateRawBlock(block.id, { source: event.target.value as V2BlockDataSource })}
                      className="foundation-field w-full"
                    >
                      {RAW_SOURCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--admin-text-muted)]">Format</span>
                    <select
                      value={block.format}
                      onChange={(event) => updateRawBlock(block.id, { format: event.target.value as V2BlockDisplayFormat })}
                      className="foundation-field w-full"
                    >
                      {(RAW_FORMAT_OPTIONS[block.source] ?? []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--admin-text-muted)]">Title</span>
                    <input
                      value={block.content?.title ?? ''}
                      onChange={(event) => updateRawBlock(block.id, {
                        content: { ...block.content, title: event.target.value || undefined },
                      })}
                      className="foundation-field w-full"
                    />
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--admin-text-muted)]">Description</span>
                    <input
                      value={block.content?.description ?? ''}
                      onChange={(event) => updateRawBlock(block.id, {
                        content: { ...block.content, description: event.target.value || undefined },
                      })}
                      className="foundation-field w-full"
                    />
                  </label>
                </div>
              </FoundationSurface>
            ))}
          </div>
        </div>
      ) : null}
    </DashboardPageShell>
  )
}
