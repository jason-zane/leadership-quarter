'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useBeforeUnloadWarning, useUnsavedChanges } from '@/components/dashboard/hooks/use-unsaved-changes'
import { motion } from 'framer-motion'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import {
  isValidCtaUrl,
  normalizeReportTemplate,
  type BlockDataConfig,
  type BlockDataSource,
  type BlockDisplayFormat,
  type BlockLinkConfig,
  type CtaInternalDestinationKey,
  type ReportBlockDefinition,
  type ReportBrandingConfig,
  type ReportPresentationConfig,
  type ReportSectionKind,
  type ReportStylePreset,
  type ReportTemplateDefinition,
} from '@/utils/assessments/assessment-report-template'
import { normalizeScoringConfig, type ScoringConfig } from '@/utils/assessments/assessment-scoring'
import { normalizeQuestionBank } from '@/utils/assessments/assessment-question-bank'
import type { SubmissionReportData } from '@/utils/assessments/assessment-runtime-model'
import {
  getReportAudienceRoleLabel,
  type AssessmentReportRecord,
  type AssessmentReportStatus,
  type ReportAudienceRole,
} from '@/utils/reports/assessment-report-records'
import { hasReportOverrides } from '@/utils/reports/assessment-report-inheritance'
import { createReportBlockId } from '@/utils/reports/assessment-report-builder-defaults'
import {
  compileReportBlocksFromComposition,
  createComposerSectionPreset,
  ensureTemplateHasComposition,
  inferReportCompositionFromBlocks,
  syncTemplateBlocksFromComposition,
} from '@/utils/reports/assessment-report-composer'
import { AssessmentBlockReportView } from '@/components/reports/assessment-block-report-view'
import { buildBrandCssOverrides, validateHexColor } from '@/utils/brand/org-brand-utils'
import { resolveBlockData, type ReportMeta } from '@/utils/reports/assessment-report-block-data'

type DetailTab = 'overview' | 'blocks' | 'branding' | 'preview'
type PreviewMode = 'sample' | 'live'

type LoadPayload = {
  ok?: boolean
  report?: AssessmentReportRecord
  baseReport?: AssessmentReportRecord | null
}

type ScoringPayload = {
  ok?: boolean
  scoringConfig?: unknown
}

type PreviewSubmissionRow = {
  id: string
  previewSampleKey: string | null
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
    questionBank?: unknown
    v2Report?: SubmissionReportData | null
    reportMeta?: ReportMeta
  }
  participantName?: string
}

const BLOCK_PRESETS: Array<{ kind: ReportSectionKind; label: string }> = [
  { kind: 'overall_profile', label: 'Overall profile' },
  { kind: 'score_summary', label: 'Score summary' },
  { kind: 'narrative_insights', label: 'Narrative' },
  { kind: 'recommendations', label: 'Recommendations' },
  { kind: 'editorial', label: 'Editorial' },
]

const SCORE_LAYOUT_OPTIONS: Array<{ value: BlockDisplayFormat; label: string }> = [
  { value: 'score_cards', label: 'Score cards' },
  { value: 'bar_chart', label: 'Bar chart' },
  { value: 'score_table', label: 'Score table' },
  { value: 'band_cards', label: 'Band cards' },
  { value: 'bipolar_bar', label: 'Bipolar bar' },
]

const RECOMMENDATION_LAYOUT_OPTIONS: Array<{ value: BlockDisplayFormat; label: string }> = [
  { value: 'bullet_list', label: 'Bullet list' },
  { value: 'insight_list', label: 'Insight cards' },
]

const RAW_SOURCE_OPTIONS: Array<{ value: BlockDataSource; label: string }> = [
  { value: 'report_header', label: 'Report header' },
  { value: 'overall_classification', label: 'Overall classification' },
  { value: 'derived_outcome', label: 'Derived outcome' },
  { value: 'archetype_profile', label: 'Archetype profile' },
  { value: 'layer_profile', label: 'Layer profile' },
  { value: 'dimension_scores', label: 'Dimension scores' },
  { value: 'competency_scores', label: 'Competency scores' },
  { value: 'trait_scores', label: 'Trait scores' },
  { value: 'recommendations', label: 'Recommendations' },
  { value: 'static_content', label: 'Static content' },
  { value: 'report_cta', label: 'Call to action' },
]

const RAW_FORMAT_OPTIONS: Record<BlockDataSource, Array<{ value: BlockDisplayFormat; label: string }>> = {
  overall_classification: [
    { value: 'hero_card', label: 'Hero card' },
    { value: 'rich_text', label: 'Rich text' },
  ],
  derived_outcome: [
    { value: 'hero_card', label: 'Hero card' },
    { value: 'rich_text', label: 'Rich text' },
    { value: 'band_cards', label: 'Band cards' },
  ],
  layer_profile: SCORE_LAYOUT_OPTIONS,
  archetype_profile: [
    { value: 'hero_card', label: 'Hero card' },
    { value: 'rich_text', label: 'Rich text' },
  ],
  dimension_scores: SCORE_LAYOUT_OPTIONS,
  competency_scores: SCORE_LAYOUT_OPTIONS,
  trait_scores: SCORE_LAYOUT_OPTIONS,
  interpretations: [
    { value: 'insight_list', label: 'Insight list' },
    { value: 'rich_text', label: 'Rich text' },
  ],
  recommendations: RECOMMENDATION_LAYOUT_OPTIONS,
  static_content: [{ value: 'rich_text', label: 'Rich text' }],
  report_header: [{ value: 'hero_card', label: 'Hero card' }],
  report_cta: [{ value: 'rich_text', label: 'Rich text' }],
}

const LAYOUT_DESCRIPTIONS: Partial<Record<BlockDisplayFormat, string>> = {
  score_cards: 'Two-column cards showing dimension name, score, and band.',
  bar_chart: 'Horizontal percentage bars — good for showing relative scores at a glance.',
  band_cards: 'Cards where the band label is the primary text. Uncheck "Show numeric score" to use the profile card style.',
  score_table: 'Compact table listing all scores in rows.',
  insight_list: 'Titled cards — one per insight or recommendation.',
  bullet_list: 'Simple stacked cards without titles.',
  hero_card: 'Large feature card showing the overall classification or derived outcome label.',
  rich_text: 'Free-form text block — supports plain copy or Markdown.',
  bipolar_bar: 'Bars with low/high descriptors at each end — designed for STEN-style scales.',
}

const BRANDING_MODE_OPTIONS: Array<{ value: NonNullable<ReportBrandingConfig['mode']>; label: string }> = [
  { value: 'inherit_org', label: 'Inherit client branding' },
  { value: 'force_lq', label: 'Force Leadership Quarter branding' },
  { value: 'custom_override', label: 'Custom report override' },
]

const STYLE_PRESET_OPTIONS: Array<{ value: ReportStylePreset; label: string; description: string }> = [
  { value: 'classic', label: 'Classic', description: 'Balanced card elevation with the default LQ report rhythm.' },
  { value: 'editorial', label: 'Editorial', description: 'Stronger section hierarchy, deeper framing, and more presence in key cards.' },
  { value: 'minimal', label: 'Minimal', description: 'Cleaner borders and lighter chrome for client-led presentations.' },
]

const NARRATIVE_FIELD_OPTIONS: Array<{ value: NonNullable<BlockDataConfig['heading_field']>; label: string }> = [
  { value: 'label', label: 'Outcome label' },
  { value: 'short_description', label: 'Short description' },
  { value: 'report_summary', label: 'Report summary' },
  { value: 'full_narrative', label: 'Full narrative' },
]

const BODY_FIELD_OPTIONS: Array<{ value: NonNullable<BlockDataConfig['body_field']>; label: string }> = [
  { value: 'short_description', label: 'Short description' },
  { value: 'report_summary', label: 'Report summary' },
  { value: 'full_narrative', label: 'Full narrative' },
]

const PROFILE_LAYER_OPTIONS: Array<{ value: NonNullable<BlockDataConfig['layer']>; label: string }> = [
  { value: 'dimension', label: 'Dimensions' },
  { value: 'competency', label: 'Competencies' },
  { value: 'trait', label: 'Traits' },
]

const PROFILE_LABEL_OPTIONS: Array<{ value: NonNullable<BlockDataConfig['label_mode']>; label: string }> = [
  { value: 'external', label: 'External label' },
  { value: 'internal', label: 'Internal label' },
]

const PROFILE_BODY_OPTIONS: Array<{ value: NonNullable<BlockDataConfig['body_source']>; label: string }> = [
  { value: 'summary_definition', label: 'Summary definition' },
  { value: 'detailed_definition', label: 'Detailed definition' },
  { value: 'current_band_behaviour', label: 'Current band behaviour' },
  { value: 'none', label: 'No body copy' },
]

const PROFILE_BEHAVIOUR_OPTIONS: Array<{ value: NonNullable<BlockDataConfig['behaviour_snapshot_mode']>; label: string }> = [
  { value: 'current_only', label: 'Current band only' },
  { value: 'low_high_only', label: 'Low and high only' },
  { value: 'all_three', label: 'Low, mid, and high' },
  { value: 'none', label: 'Hide behaviour text' },
]

const PROFILE_METRIC_OPTIONS: Array<{ value: NonNullable<BlockDataConfig['metric_key']>; label: string }> = [
  { value: 'display', label: 'Display score' },
  { value: 'raw', label: 'Raw score' },
  { value: 'sten', label: 'STEN score' },
  { value: 'percentile', label: 'Percentile' },
]

const PROFILE_SORT_OPTIONS: Array<{ value: NonNullable<BlockDataConfig['sort_mode']>; label: string }> = [
  { value: 'template_order', label: 'Template order' },
  { value: 'score_desc', label: 'Score descending' },
  { value: 'score_asc', label: 'Score ascending' },
  { value: 'alphabetical', label: 'Alphabetical' },
]

const CTA_DESTINATION_OPTIONS: Array<{ value: CtaInternalDestinationKey; label: string }> = [
  { value: 'home', label: 'Homepage' },
  { value: 'contact', label: 'Contact' },
  { value: 'framework', label: 'Framework hub' },
  { value: 'framework_ai_readiness', label: 'AI readiness framework' },
  { value: 'framework_lq8', label: 'LQ8 framework' },
  { value: 'capabilities', label: 'Capabilities hub' },
  { value: 'capability_ai_readiness', label: 'AI readiness capability' },
  { value: 'capability_leadership_assessment', label: 'Leadership assessment capability' },
  { value: 'capability_executive_search', label: 'Executive search capability' },
  { value: 'capability_succession_strategy', label: 'Succession strategy capability' },
  { value: 'work_with_us', label: 'Work with us' },
]

function createDefaultBlockContent(source: BlockDataSource): ReportBlockDefinition['content'] | undefined {
  if (source === 'report_header') return undefined
  if (source === 'overall_classification' || source === 'derived_outcome' || source === 'archetype_profile') {
    return undefined
  }
  if (source === 'layer_profile') {
    return {
      title: 'Core capability summary',
    }
  }
  if (source === 'report_cta') {
    return {
      eyebrow: 'Next step',
      title: 'Continue the conversation',
    }
  }

  return {
    title: RAW_SOURCE_OPTIONS.find((option) => option.value === source)?.label ?? source,
  }
}

function createDefaultRawBlock(
  source: BlockDataSource,
  format: BlockDisplayFormat
): ReportBlockDefinition {
  return {
    id: createReportBlockId(),
    source,
    format,
    content: createDefaultBlockContent(source),
    data: source === 'report_header'
      ? {
          badge_label: 'Assessment report',
          show_date: true,
          show_participant: true,
          show_email: true,
        }
      : source === 'derived_outcome' || source === 'archetype_profile'
        ? {
            heading_field: 'label',
            summary_field: 'report_summary',
            body_field: 'full_narrative',
          }
        : source === 'layer_profile'
            ? {
                layer: 'competency',
                label_mode: 'external',
                body_source: 'summary_definition',
                show_band: true,
                show_low_high_meaning: true,
                behaviour_snapshot_mode: 'current_only',
                split_items_into_cards: false,
                metric_key: 'display',
                sort_mode: 'template_order',
              }
        : source === 'report_cta'
          ? {
              badge_label: 'Next step',
            }
          : source === 'recommendations'
            ? {
                content_mode: 'derived_outcome',
              }
              : undefined,
    link: source === 'report_cta'
      ? {
          mode: 'internal',
          internal_key: 'contact',
          label: 'Contact us',
          open_in_new_tab: false,
        }
      : undefined,
    enabled: true,
  }
}

function getBlockSourceHelp(source: BlockDataSource, scoringConfig: ScoringConfig | null) {
  if (source === 'report_header') {
    return {
      summary: 'Uses resolved report metadata: branding, completion date, report title and copy, participant name, and email.',
      details: ['Brand logo or Leadership Quarter mark', 'Completion date', 'Participant name and email'],
    }
  }

  if (source === 'derived_outcome') {
    return {
      summary: 'Derived outcomes expose the matched outcome label plus short description, report summary, full narrative, recommendations, and matched input evidence.',
      details: [
        `${scoringConfig?.derivedOutcomes.length ?? 0} configured outcome set${(scoringConfig?.derivedOutcomes.length ?? 0) === 1 ? '' : 's'}`,
        'Use "Outcome label" for titles like AI Ready Operator',
        'Summary/body can map to short description, report summary, or full narrative',
      ],
    }
  }

  if (source === 'layer_profile') {
    return {
      summary: 'Layer profiles merge fixed question-bank content with scored output for dimensions, competencies, or traits.',
      details: [
        'Definitions and behaviour text come from the question bank',
        'Scores come from the resolved submission artifacts',
        'Pick display, raw, STEN, or percentile where available',
      ],
    }
  }

  if (source === 'archetype_profile') {
    return {
      summary: 'Archetype profiles expose the matched profile label, short description, report summary, full narrative, recommendations, and strength/constraint evidence.',
      details: [
        `${scoringConfig?.archetypes.length ?? 0} configured archetype set${(scoringConfig?.archetypes.length ?? 0) === 1 ? '' : 's'}`,
        'Heading can use the archetype label',
        'Body can use the full narrative or report summary',
      ],
    }
  }

  if (source === 'recommendations') {
    return {
      summary: 'Recommendations can pull the report recommendation list or the recommendations attached to the matched derived outcome or archetype.',
      details: ['Content source: report recommendations or derived outcome recommendations'],
    }
  }

  if (source === 'report_cta') {
    return {
      summary: 'CTA blocks render a closing action card with supporting copy and a button to an internal route or custom URL.',
      details: ['Internal route registry', 'Custom absolute URL or site path'],
    }
  }

  if (source === 'static_content') {
    return {
      summary: 'Static content renders author-written markdown only.',
      details: ['Free-form copy'],
    }
  }

  return {
    summary: 'This block renders scored report data from the resolved submission context.',
    details: ['Layer scores', 'Bands', 'Optional numeric values'],
  }
}

function bootstrapBlocks(normalized: ReportTemplateDefinition): ReportTemplateDefinition {
  return normalized.blocks.length === 0 && (normalized.composition?.sections.length ?? 0) > 0
    ? syncTemplateBlocksFromComposition(normalized)
    : normalized
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

function BuilderPill({
  label,
  tone = 'neutral',
}: {
  label: string
  tone?: 'neutral' | 'accent' | 'success' | 'warning'
}) {
  const toneClass =
    tone === 'accent'
      ? 'border-sky-200 bg-sky-50 text-sky-800'
      : tone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-[var(--admin-border)] bg-[var(--admin-surface-alt)] text-[var(--admin-text-muted)]'

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${toneClass}`}>
      {label}
    </span>
  )
}

function EditorPanel({
  title,
  description,
  children,
  className = '',
}: {
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-[18px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4 ${className}`.trim()}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">{title}</p>
        {description ? (
          <p className="mt-1 text-xs leading-5 text-[var(--admin-text-muted)]">{description}</p>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

function getOptionLabel<T extends string>(
  options: Array<{ value: T; label: string }>,
  value: T | undefined
) {
  return options.find((option) => option.value === value)?.label ?? value ?? ''
}

function formatSubmittedAt(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function normalizeBrandingConfig(input: ReportBrandingConfig | undefined): ReportBrandingConfig {
  return {
    mode: input?.mode ?? 'inherit_org',
    company_name: input?.company_name ?? '',
    logo_url: input?.logo_url ?? '',
    primary_color: input?.primary_color ?? '',
    secondary_color: input?.secondary_color ?? '',
    show_lq_attribution: input?.show_lq_attribution ?? true,
  }
}

function normalizePresentationConfig(input: ReportPresentationConfig | undefined): ReportPresentationConfig {
  return {
    style_preset:
      input?.style_preset === 'editorial' || input?.style_preset === 'minimal'
        ? input.style_preset
        : 'classic',
  }
}

function buildPreviewReportMeta(input: {
  template: ReportTemplateDefinition
  participantName: string
  recipientEmail?: string | null
  completedAt?: string | null
  baseMeta?: ReportMeta | null
}) {
  const branding = normalizeBrandingConfig(input.template.global.branding)
  const baseMeta = input.baseMeta ?? null
  const primaryColor = branding.primary_color && validateHexColor(branding.primary_color) ? branding.primary_color : ''
  const secondaryColor = branding.secondary_color && validateHexColor(branding.secondary_color) ? branding.secondary_color : ''
  const resolvedBrandName =
    branding.mode === 'force_lq'
      ? null
      : (branding.company_name || baseMeta?.orgName || null)
  const resolvedLogoUrl =
    branding.mode === 'force_lq'
      ? null
      : (branding.logo_url || baseMeta?.orgLogoUrl || null)
  const resolvedCssOverrides = branding.mode === 'force_lq'
    ? ''
    : buildBrandCssOverrides({
        branding_enabled: Boolean(
          branding.mode === 'custom_override'
          || baseMeta?.orgLogoUrl
          || baseMeta?.brandingCssOverrides
        ),
        logo_url: resolvedLogoUrl,
        favicon_url: null,
        primary_color: primaryColor || null,
        secondary_color: secondaryColor || null,
        company_name: resolvedBrandName,
        show_lq_attribution: branding.show_lq_attribution !== false,
      })

  return {
    title: input.template.name || 'Assessment report',
    subtitle: input.template.description ?? '',
    participantName: input.participantName,
    recipientEmail: input.recipientEmail ?? null,
    completedAt: input.completedAt ?? null,
    orgLogoUrl: resolvedLogoUrl,
    orgName: resolvedBrandName,
    brandingCssOverrides: resolvedCssOverrides || baseMeta?.brandingCssOverrides || '',
    showLqAttribution:
      branding.mode !== 'force_lq'
      && branding.show_lq_attribution !== false
      && Boolean(resolvedLogoUrl || resolvedBrandName),
  } satisfies ReportMeta
}

export default function AssessmentReportPage() {
  const { id: assessmentId, variantId } = useParams<{ id: string; variantId: string }>()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab')
  const initialSampleKey = searchParams.get('sample')

  const [report, setReport] = useState<AssessmentReportRecord | null>(null)
  const [baseReport, setBaseReport] = useState<AssessmentReportRecord | null>(null)
  const [template, setTemplate] = useState<ReportTemplateDefinition | null>(null)
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig | null>(null)
  const [samplePreviewSubmissions, setSamplePreviewSubmissions] = useState<PreviewSubmissionRow[]>([])
  const [livePreviewSubmissions, setLivePreviewSubmissions] = useState<PreviewSubmissionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSetup, setSavingSetup] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [resettingOverrides, setResettingOverrides] = useState(false)
  const [uploadingBrandLogo, setUploadingBrandLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [brandingError, setBrandingError] = useState<string | null>(null)
  const [brandingNotice, setBrandingNotice] = useState<string | null>(null)
  const [previewNotice, setPreviewNotice] = useState<string | null>(null)
  const [setupSavedAt, setSetupSavedAt] = useState<string | null>(null)
  const [templateSavedAt, setTemplateSavedAt] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<DetailTab>(
    initialTab === 'setup'
      ? 'overview'
      : initialTab === 'design'
        ? 'blocks'
        : initialTab === 'preview' || initialTab === 'overview' || initialTab === 'blocks' || initialTab === 'branding'
          ? initialTab
          : 'blocks'
  )
  const [previewMode, setPreviewMode] = useState<PreviewMode>('sample')
  const [samplePreviewQuery, setSamplePreviewQuery] = useState('')
  const [livePreviewQuery, setLivePreviewQuery] = useState('')
  const [selectedSampleSubmissionId, setSelectedSampleSubmissionId] = useState('')
  const [selectedLiveSubmissionId, setSelectedLiveSubmissionId] = useState('')
  const [previewContextData, setPreviewContextData] = useState<PreviewPayload['context'] | null>(null)
  const [previewParticipantName, setPreviewParticipantName] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({})
  const [draggingBlockId, setDraggingBlockId] = useState<string | null>(null)
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null)
  const [pendingBrandLogoFile, setPendingBrandLogoFile] = useState<File | null>(null)
  const [pendingBrandLogoPreview, setPendingBrandLogoPreview] = useState<string | null>(null)
  const [setupDraft, setSetupDraft] = useState<{
    name: string
    audienceRole: ReportAudienceRole
    status: AssessmentReportStatus
    isDefault: boolean
  }>({
    name: '',
    audienceRole: 'candidate',
    status: 'draft',
    isDefault: false,
  })
  const brandLogoInputRef = useRef<HTMLInputElement>(null)
  const [addRawSource, setAddRawSource] = useState<BlockDataSource>('derived_outcome')
  const [addRawFormat, setAddRawFormat] = useState<BlockDisplayFormat>('hero_card')
  const { isDirty: setupDirty, markSaved: markSetupSaved } = useUnsavedChanges(setupDraft, { warnOnUnload: false })
  const { isDirty: templateDirty, markSaved: markTemplateSaved } = useUnsavedChanges(template, { warnOnUnload: false })

  const selectedSampleSubmission = useMemo(
    () => samplePreviewSubmissions.find((submission) => submission.id === selectedSampleSubmissionId) ?? null,
    [samplePreviewSubmissions, selectedSampleSubmissionId]
  )
  const selectedLiveSubmission = useMemo(
    () => livePreviewSubmissions.find((submission) => submission.id === selectedLiveSubmissionId) ?? null,
    [livePreviewSubmissions, selectedLiveSubmissionId]
  )
  const selectedPreviewSubmission = previewMode === 'sample' ? selectedSampleSubmission : selectedLiveSubmission
  const previewReportMeta = useMemo(() => {
    if (!template) return null
    return buildPreviewReportMeta({
      template,
      participantName: previewParticipantName || selectedPreviewSubmission?.participantName || 'Participant',
      recipientEmail: selectedPreviewSubmission?.email ?? null,
      completedAt: selectedPreviewSubmission?.submittedAt ?? null,
      baseMeta: previewContextData?.reportMeta ?? null,
    })
  }, [previewContextData?.reportMeta, previewParticipantName, selectedPreviewSubmission, template])
  const inheritsBase = Boolean(report && report.reportKind === 'audience' && !hasReportOverrides(report))
  const canResetToBase = Boolean(report && report.reportKind === 'audience' && hasReportOverrides(report))
  const hasUnsavedChanges = setupDirty || templateDirty
  const templateBranding = normalizeBrandingConfig(template?.global.branding)
  const templatePresentation = normalizePresentationConfig(template?.global.presentation)
  const brandingPrimaryInvalid = Boolean(templateBranding.primary_color && !validateHexColor(templateBranding.primary_color))
  const brandingSecondaryInvalid = Boolean(templateBranding.secondary_color && !validateHexColor(templateBranding.secondary_color))
  const brandingLogoPreview = pendingBrandLogoPreview || templateBranding.logo_url || previewReportMeta?.orgLogoUrl || null
  const derivedOutcomeSets = scoringConfig?.derivedOutcomes ?? []
  const archetypeSets = scoringConfig?.archetypes ?? []
  const templateBlocks = template?.blocks ?? []
  const enabledBlockCount = templateBlocks.filter((block) => block.enabled).length
  const hasHeaderBlock = templateBlocks.some((block) => block.source === 'report_header')
  const hasCtaBlock = templateBlocks.some((block) => block.source === 'report_cta' && block.enabled)
  const visiblePreviewSubmissions = previewMode === 'sample' ? samplePreviewSubmissions : livePreviewSubmissions
  const selectedPreviewSubmissionId = previewMode === 'sample' ? selectedSampleSubmissionId : selectedLiveSubmissionId
  const activePreviewQuery = previewMode === 'sample' ? samplePreviewQuery : livePreviewQuery
  const previewContext = useMemo(() => {
    if (!previewReportMeta || !selectedPreviewSubmission || !previewContextData?.v2Report) return null

    return {
      assessmentId,
      submissionId: previewContextData.submissionId,
      scoringConfig: normalizeScoringConfig(previewContextData.scoringConfig),
      questionBank: normalizeQuestionBank(previewContextData.questionBank),
      v2Report: previewContextData.v2Report,
      reportMeta: previewReportMeta,
    }
  }, [assessmentId, previewContextData, previewReportMeta, selectedPreviewSubmission])
  const previewResolutionSummary = useMemo(() => {
    if (!previewContext || !template) {
      return { enabled: 0, rendered: 0, unresolved: 0 }
    }

    const eligibleBlocks = template.blocks.filter((block) => {
      if (!block.enabled) return false
      if (block.style?.pdf_hidden) return false
      return true
    })
    const rendered = eligibleBlocks.filter((block) => Boolean(resolveBlockData(block, previewContext))).length

    return {
      enabled: eligibleBlocks.length,
      rendered,
      unresolved: eligibleBlocks.length - rendered,
    }
  }, [previewContext, template])

  useEffect(() => {
    if (!template?.blocks.length) return

    setCollapsedBlocks((current) => {
      const next: Record<string, boolean> = {}
      for (const block of template.blocks) {
        next[block.id] = current[block.id] ?? true
      }
      return next
    })
  }, [template?.blocks])

  useBeforeUnloadWarning(hasUnsavedChanges)

  useEffect(() => {
    const nextFormat = RAW_FORMAT_OPTIONS[addRawSource]?.[0]?.value
    if (!nextFormat) return
    setAddRawFormat((current) =>
      RAW_FORMAT_OPTIONS[addRawSource].some((option) => option.value === current) ? current : nextFormat
    )
  }, [addRawSource])

  const loadPreviewSubmissions = useCallback(async (mode: PreviewMode, query = '') => {
    try {
      const response = await fetch(
        `/api/admin/assessments/${assessmentId}/reports/preview-submissions?mode=${mode}&q=${encodeURIComponent(query)}`,
        { cache: 'no-store' }
      )
      const body = await response.json().catch(() => null) as PreviewSubmissionsPayload | null

      if (!response.ok || !body?.ok) {
        setPreviewNotice(`Failed to load ${mode === 'sample' ? 'sample' : 'live'} preview submissions.`)
        return
      }

      const submissions = body.submissions ?? []
      setPreviewNotice(null)

      if (mode === 'sample') {
        setSamplePreviewSubmissions(submissions)
        setSelectedSampleSubmissionId((current) => {
          if (current && submissions.some((submission) => submission.id === current)) {
            return current
          }
          if (initialSampleKey) {
            const matchingSample = submissions.find((submission) =>
              submission.id === initialSampleKey || submission.previewSampleKey === initialSampleKey
            )
            if (matchingSample) return matchingSample.id
          }
          return submissions[0]?.id ?? ''
        })
        return
      }

      setLivePreviewSubmissions(submissions)
      setSelectedLiveSubmissionId((current) => {
        if (current && submissions.some((submission) => submission.id === current)) {
          return current
        }
        return submissions[0]?.id ?? ''
      })
    } catch {
      setPreviewNotice(`Failed to load ${mode === 'sample' ? 'sample' : 'live'} preview submissions.`)
    }
  }, [assessmentId, initialSampleKey])

  useEffect(() => {
    if (activeTab !== 'preview' || !report || samplePreviewSubmissions.length > 0) return
    void loadPreviewSubmissions('sample', samplePreviewQuery)
  }, [activeTab, loadPreviewSubmissions, report, samplePreviewQuery, samplePreviewSubmissions.length])

  useEffect(() => {
    if (activeTab !== 'preview' || !report || livePreviewSubmissions.length > 0) return
    void loadPreviewSubmissions('live', livePreviewQuery)
  }, [activeTab, livePreviewQuery, livePreviewSubmissions.length, loadPreviewSubmissions, report])

  useEffect(() => {
    return () => {
      if (pendingBrandLogoPreview?.startsWith('blob:')) {
        URL.revokeObjectURL(pendingBrandLogoPreview)
      }
    }
  }, [pendingBrandLogoPreview])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPreviewNotice(null)
    setPreviewContextData(null)
    setPreviewParticipantName('')
    setSamplePreviewSubmissions([])
    setLivePreviewSubmissions([])
    setSelectedSampleSubmissionId('')
    setSelectedLiveSubmissionId('')

    try {
      const [reportResponse, scoringResponse] = await Promise.all([
        fetch(`/api/admin/assessments/${assessmentId}/reports/${variantId}`, {
          cache: 'no-store',
        }),
        fetch(`/api/admin/assessments/${assessmentId}/scoring`, {
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

      const normalized = ensureTemplateHasComposition(normalizeReportTemplate(body.report.templateDefinition))
      const nextTemplate = bootstrapBlocks(normalized)
      const nextReport = { ...body.report, templateDefinition: nextTemplate }

      setReport(nextReport)
      setBaseReport(body.baseReport ?? null)
      setTemplate(nextTemplate)
      setScoringConfig(normalizeScoringConfig(scoringBody?.scoringConfig))
      const nextSetupDraft = {
        name: nextReport.name,
        audienceRole: nextReport.audienceRole,
        status: nextReport.status,
        isDefault: nextReport.isDefault,
      }
      setSetupDraft(nextSetupDraft)
      markSetupSaved(nextSetupDraft)
      markTemplateSaved(nextTemplate)
      setSetupSavedAt(null)
      setTemplateSavedAt(null)
    } catch {
      setError('Failed to load this report.')
    } finally {
      setLoading(false)
    }
  }, [assessmentId, markSetupSaved, markTemplateSaved, variantId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const selectedSubmissionId = previewMode === 'sample' ? selectedSampleSubmissionId : selectedLiveSubmissionId

    if (activeTab !== 'preview' || !report || !selectedSubmissionId) {
      setPreviewContextData(null)
      setPreviewParticipantName('')
      setPreviewLoading(false)
      return
    }

    let cancelled = false
    setPreviewLoading(true)
    setPreviewNotice(null)

    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/assessments/${assessmentId}/reports/${report.id}/preview?submissionId=${encodeURIComponent(selectedSubmissionId)}`,
          { cache: 'no-store' }
        )
        const body = await response.json().catch(() => null) as PreviewPayload | null

        if (cancelled) return

        if (!response.ok || !body?.ok || !body.context) {
          setPreviewContextData(null)
          setPreviewParticipantName('')
          setPreviewNotice('Preview data is not available for the selected submission.')
          setPreviewLoading(false)
          return
        }

        setPreviewContextData(body.context)
        setPreviewParticipantName(body.participantName ?? '')
        setPreviewLoading(false)
      } catch {
        if (cancelled) return
        setPreviewContextData(null)
        setPreviewParticipantName('')
        setPreviewNotice('Preview data is not available for the selected submission.')
        setPreviewLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeTab, assessmentId, previewMode, report, selectedLiveSubmissionId, selectedSampleSubmissionId])

  const saveSetup = async () => {
    if (!report || !template) return

    setSavingSetup(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/reports/${variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...setupDraft,
          templateDefinition: template,
        }),
      })
      const body = (await response.json().catch(() => null)) as LoadPayload | null

      if (!response.ok || !body?.ok || !body.report) {
        setError('Failed to save report setup.')
        return
      }

      const normalized = ensureTemplateHasComposition(normalizeReportTemplate(body.report.templateDefinition))
      const nextTemplate = bootstrapBlocks(normalized)
      const nextReport = { ...body.report, templateDefinition: nextTemplate }
      const nextSetupDraft = {
        name: nextReport.name,
        audienceRole: nextReport.audienceRole,
        status: nextReport.status,
        isDefault: nextReport.isDefault,
      }

      setReport(nextReport)
      setBaseReport(body.baseReport ?? null)
      setTemplate(nextTemplate)
      setSetupDraft(nextSetupDraft)
      markSetupSaved(nextSetupDraft)
      markTemplateSaved(nextTemplate)
      setSetupSavedAt(new Date().toLocaleTimeString())
      setBrandingError(null)
      setBrandingNotice('Report setup saved.')
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
      const response = await fetch(`/api/admin/assessments/${assessmentId}/reports/${variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateDefinition: template }),
      })
      const body = (await response.json().catch(() => null)) as LoadPayload | null

      if (!response.ok || !body?.ok || !body.report) {
        setError('Failed to save report changes.')
        return
      }

      const normalized = ensureTemplateHasComposition(normalizeReportTemplate(body.report.templateDefinition))
      const nextTemplate = bootstrapBlocks(normalized)

      setReport({ ...body.report, templateDefinition: nextTemplate })
      setBaseReport(body.baseReport ?? null)
      setTemplate(nextTemplate)
      markTemplateSaved(nextTemplate)
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
      const response = await fetch(`/api/admin/assessments/${assessmentId}/reports/${variantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetOverrides: true }),
      })
      const body = (await response.json().catch(() => null)) as LoadPayload | null

      if (!response.ok || !body?.ok || !body.report) {
        setError('Failed to reset report overrides.')
        return
      }

      const normalized = ensureTemplateHasComposition(normalizeReportTemplate(body.report.templateDefinition))
      const nextTemplate = bootstrapBlocks(normalized)
      const nextReport = { ...body.report, templateDefinition: nextTemplate }
      const nextSetupDraft = {
        name: nextReport.name,
        audienceRole: nextReport.audienceRole,
        status: nextReport.status,
        isDefault: nextReport.isDefault,
      }

      setReport(nextReport)
      setBaseReport(body.baseReport ?? null)
      setTemplate(nextTemplate)
      setSetupDraft(nextSetupDraft)
      markSetupSaved(nextSetupDraft)
      markTemplateSaved(nextTemplate)
      const savedTimestamp = new Date().toLocaleTimeString()
      setSetupSavedAt(savedTimestamp)
      setTemplateSavedAt(savedTimestamp)
      setBrandingError(null)
      setBrandingNotice('Report overrides reset.')
    } catch {
      setError('Failed to reset report overrides.')
    } finally {
      setResettingOverrides(false)
    }
  }

  const updateRawBlocks = (
    updater: (blocks: ReportBlockDefinition[]) => ReportBlockDefinition[]
  ) => {
    setTemplate((current) => {
      if (!current) return current

      const normalized = ensureTemplateHasComposition(current)
      const nextBlocks = updater(normalized.blocks)

      return ensureTemplateHasComposition({
        ...normalized,
        blocks: nextBlocks,
        composition: inferReportCompositionFromBlocks(nextBlocks),
      })
    })
  }

  const addPresetBlock = (kind: ReportSectionKind) => {
    const section = createComposerSectionPreset(kind)
    const block = compileReportBlocksFromComposition({ version: 1, sections: [section] })[0]
    if (block) {
      updateRawBlocks((blocks) => [...blocks, block])
    }
  }

  const addRawBlockWith = (source: BlockDataSource, format?: BlockDisplayFormat) => {
    const resolvedFormat = format ?? RAW_FORMAT_OPTIONS[source]?.[0]?.value ?? 'rich_text'
    updateRawBlocks((blocks) => {
      const nextBlock = createDefaultRawBlock(source, resolvedFormat)
      if (source === 'report_header') {
        if (blocks.some((block) => block.source === 'report_header')) return blocks
        return [nextBlock, ...blocks]
      }
      return [...blocks, nextBlock]
    })
  }

  const addRawBlock = () => addRawBlockWith(addRawSource, addRawFormat)

  const updateRawBlock = (blockId: string, patch: Partial<ReportBlockDefinition>) => {
    updateRawBlocks((blocks) =>
      blocks.map((block) => (block.id === blockId ? { ...block, ...patch } : block))
    )
  }

  const updateRawBlockData = (blockId: string, patch: Partial<BlockDataConfig>) => {
    updateRawBlocks((blocks) =>
      blocks.map((block) => (block.id === blockId ? {
        ...block,
        data: { ...block.data, ...patch },
      } : block))
    )
  }

  const updateRawBlockLink = (blockId: string, patch: Partial<BlockLinkConfig>) => {
    updateRawBlocks((blocks) =>
      blocks.map((block) => (block.id === blockId ? {
        ...block,
        link: { ...block.link, ...patch },
      } : block))
    )
  }

  const updateTemplateBranding = (patch: Partial<ReportBrandingConfig>) => {
    setTemplate((current) => current === null ? null : {
      ...current,
      global: {
        ...current.global,
        branding: {
          ...normalizeBrandingConfig(current.global.branding),
          ...patch,
        },
      },
    })
  }

  const toggleBlockCollapsed = (blockId: string) => {
    setCollapsedBlocks((current) => ({
      ...current,
      [blockId]: !current[blockId],
    }))
  }

  const setAllBlocksCollapsed = (collapsed: boolean) => {
    setCollapsedBlocks(
      Object.fromEntries((template?.blocks ?? []).map((block) => [block.id, collapsed]))
    )
  }

  const moveRawBlockTo = (blockId: string, targetBlockId: string) => {
    if (blockId === targetBlockId) return

    updateRawBlocks((blocks) => {
      const fromIndex = blocks.findIndex((block) => block.id === blockId)
      const toIndex = blocks.findIndex((block) => block.id === targetBlockId)
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return blocks

      const next = [...blocks]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }

  const handleBlockDragStart = (event: DragEvent<HTMLElement>, blockId: string) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', blockId)
    setDraggingBlockId(blockId)
    setDragOverBlockId(blockId)
  }

  const handleBlockDragOver = (event: DragEvent<HTMLElement>, blockId: string) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dragOverBlockId !== blockId) {
      setDragOverBlockId(blockId)
    }
  }

  const handleBlockDrop = (event: DragEvent<HTMLElement>, targetBlockId: string) => {
    event.preventDefault()
    const sourceBlockId = event.dataTransfer.getData('text/plain') || draggingBlockId
    if (sourceBlockId) {
      moveRawBlockTo(sourceBlockId, targetBlockId)
    }
    setDraggingBlockId(null)
    setDragOverBlockId(null)
  }

  const clearBlockDragState = () => {
    setDraggingBlockId(null)
    setDragOverBlockId(null)
  }

  const updateTemplatePresentation = (patch: Partial<ReportPresentationConfig>) => {
    setTemplate((current) => current === null ? null : {
      ...current,
      global: {
        ...current.global,
        presentation: {
          ...normalizePresentationConfig(current.global.presentation),
          ...patch,
        },
      },
    })
  }

  const handleBrandLogoFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) return
    setPendingBrandLogoFile(file)
    setPendingBrandLogoPreview(URL.createObjectURL(file))
    setBrandingError(null)
    setBrandingNotice('Logo selected. Upload it, then save setup to persist the report branding.')
  }

  const handleRemoveBrandLogo = () => {
    setPendingBrandLogoFile(null)
    setPendingBrandLogoPreview(null)
    updateTemplateBranding({ logo_url: '' })
    setBrandingError(null)
    setBrandingNotice('Logo removed from the draft. Save setup to persist the change.')
    if (brandLogoInputRef.current) {
      brandLogoInputRef.current.value = ''
    }
  }

  const uploadBrandLogo = async () => {
    if (!pendingBrandLogoFile) return

    setUploadingBrandLogo(true)
    setBrandingError(null)
    setBrandingNotice(null)

    try {
      const formData = new FormData()
      formData.append('file', pendingBrandLogoFile)

      const response = await fetch(`/api/admin/assessments/${assessmentId}/reports/${variantId}/assets`, {
        method: 'POST',
        body: formData,
      })
      const body = (await response.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null

      if (!response.ok || !body?.ok || !body.url) {
        setBrandingError(body?.error ?? 'Logo upload failed.')
        return
      }

      updateTemplateBranding({ logo_url: body.url })
      setPendingBrandLogoFile(null)
      setPendingBrandLogoPreview(null)
      setBrandingNotice('Logo uploaded to the report draft. Save setup to persist the branding change.')
      if (brandLogoInputRef.current) {
        brandLogoInputRef.current.value = ''
      }
    } catch {
      setBrandingError('Logo upload failed.')
    } finally {
      setUploadingBrandLogo(false)
    }
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
          description="Open a report product to configure overview, blocks, branding, and preview."
          actions={(
            <Link href={`/dashboard/assessments/${assessmentId}/reports`} className="foundation-btn foundation-btn-secondary foundation-btn-sm">
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
                href={`/dashboard/assessments/${assessmentId}/reports`}
                className="foundation-btn foundation-btn-secondary foundation-btn-sm"
              >
                Back to reports
              </Link>
              {canResetToBase ? (
                <FoundationButton type="button" variant="secondary" size="sm" onClick={resetOverrides} disabled={resettingOverrides}>
                  {resettingOverrides ? 'Resetting...' : 'Reset to base'}
                </FoundationButton>
              ) : null}
              {activeTab === 'overview' || activeTab === 'branding' ? (
                <FoundationButton type="button" variant="primary" size="sm" onClick={saveSetup} disabled={savingSetup}>
                  {savingSetup ? 'Saving...' : activeTab === 'branding' ? 'Save branding' : 'Save overview'}
                </FoundationButton>
              ) : (
                <FoundationButton type="button" variant="primary" size="sm" onClick={saveTemplate} disabled={savingTemplate}>
                  {savingTemplate ? 'Saving...' : report.reportKind === 'base' ? 'Save base' : 'Save report'}
                </FoundationButton>
              )}
            </div>
            {hasUnsavedChanges ? <p className="text-xs font-medium text-amber-700">Unsaved changes</p> : null}
            {!hasUnsavedChanges && (activeTab === 'overview' || activeTab === 'branding') && setupSavedAt ? (
              <p className="text-xs text-emerald-700">Saved at {setupSavedAt}</p>
            ) : null}
            {!hasUnsavedChanges && activeTab !== 'overview' && activeTab !== 'branding' && templateSavedAt ? (
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
        <MetricCard label="Audience" value={getReportAudienceRoleLabel(report.audienceRole)} />
        <MetricCard label="Blocks" value={template.blocks.length} />
        <MetricCard
          label="Inheritance"
          value={report.reportKind === 'base' ? 'Source of truth' : inheritsBase ? 'Inheriting base' : 'Customized'}
        />
      </div>

      <FoundationSurface className="p-4">
        <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Report detail sections">
          {([
            ['overview', 'Overview'],
            ['blocks', 'Blocks'],
            ['branding', 'Branding'],
            ['preview', 'Preview'],
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

      {activeTab === 'overview' ? (
        <div className="space-y-4">
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
                        audienceRole: event.target.value as ReportAudienceRole,
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
                        status: event.target.value as AssessmentReportStatus,
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

          <SectionCard
            title="Report identity"
            description="Set the report title and the one-line summary used in the report header block."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-1.5 md:col-span-2">
                <span className="text-xs text-[var(--admin-text-muted)]">Report title</span>
                <input
                  value={template.name}
                  onChange={(event) => setTemplate((current) => current === null ? null : {
                    ...current,
                    name: event.target.value,
                  })}
                  className="foundation-field w-full"
                  placeholder="e.g. AI readiness profile"
                />
              </label>
              <label className="block space-y-1.5 md:col-span-2">
                <span className="text-xs text-[var(--admin-text-muted)]">Report description</span>
                <textarea
                  value={template.description ?? ''}
                  onChange={(event) => setTemplate((current) => current === null ? null : {
                    ...current,
                    description: event.target.value || undefined,
                  })}
                  className="foundation-field min-h-[88px] w-full"
                  placeholder="e.g. A short assessment to profile AI readiness across openness, risk posture, and capability."
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="Workflow"
            description="Use each tab for one concern so the builder stays predictable."
          >
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">Blocks</p>
                <p className="mt-2 text-sm text-[var(--admin-text-primary)]">Add sections, order them, and map each block to report data.</p>
              </div>
              <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">Branding</p>
                <p className="mt-2 text-sm text-[var(--admin-text-primary)]">Switch between inherited branding, LQ branding, or a report-level override.</p>
              </div>
              <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">Preview</p>
                <p className="mt-2 text-sm text-[var(--admin-text-primary)]">Preview against sample submissions or live submissions using the same report pipeline.</p>
              </div>
            </div>
            {report.reportKind === 'audience' ? (
              <div className="mt-4 rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-4 py-3 text-sm text-[var(--admin-text-muted)]">
                {inheritsBase
                  ? 'This audience report is currently inheriting the shared base. Saving block changes here will create a local override.'
                  : 'This audience report already has local composition overrides on top of the shared base.'}
              </div>
            ) : null}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === 'branding' ? (
        <div className="space-y-4">
          <SectionCard
            title="Branding"
            description="Choose whether this report inherits client branding, forces Leadership Quarter styling, or overrides branding directly at the report level."
          >
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs text-[var(--admin-text-muted)]">Brand mode</span>
                  <select
                    value={templateBranding.mode}
                    onChange={(event) => updateTemplateBranding({
                      mode: event.target.value as NonNullable<ReportBrandingConfig['mode']>,
                    })}
                    className="foundation-field w-full"
                  >
                    {BRANDING_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs text-[var(--admin-text-muted)]">Style preset</span>
                  <select
                    value={templatePresentation.style_preset}
                    onChange={(event) => updateTemplatePresentation({
                      style_preset: event.target.value as ReportStylePreset,
                    })}
                    className="foundation-field w-full"
                  >
                    {STYLE_PRESET_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    {STYLE_PRESET_OPTIONS.find((option) => option.value === templatePresentation.style_preset)?.description}
                  </p>
                </label>

                <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">Resolved brand</p>
                  <div className="mt-3 flex items-center gap-3">
                    {previewReportMeta?.orgLogoUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={previewReportMeta.orgLogoUrl}
                        alt={previewReportMeta.orgName ?? 'Organisation'}
                        className="max-h-10 max-w-[160px] object-contain"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--admin-surface)] text-sm font-semibold text-[var(--admin-text-primary)]">
                        LQ
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-[var(--admin-text-primary)]">
                        {previewReportMeta?.orgName ?? 'Leadership Quarter'}
                      </p>
                      <p className="text-xs text-[var(--admin-text-muted)]">
                        {templateBranding.mode === 'inherit_org'
                          ? 'Inherited from the linked organisation when available'
                          : templateBranding.mode === 'force_lq'
                            ? 'Leadership Quarter branding enforced'
                            : 'Using report-level override values'}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span
                      className="h-6 w-6 rounded-full border border-black/10"
                      style={{ backgroundColor: validateHexColor(templateBranding.primary_color ?? '') ? templateBranding.primary_color : '#1B365D' }}
                    />
                    <span
                      className="h-6 w-6 rounded-full border border-black/10"
                      style={{ backgroundColor: validateHexColor(templateBranding.secondary_color ?? '') ? templateBranding.secondary_color : '#5F8FBF' }}
                    />
                    <p className="text-xs text-[var(--admin-text-muted)]">Primary and secondary report accents</p>
                  </div>
                </div>
              </div>

              {templateBranding.mode === 'custom_override' ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--admin-text-muted)]">Custom company name</span>
                    <input
                      value={templateBranding.company_name}
                      onChange={(event) => updateTemplateBranding({ company_name: event.target.value })}
                      className="foundation-field w-full"
                      placeholder="Client display name"
                    />
                  </label>

                  <div className="space-y-2 md:col-span-2">
                    <span className="text-xs text-[var(--admin-text-muted)]">Custom logo</span>
                    <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                      <div className="flex flex-wrap items-center gap-4">
                        {brandingLogoPreview ? (
                          <div className="flex h-16 w-40 items-center justify-center rounded-xl border border-[var(--admin-border)] bg-white p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={brandingLogoPreview} alt="Report branding logo preview" className="max-h-full max-w-full object-contain" />
                          </div>
                        ) : (
                          <div className="flex h-16 w-40 items-center justify-center rounded-xl border border-dashed border-[var(--admin-border)] bg-white">
                            <span className="text-xs text-[var(--admin-text-muted)]">No logo selected</span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <FoundationButton
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => brandLogoInputRef.current?.click()}
                          >
                            {brandingLogoPreview ? 'Replace logo' : 'Choose logo'}
                          </FoundationButton>
                          {pendingBrandLogoFile ? (
                            <FoundationButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={uploadBrandLogo}
                              disabled={uploadingBrandLogo}
                            >
                              {uploadingBrandLogo ? 'Uploading...' : 'Upload logo'}
                            </FoundationButton>
                          ) : null}
                          {brandingLogoPreview ? (
                            <FoundationButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={handleRemoveBrandLogo}
                            >
                              Remove
                            </FoundationButton>
                          ) : null}
                        </div>
                      </div>
                      <input
                        ref={brandLogoInputRef}
                        type="file"
                        accept="image/png,image/svg+xml,image/webp,image/jpeg"
                        className="hidden"
                        onChange={handleBrandLogoFileChange}
                      />
                      <label className="mt-4 block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Or paste a logo URL</span>
                        <input
                          value={templateBranding.logo_url}
                          onChange={(event) => updateTemplateBranding({ logo_url: event.target.value })}
                          className="foundation-field w-full"
                          placeholder="https://client.example/logo.svg"
                        />
                      </label>
                      <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
                        PNG, SVG, WebP, or JPEG up to 2 MB. Uploaded logos update the draft immediately; save branding to persist the report styling.
                      </p>
                    </div>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--admin-text-muted)]">Primary colour</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={validateHexColor(templateBranding.primary_color ?? '') ? templateBranding.primary_color : '#1B365D'}
                        onChange={(event) => updateTemplateBranding({ primary_color: event.target.value })}
                        className="h-10 w-12 cursor-pointer rounded-lg border border-[var(--admin-border)] bg-white p-1"
                      />
                      <input
                        value={templateBranding.primary_color}
                        onChange={(event) => updateTemplateBranding({ primary_color: event.target.value.trim() })}
                        className="foundation-field w-full"
                        placeholder="#1B365D"
                      />
                    </div>
                    {brandingPrimaryInvalid ? (
                      <p className="text-xs text-red-600">Use a valid hex colour like `#1B365D`.</p>
                    ) : null}
                  </label>

                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--admin-text-muted)]">Secondary colour</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={validateHexColor(templateBranding.secondary_color ?? '') ? templateBranding.secondary_color : '#5F8FBF'}
                        onChange={(event) => updateTemplateBranding({ secondary_color: event.target.value })}
                        className="h-10 w-12 cursor-pointer rounded-lg border border-[var(--admin-border)] bg-white p-1"
                      />
                      <input
                        value={templateBranding.secondary_color}
                        onChange={(event) => updateTemplateBranding({ secondary_color: event.target.value.trim() })}
                        className="foundation-field w-full"
                        placeholder="#5F8FBF"
                      />
                    </div>
                    {brandingSecondaryInvalid ? (
                      <p className="text-xs text-red-600">Use a valid hex colour like `#5F8FBF`.</p>
                    ) : null}
                  </label>
                </div>
              ) : null}

              {brandingError ? (
                <p className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{brandingError}</p>
              ) : null}
              {!brandingError && brandingNotice ? (
                <p className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{brandingNotice}</p>
              ) : null}

              {templateBranding.mode !== 'force_lq' ? (
                <label className="flex items-start gap-3 rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4 text-sm text-[var(--admin-text-primary)]">
                  <input
                    type="checkbox"
                    checked={templateBranding.show_lq_attribution !== false}
                    onChange={(event) => updateTemplateBranding({ show_lq_attribution: event.target.checked })}
                  />
                  <span>
                    Show Leadership Quarter attribution when client branding is active
                    <span className="mt-1 block text-xs text-[var(--admin-text-muted)]">
                      Keeps the “Powered by Leadership Quarter” treatment available on branded reports.
                    </span>
                  </span>
                </label>
              ) : null}
            </div>
          </SectionCard>
        </div>
      ) : null}

      {activeTab === 'blocks' ? (
        <div className="space-y-4">
          {report.reportKind === 'audience' ? (
            <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-4 py-3 text-sm text-[var(--admin-text-muted)]">
              {inheritsBase
                ? 'This report is currently inheriting the shared base. Saving changes here will create a local override for this audience.'
                : 'This report already has local composition overrides on top of the shared base.'}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.9fr)]">
            <FoundationSurface className="p-6 lg:sticky lg:top-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Builder toolbar</h2>
                  <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                    Add a section, then work top to bottom through block copy, data mapping, and layout.
                  </p>
                </div>
                <FoundationButton type="button" variant="secondary" size="sm" onClick={() => setActiveTab('preview')}>
                  Open preview
                </FoundationButton>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <BuilderPill label={`${enabledBlockCount} active blocks`} tone="accent" />
                <BuilderPill label={hasHeaderBlock ? 'Header included' : 'Header missing'} tone={hasHeaderBlock ? 'success' : 'warning'} />
                <BuilderPill label={hasCtaBlock ? 'CTA enabled' : 'CTA optional'} tone={hasCtaBlock ? 'success' : 'neutral'} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <FoundationButton type="button" variant="secondary" size="sm" onClick={() => setAllBlocksCollapsed(false)}>
                  Expand all
                </FoundationButton>
                <FoundationButton type="button" variant="secondary" size="sm" onClick={() => setAllBlocksCollapsed(true)}>
                  Collapse all
                </FoundationButton>
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.9fr)]">
                <EditorPanel
                  title="Quick sections"
                  description="Preset sections generate the usual report structure quickly."
                >
                  <div className="flex flex-wrap gap-2">
                    {BLOCK_PRESETS.map((preset) => (
                      <FoundationButton
                        key={preset.kind}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => addPresetBlock(preset.kind)}
                      >
                        {preset.label}
                      </FoundationButton>
                    ))}
                    <FoundationButton type="button" variant="secondary" size="sm" onClick={() => {
                      setAddRawSource('report_header')
                      setAddRawFormat('hero_card')
                      addRawBlockWith('report_header', 'hero_card')
                    }}>
                      Report header
                    </FoundationButton>
                    <FoundationButton type="button" variant="secondary" size="sm" onClick={() => {
                      setAddRawSource('report_cta')
                      setAddRawFormat('rich_text')
                      addRawBlockWith('report_cta', 'rich_text')
                    }}>
                      Call to action
                    </FoundationButton>
                  </div>
                </EditorPanel>

                <EditorPanel
                  title="Custom block"
                  description="Choose any source and layout when you need a more specific section."
                >
                  <div className="grid gap-3">
                    <label className="block space-y-1.5">
                      <span className="text-xs text-[var(--admin-text-muted)]">Source</span>
                      <select
                        value={addRawSource}
                        onChange={(event) => setAddRawSource(event.target.value as BlockDataSource)}
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
                        onChange={(event) => setAddRawFormat(event.target.value as BlockDisplayFormat)}
                        className="foundation-field w-full"
                      >
                        {(RAW_FORMAT_OPTIONS[addRawSource] ?? []).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <FoundationButton type="button" variant="secondary" size="sm" onClick={addRawBlock}>
                      Add block
                    </FoundationButton>
                  </div>
                </EditorPanel>
              </div>
            </FoundationSurface>

            <FoundationSurface className="p-6">
              <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Editing flow</h2>
              <div className="mt-4 space-y-3">
                <div className="rounded-[18px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">1. Identity</p>
                  <p className="mt-2 text-sm text-[var(--admin-text-primary)]">Set the section title, eyebrow, and supporting description.</p>
                </div>
                <div className="rounded-[18px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">2. Data mapping</p>
                  <p className="mt-2 text-sm text-[var(--admin-text-primary)]">Choose which outcome set, content mode, or score slice the block should pull.</p>
                </div>
                <div className="rounded-[18px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">3. Output rules</p>
                  <p className="mt-2 text-sm text-[var(--admin-text-primary)]">Adjust layout, item counts, PDF behavior, and CTA links.</p>
                </div>
              </div>
            </FoundationSurface>
          </div>

          <div className="space-y-3">
            {template.blocks.map((block, index) => {
              const sourceHelp = getBlockSourceHelp(block.source, scoringConfig)
              const selectedDerivedOutcomeSet = derivedOutcomeSets.find((item) => item.key === block.filter?.outcome_set_key) ?? null
              const selectedArchetypeSet = archetypeSets.find((item) => item.key === block.filter?.outcome_set_key) ?? null
              const sourceLabel = getOptionLabel(RAW_SOURCE_OPTIONS, block.source)
              const formatLabel = getOptionLabel(RAW_FORMAT_OPTIONS[block.source] ?? [], block.format)
              const isCollapsed = collapsedBlocks[block.id] ?? false
              const isDragTarget = dragOverBlockId === block.id && draggingBlockId !== block.id
              const isDragging = draggingBlockId === block.id
              const ctaCustomUrlInvalid =
                block.source === 'report_cta'
                && block.link?.mode === 'custom'
                && Boolean(block.link.custom_url?.trim())
                && !isValidCtaUrl(block.link.custom_url ?? '')

              return (
              <motion.div
                key={block.id}
                layout
                transition={{ layout: { type: 'spring', stiffness: 340, damping: 30 } }}
                animate={{
                  opacity: isDragging ? 0.6 : 1,
                  scale: isDragging ? 0.985 : 1,
                  y: isDragTarget ? -4 : 0,
                }}
              >
              <FoundationSurface
                onDragOver={(event) => handleBlockDragOver(event, block.id)}
                onDrop={(event) => handleBlockDrop(event, block.id)}
                onDragEnd={clearBlockDragState}
                className={[
                  'p-5 transition-colors',
                  block.enabled ? '' : 'opacity-60',
                  isDragTarget ? 'ring-2 ring-sky-200 ring-offset-2 ring-offset-white' : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium tabular-nums text-[var(--admin-text-soft)]">Block {index + 1}</span>
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => handleBlockDragStart(event, block.id)}
                        onDragEnd={clearBlockDragState}
                        className="cursor-grab rounded px-2 py-1 text-xs font-medium text-[var(--admin-text-soft)] hover:text-[var(--admin-text-primary)] active:cursor-grabbing"
                        aria-label={`Drag to reorder block ${index + 1}`}
                      >
                        Drag
                      </button>
                      <BuilderPill label={sourceLabel} tone="accent" />
                      <BuilderPill label={formatLabel} />
                      <BuilderPill label={block.enabled ? 'Enabled' : 'Hidden'} tone={block.enabled ? 'success' : 'warning'} />
                    </div>
                    <p className="mt-2 text-sm text-[var(--admin-text-primary)]">
                      {block.content?.title || block.content?.eyebrow || sourceLabel}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={block.source}
                      onChange={(event) => {
                        const nextSource = event.target.value as BlockDataSource
                        const nextFormat = RAW_FORMAT_OPTIONS[nextSource]?.[0]?.value ?? 'rich_text'
                        updateRawBlock(block.id, {
                          source: nextSource,
                          format: nextFormat,
                          content: createDefaultBlockContent(nextSource),
                          data: nextSource === 'report_header'
                            ? {
                                badge_label: 'Assessment report',
                                show_date: true,
                                show_participant: true,
                                show_email: true,
                              }
                            : nextSource === 'derived_outcome' || nextSource === 'archetype_profile'
                              ? {
                                  heading_field: 'label',
                                  summary_field: 'report_summary',
                                  body_field: 'full_narrative',
                                  show_input_evidence: false,
                                }
                              : nextSource === 'layer_profile'
                                ? {
                                    layer: 'competency',
                                    label_mode: 'external',
                                    body_source: 'summary_definition',
                                    show_band: true,
                                    show_low_high_meaning: true,
                                    behaviour_snapshot_mode: 'current_only',
                                    split_items_into_cards: false,
                                    metric_key: 'display',
                                    sort_mode: 'template_order',
                                  }
                              : nextSource === 'recommendations'
                                ? {
                                    content_mode: 'derived_outcome',
                                  }
                                : nextSource === 'report_cta'
                                  ? { badge_label: 'Next step' }
                                  : undefined,
                          link: nextSource === 'report_cta'
                            ? {
                                mode: 'internal',
                                internal_key: 'contact',
                                label: 'Contact us',
                                open_in_new_tab: false,
                              }
                            : undefined,
                        })
                      }}
                      className="foundation-field text-sm"
                    >
                      {RAW_SOURCE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleBlockCollapsed(block.id)}
                      className="rounded px-2 py-1 text-xs font-medium text-[var(--admin-text-soft)] hover:text-[var(--admin-text-primary)]"
                    >
                      {isCollapsed ? 'Expand' : 'Collapse'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRawBlock(block.id, { enabled: !block.enabled })}
                      className={`rounded px-2 py-1 text-xs font-medium ${block.enabled ? 'text-emerald-700 hover:text-emerald-800' : 'text-[var(--admin-text-soft)] hover:text-[var(--admin-text-primary)]'}`}
                    >
                      {block.enabled ? 'On' : 'Off'}
                    </button>
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
                      onClick={() => removeRawBlock(block.id)}
                      className="rounded p-1 text-[var(--admin-text-soft)] hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {isCollapsed ? null : (
                <>
                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.85fr)]">
                  <EditorPanel
                    title="Section copy"
                    description="Title and supporting copy for this section."
                  >
                    <div className="grid gap-4 md:grid-cols-2">
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
                        <span className="text-xs text-[var(--admin-text-muted)]">Eyebrow</span>
                        <input
                          value={block.content?.eyebrow ?? ''}
                          onChange={(event) => updateRawBlock(block.id, {
                            content: { ...block.content, eyebrow: event.target.value || undefined },
                          })}
                          className="foundation-field w-full"
                          placeholder="Small label above the title"
                        />
                      </label>

                      <label className="block space-y-1.5 md:col-span-2">
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
                  </EditorPanel>

                  <EditorPanel
                    title="Block setup"
                    description={sourceHelp.summary}
                  >
                    <div className="grid gap-3">
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Format</span>
                        <select
                          value={block.format}
                          onChange={(event) => updateRawBlock(block.id, { format: event.target.value as BlockDisplayFormat })}
                          className="foundation-field w-full"
                        >
                          {(RAW_FORMAT_OPTIONS[block.source] ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      {LAYOUT_DESCRIPTIONS[block.format] ? (
                        <p className="text-xs leading-5 text-[var(--admin-text-muted)]">
                          {LAYOUT_DESCRIPTIONS[block.format]}
                        </p>
                      ) : null}
                      {sourceHelp.details.length > 0 ? (
                        <p className="text-xs leading-5 text-[var(--admin-text-muted)]">{sourceHelp.details.join(' · ')}</p>
                      ) : null}
                    </div>
                  </EditorPanel>
                </div>

                <EditorPanel
                  title="Data mapping"
                  description="Choose what this block pulls from the submission context and how much of it to show."
                  className="mt-4"
                >
                <div className="grid gap-4 md:grid-cols-2">
                  {block.source === 'report_header' ? (
                    <>
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Badge label</span>
                        <input
                          value={block.data?.badge_label ?? ''}
                          onChange={(event) => updateRawBlockData(block.id, { badge_label: event.target.value || undefined })}
                          className="foundation-field w-full"
                          placeholder="Assessment report"
                        />
                      </label>
                      <div className="grid gap-2">
                        <label className="flex items-center gap-3 text-sm text-[var(--admin-text-primary)]">
                          <input
                            type="checkbox"
                            checked={block.data?.show_date !== false}
                            onChange={(event) => updateRawBlockData(block.id, { show_date: event.target.checked })}
                          />
                          Show completion date
                        </label>
                        <label className="flex items-center gap-3 text-sm text-[var(--admin-text-primary)]">
                          <input
                            type="checkbox"
                            checked={block.data?.show_participant !== false}
                            onChange={(event) => updateRawBlockData(block.id, { show_participant: event.target.checked })}
                          />
                          Show participant row
                        </label>
                        <label className="flex items-center gap-3 text-sm text-[var(--admin-text-primary)]">
                          <input
                            type="checkbox"
                            checked={block.data?.show_email !== false}
                            onChange={(event) => updateRawBlockData(block.id, { show_email: event.target.checked })}
                          />
                          Show email row
                        </label>
                      </div>
                    </>
                  ) : null}

                  {(block.source === 'derived_outcome' || block.source === 'archetype_profile') ? (
                    <>
                      {block.source === 'derived_outcome' && derivedOutcomeSets.length > 0 ? (
                        <label className="block space-y-1.5">
                          <span className="text-xs text-[var(--admin-text-muted)]">Derived outcome set</span>
                          <select
                            value={block.filter?.outcome_set_key ?? ''}
                            onChange={(event) => updateRawBlock(block.id, {
                              filter: { ...block.filter, outcome_set_key: event.target.value || undefined },
                            })}
                            className="foundation-field w-full"
                          >
                            <option value="">Auto: first configured set</option>
                            {derivedOutcomeSets.map((item) => (
                              <option key={item.key} value={item.key}>
                                {item.name || item.key}
                              </option>
                            ))}
                          </select>
                          {selectedDerivedOutcomeSet ? (
                            <p className="text-xs text-[var(--admin-text-muted)]">
                              {selectedDerivedOutcomeSet.level} level · targets {selectedDerivedOutcomeSet.targetKeys.join(', ')}
                            </p>
                          ) : null}
                        </label>
                      ) : null}
                      {block.source === 'derived_outcome' && derivedOutcomeSets.length === 0 ? (
                        <label className="block space-y-1.5">
                          <span className="text-xs text-[var(--admin-text-muted)]">Derived outcome set key</span>
                          <input
                            value={block.filter?.outcome_set_key ?? ''}
                            onChange={(event) => updateRawBlock(block.id, {
                              filter: { ...block.filter, outcome_set_key: event.target.value || undefined },
                            })}
                            className="foundation-field w-full"
                            placeholder="Optional explicit set key"
                          />
                        </label>
                      ) : null}
                      {block.source === 'archetype_profile' && archetypeSets.length > 0 ? (
                        <label className="block space-y-1.5">
                          <span className="text-xs text-[var(--admin-text-muted)]">Archetype set</span>
                          <select
                            value={block.filter?.outcome_set_key ?? ''}
                            onChange={(event) => updateRawBlock(block.id, {
                              filter: { ...block.filter, outcome_set_key: event.target.value || undefined },
                            })}
                            className="foundation-field w-full"
                          >
                            <option value="">Auto: first configured set</option>
                            {archetypeSets.map((item) => (
                              <option key={item.key} value={item.key}>
                                {item.name || item.key}
                              </option>
                            ))}
                          </select>
                          {selectedArchetypeSet ? (
                            <p className="text-xs text-[var(--admin-text-muted)]">
                              {selectedArchetypeSet.level} level · targets {selectedArchetypeSet.targetKeys.join(', ')}
                            </p>
                          ) : null}
                        </label>
                      ) : null}
                      {block.source === 'archetype_profile' && archetypeSets.length === 0 ? (
                        <label className="block space-y-1.5">
                          <span className="text-xs text-[var(--admin-text-muted)]">Archetype set key</span>
                          <input
                            value={block.filter?.outcome_set_key ?? ''}
                            onChange={(event) => updateRawBlock(block.id, {
                              filter: { ...block.filter, outcome_set_key: event.target.value || undefined },
                            })}
                            className="foundation-field w-full"
                            placeholder="Optional explicit set key"
                          />
                        </label>
                      ) : null}
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Heading field</span>
                        <select
                          value={block.data?.heading_field ?? 'label'}
                          onChange={(event) => updateRawBlockData(block.id, { heading_field: event.target.value as BlockDataConfig['heading_field'] })}
                          className="foundation-field w-full"
                        >
                          {NARRATIVE_FIELD_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Summary field</span>
                        <select
                          value={block.data?.summary_field ?? 'report_summary'}
                          onChange={(event) => updateRawBlockData(block.id, { summary_field: event.target.value as BlockDataConfig['summary_field'] })}
                          className="foundation-field w-full"
                        >
                          {BODY_FIELD_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Body field</span>
                        <select
                          value={block.data?.body_field ?? 'full_narrative'}
                          onChange={(event) => updateRawBlockData(block.id, { body_field: event.target.value as BlockDataConfig['body_field'] })}
                          className="foundation-field w-full"
                        >
                          {BODY_FIELD_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label className="flex items-center gap-3 text-sm text-[var(--admin-text-primary)] md:col-span-2">
                        <input
                          type="checkbox"
                          checked={block.data?.show_input_evidence === true}
                          onChange={(event) => updateRawBlockData(block.id, { show_input_evidence: event.target.checked })}
                        />
                        Show matched input evidence cards
                      </label>
                    </>
                  ) : null}

                  {block.source === 'layer_profile' ? (
                    <>
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Layer</span>
                        <select
                          value={block.data?.layer ?? 'competency'}
                          onChange={(event) => updateRawBlockData(block.id, { layer: event.target.value as BlockDataConfig['layer'] })}
                          className="foundation-field w-full"
                        >
                          {PROFILE_LAYER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Label source</span>
                        <select
                          value={block.data?.label_mode ?? 'external'}
                          onChange={(event) => updateRawBlockData(block.id, { label_mode: event.target.value as BlockDataConfig['label_mode'] })}
                          className="foundation-field w-full"
                        >
                          {PROFILE_LABEL_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Body content</span>
                        <select
                          value={block.data?.body_source ?? 'summary_definition'}
                          onChange={(event) => updateRawBlockData(block.id, { body_source: event.target.value as BlockDataConfig['body_source'] })}
                          className="foundation-field w-full"
                        >
                          {PROFILE_BODY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Score metric</span>
                        <select
                          value={block.data?.metric_key ?? 'display'}
                          onChange={(event) => updateRawBlockData(block.id, { metric_key: event.target.value as BlockDataConfig['metric_key'] })}
                          className="foundation-field w-full"
                        >
                          {PROFILE_METRIC_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Display score max</span>
                        <input
                          type="number"
                          min={1}
                          value={block.data?.metric_scale_max ?? ''}
                          onChange={(event) => updateRawBlockData(block.id, { metric_scale_max: event.target.value ? Number(event.target.value) : undefined })}
                          className="foundation-field w-full"
                          placeholder="Optional e.g. 100"
                        />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Behaviour text</span>
                        <select
                          value={block.data?.behaviour_snapshot_mode ?? 'current_only'}
                          onChange={(event) => updateRawBlockData(block.id, {
                            behaviour_snapshot_mode: event.target.value as BlockDataConfig['behaviour_snapshot_mode'],
                            show_behaviour_snapshot: event.target.value !== 'none',
                          })}
                          className="foundation-field w-full"
                        >
                          {PROFILE_BEHAVIOUR_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Sort items</span>
                        <select
                          value={block.data?.sort_mode ?? 'template_order'}
                          onChange={(event) => updateRawBlockData(block.id, { sort_mode: event.target.value as BlockDataConfig['sort_mode'] })}
                          className="foundation-field w-full"
                        >
                          {PROFILE_SORT_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>

                      <label className="flex items-center gap-3 text-sm text-[var(--admin-text-primary)]">
                        <input
                          type="checkbox"
                          checked={block.score?.show_score !== false}
                          onChange={(event) => updateRawBlock(block.id, {
                            score: { ...block.score, show_score: event.target.checked },
                          })}
                        />
                        Show numeric score
                      </label>

                      <label className="flex items-center gap-3 text-sm text-[var(--admin-text-primary)]">
                        <input
                          type="checkbox"
                          checked={block.data?.show_band !== false}
                          onChange={(event) => updateRawBlockData(block.id, { show_band: event.target.checked })}
                        />
                        Show band label
                      </label>

                      <label className="flex items-center gap-3 text-sm text-[var(--admin-text-primary)]">
                        <input
                          type="checkbox"
                          checked={block.data?.show_low_high_meaning === true}
                          onChange={(event) => updateRawBlockData(block.id, { show_low_high_meaning: event.target.checked })}
                        />
                        Show low / high score meaning
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Columns</span>
                        <select
                          value={block.style?.columns ?? 2}
                          onChange={(event) => updateRawBlock(block.id, {
                            style: { ...block.style, columns: (Number(event.target.value) || undefined) as 1 | 2 | 3 | undefined },
                          })}
                          className="foundation-field w-full"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </label>

                      <label className="flex items-center gap-3 text-sm text-[var(--admin-text-primary)]">
                        <input
                          type="checkbox"
                          checked={block.data?.split_items_into_cards === true}
                          onChange={(event) => updateRawBlockData(block.id, {
                            split_items_into_cards: event.target.checked,
                          })}
                        />
                        Split each item into its own card
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Max items</span>
                        <input
                          type="number"
                          min={1}
                          value={block.filter?.max_items ?? ''}
                          onChange={(event) => updateRawBlock(block.id, {
                            filter: { ...block.filter, max_items: event.target.value ? Number(event.target.value) : undefined },
                          })}
                          className="foundation-field w-full"
                        />
                      </label>
                    </>
                  ) : null}

                  {(block.source === 'dimension_scores' || block.source === 'competency_scores' || block.source === 'trait_scores') ? (
                    <>
                      <label className="flex items-center gap-3 text-sm text-[var(--admin-text-primary)]">
                        <input
                          type="checkbox"
                          checked={block.score?.show_score !== false}
                          onChange={(event) => updateRawBlock(block.id, {
                            score: { ...block.score, show_score: event.target.checked },
                          })}
                        />
                        Show numeric score
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Columns</span>
                        <select
                          value={block.style?.columns ?? 2}
                          onChange={(event) => updateRawBlock(block.id, {
                            style: { ...block.style, columns: (Number(event.target.value) || undefined) as 1 | 2 | 3 | undefined },
                          })}
                          className="foundation-field w-full"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Max items</span>
                        <input
                          type="number"
                          min={1}
                          value={block.filter?.max_items ?? ''}
                          onChange={(event) => updateRawBlock(block.id, {
                            filter: { ...block.filter, max_items: event.target.value ? Number(event.target.value) : undefined },
                          })}
                          className="foundation-field w-full"
                        />
                      </label>
                    </>
                  ) : null}

                  {block.source === 'recommendations' ? (
                    <>
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Content source</span>
                        <select
                          value={block.data?.content_mode ?? 'derived_outcome'}
                          onChange={(event) => {
                            const contentMode = event.target.value as BlockDataConfig['content_mode']
                            updateRawBlockData(block.id, { content_mode: contentMode })
                            updateRawBlock(block.id, {
                              filter: {
                                ...block.filter,
                                use_derived_narrative: contentMode === 'derived_outcome',
                              },
                            })
                          }}
                          className="foundation-field w-full"
                        >
                          <option value="report">Report recommendations</option>
                          <option value="derived_outcome">Derived outcome content</option>
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Max items</span>
                        <input
                          type="number"
                          min={1}
                          value={block.filter?.max_items ?? ''}
                          onChange={(event) => updateRawBlock(block.id, {
                            filter: { ...block.filter, max_items: event.target.value ? Number(event.target.value) : undefined },
                          })}
                          className="foundation-field w-full"
                        />
                      </label>
                    </>
                  ) : null}

                  {block.source === 'static_content' ? (
                    <label className="block space-y-1.5 md:col-span-2">
                      <span className="text-xs text-[var(--admin-text-muted)]">Body markdown</span>
                      <textarea
                        value={block.content?.body_markdown ?? ''}
                        onChange={(event) => updateRawBlock(block.id, {
                          content: { ...block.content, body_markdown: event.target.value || undefined },
                        })}
                        className="foundation-field min-h-[160px] w-full"
                      />
                    </label>
                  ) : null}

                  {block.source === 'report_cta' ? (
                    <>
                      <label className="block space-y-1.5 md:col-span-2">
                        <span className="text-xs text-[var(--admin-text-muted)]">Body copy</span>
                        <textarea
                          value={block.content?.body_markdown ?? ''}
                          onChange={(event) => updateRawBlock(block.id, {
                            content: { ...block.content, body_markdown: event.target.value || undefined },
                          })}
                          className="foundation-field min-h-[120px] w-full"
                        />
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Link type</span>
                        <select
                          value={block.link?.mode ?? 'internal'}
                          onChange={(event) => updateRawBlockLink(block.id, { mode: event.target.value as BlockLinkConfig['mode'] })}
                          className="foundation-field w-full"
                        >
                          <option value="internal">Internal destination</option>
                          <option value="custom">Custom URL</option>
                        </select>
                      </label>

                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Button label</span>
                        <input
                          value={block.link?.label ?? ''}
                          onChange={(event) => updateRawBlockLink(block.id, { label: event.target.value || undefined })}
                          className="foundation-field w-full"
                          placeholder="Contact us"
                        />
                      </label>

                      {block.link?.mode !== 'custom' ? (
                        <label className="block space-y-1.5 md:col-span-2">
                          <span className="text-xs text-[var(--admin-text-muted)]">Internal destination</span>
                          <select
                            value={block.link?.internal_key ?? 'contact'}
                            onChange={(event) => updateRawBlockLink(block.id, { internal_key: event.target.value as CtaInternalDestinationKey })}
                            className="foundation-field w-full"
                          >
                            {CTA_DESTINATION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <label className="block space-y-1.5 md:col-span-2">
                          <span className="text-xs text-[var(--admin-text-muted)]">Custom URL</span>
                          <input
                            value={block.link?.custom_url ?? ''}
                            onChange={(event) => updateRawBlockLink(block.id, { custom_url: event.target.value || undefined })}
                            className="foundation-field w-full"
                            placeholder="https://example.com or /contact"
                          />
                          {ctaCustomUrlInvalid ? (
                            <p className="text-xs text-red-600">Use an absolute `https://` URL or a site path starting with `/`.</p>
                          ) : null}
                        </label>
                      )}

                      <label className="flex items-center gap-3 text-sm text-[var(--admin-text-primary)] md:col-span-2">
                        <input
                          type="checkbox"
                          checked={block.link?.open_in_new_tab === true}
                          onChange={(event) => updateRawBlockLink(block.id, { open_in_new_tab: event.target.checked })}
                        />
                        Open in a new tab
                      </label>
                    </>
                  ) : null}
                </div>
                </EditorPanel>

                <EditorPanel
                  title="Output rules"
                  description="Control how this block behaves in the final report and PDF."
                  className="mt-4"
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)]">
                      <input
                        type="checkbox"
                        checked={block.style?.pdf_break_before === true}
                        onChange={(event) => updateRawBlock(block.id, {
                          style: { ...block.style, pdf_break_before: event.target.checked || undefined },
                        })}
                      />
                      Page break before
                    </label>
                    <label className="flex items-center gap-2 text-xs text-[var(--admin-text-muted)]">
                      <input
                        type="checkbox"
                        checked={block.style?.pdf_hidden === true}
                        onChange={(event) => updateRawBlock(block.id, {
                          style: { ...block.style, pdf_hidden: event.target.checked || undefined },
                        })}
                      />
                      Hide in PDF
                    </label>
                  </div>
                </EditorPanel>
                </>
                )}
              </FoundationSurface>
              </motion.div>
            )})}
          </div>
        </div>
      ) : null}

      {activeTab === 'preview' ? (
        <div className="space-y-4">
          <SectionCard
            title="Preview"
            description="Preview this report against builder-only sample submissions or live submissions. Both modes use the same submission report pipeline while rendering your current local template."
          >
            <div className="flex flex-wrap gap-2">
              <FoundationButton
                type="button"
                variant={previewMode === 'sample' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPreviewMode('sample')}
              >
                Sample submissions
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

            <div className="mt-4 space-y-3">
              <div className="flex gap-2">
                <input
                  value={activePreviewQuery}
                  onChange={(event) => {
                    if (previewMode === 'sample') {
                      setSamplePreviewQuery(event.target.value)
                    } else {
                      setLivePreviewQuery(event.target.value)
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void loadPreviewSubmissions(previewMode, activePreviewQuery)
                    }
                  }}
                  placeholder={
                    previewMode === 'sample'
                      ? 'Search builder samples by name, email, or organisation'
                      : 'Search live submissions by name, email, or organisation'
                  }
                  className="foundation-field w-full"
                />
                <FoundationButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => void loadPreviewSubmissions(previewMode, activePreviewQuery)}
                >
                  Search
                </FoundationButton>
              </div>

              <div className="rounded-[18px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-4 py-3 text-sm text-[var(--admin-text-muted)]">
                {previewMode === 'sample'
                  ? 'Sample submissions are stored as real assessment_submissions rows, excluded from analytics, and hidden from the normal response workspace.'
                  : 'Live submissions use the same preview pipeline but exclude builder-only sample rows.'}
              </div>

              {previewNotice ? (
                <p className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {previewNotice}
                </p>
              ) : null}

              {visiblePreviewSubmissions.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-alt)] text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--admin-text-soft)]">
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Organisation</th>
                        <th className="px-3 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePreviewSubmissions.map((submission) => (
                        <tr
                          key={submission.id}
                          onClick={() => {
                            if (previewMode === 'sample') {
                              setSelectedSampleSubmissionId(submission.id)
                            } else {
                              setSelectedLiveSubmissionId(submission.id)
                            }
                          }}
                          className={`cursor-pointer border-b border-[var(--admin-border)] last:border-b-0 ${
                            selectedPreviewSubmissionId === submission.id
                              ? 'bg-sky-50 text-sky-900'
                              : 'hover:bg-[var(--admin-surface-alt)]'
                          }`}
                        >
                          <td className="px-3 py-2 font-medium">
                            {submission.participantName}
                            {previewMode === 'sample' && submission.previewSampleKey ? (
                              <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
                                {submission.previewSampleKey}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-[var(--admin-text-muted)]">{submission.email ?? '-'}</td>
                          <td className="px-3 py-2 text-[var(--admin-text-muted)]">{submission.organisation ?? '-'}</td>
                          <td className="px-3 py-2 text-[var(--admin-text-muted)]">{formatSubmittedAt(submission.submittedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-[var(--admin-text-muted)]">
                  {previewMode === 'sample'
                    ? 'No builder sample submissions are available for this assessment yet.'
                    : 'Search by name, email, or organisation to find live submissions.'}
                </p>
              )}
            </div>
          </SectionCard>

          {selectedPreviewSubmission ? (
            <FoundationSurface className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--admin-text-soft)]">
                    {previewMode === 'sample' ? 'Selected sample submission' : 'Selected live submission'}
                  </p>
                  <p className="mt-2 text-base font-semibold text-[var(--admin-text-primary)]">
                    {previewParticipantName || selectedPreviewSubmission.participantName}
                  </p>
                  <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
                    {[selectedPreviewSubmission.organisation, selectedPreviewSubmission.role].filter(Boolean).join(' · ') || 'No organisation or role stored'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedPreviewSubmission.email ? (
                    <BuilderPill label={selectedPreviewSubmission.email} />
                  ) : null}
                  <BuilderPill label={formatSubmittedAt(selectedPreviewSubmission.submittedAt)} tone="accent" />
                  {previewMode === 'sample' && selectedPreviewSubmission.previewSampleKey ? (
                    <BuilderPill label={selectedPreviewSubmission.previewSampleKey} tone="success" />
                  ) : null}
                  {previewContext ? (
                    <>
                      <BuilderPill label={`${previewResolutionSummary.rendered}/${previewResolutionSummary.enabled} rendered`} tone="accent" />
                      {previewResolutionSummary.unresolved > 0 ? (
                        <BuilderPill label={`${previewResolutionSummary.unresolved} unresolved`} tone="warning" />
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </FoundationSurface>
          ) : null}

          <FoundationSurface className="assessment-report-preview-shell overflow-hidden p-0">
            {!selectedPreviewSubmission ? (
              <div className="p-6">
                <p className="text-sm text-slate-500">
                  {previewMode === 'sample'
                    ? 'Choose a sample submission to preview this report.'
                    : 'Choose a live submission to preview this report.'}
                </p>
              </div>
            ) : previewLoading ? (
              <div className="p-6">
                <p className="text-sm text-slate-500">Loading preview data...</p>
              </div>
            ) : previewContext ? (
              <div className="site-theme-v1 assessment-report-preview-shell assessment-report-surface bg-[var(--site-bg)] text-[var(--site-text-primary)]">
                {previewReportMeta?.brandingCssOverrides ? (
                  <style dangerouslySetInnerHTML={{ __html: `.site-theme-v1 { ${previewReportMeta.brandingCssOverrides} }` }} />
                ) : null}
                <div className="site-report-page mx-auto max-w-5xl px-6 py-10 md:px-8">
                  <AssessmentBlockReportView
                    template={template}
                    context={previewContext}
                    displayMode="builder"
                  />
                </div>
              </div>
            ) : (
              <div className="p-6">
                <p className="text-sm text-slate-500">{previewNotice ?? 'Preview data is not available yet.'}</p>
              </div>
            )}
          </FoundationSurface>
        </div>
      ) : null}
    </DashboardPageShell>
  )
}
