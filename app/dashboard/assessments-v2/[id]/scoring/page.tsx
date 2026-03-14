'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useUnsavedChanges } from '@/components/dashboard/hooks/use-unsaved-changes'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { FoundationButton } from '@/components/ui/foundation/button'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import {
  createEmptyV2QuestionBank,
  normalizeV2QuestionBank,
  type V2QuestionBank,
} from '@/utils/assessments/v2-question-bank'
import {
  analyzeDerivedOutcomeCoverage,
  createEmptyV2ScoringConfig,
  deleteDerivedOutcomeSet,
  getBandingConfig,
  getDerivedOutcomeSet,
  getInterpretationContent,
  getRollupWeight,
  MAX_V2_DERIVED_OUTCOME_TARGETS,
  normalizeV2ScoringConfig,
  upsertDerivedOutcomeSet,
  setRollupWeight,
  setTraitScoringMethod,
  upsertBandingConfig,
  type V2BandDefinition,
  type V2DerivedOutcome,
  type V2DerivedOutcomeMapping,
  type V2DerivedOutcomeSet,
  type V2ScoringConfig,
  type V2ScoringLevel,
  type V2ScoreMethod,
} from '@/utils/assessments/v2-scoring'

type ScoreTabKey = 'calculation' | 'rollups' | 'transforms' | 'bands' | 'outcomes'

type SectionCardProps = {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}

type EntityOption = {
  key: string
  label: string
}

function SectionCard({ title, description, children, footer }: SectionCardProps) {
  return (
    <FoundationSurface className="p-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
        <div>
          <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{description}</p>
        </div>
        {footer ? <div className="shrink-0">{footer}</div> : null}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
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

function getEntityOptions(bank: V2QuestionBank, level: V2ScoringLevel): EntityOption[] {
  if (level === 'dimension') {
    return bank.dimensions.map((item) => ({ key: item.key, label: item.internalName || item.key }))
  }

  if (level === 'competency') {
    return bank.competencies.map((item) => ({ key: item.key, label: item.internalName || item.key }))
  }

  return bank.traits.map((item) => ({ key: item.key, label: item.internalName || item.key }))
}

function getDefaultTargetKey(options: EntityOption[]) {
  return options[0]?.key ?? ''
}

function getDefaultOutcomeSet(level: V2ScoringLevel, targetKeys: string[]): V2DerivedOutcomeSet {
  return {
    id: crypto.randomUUID(),
    key: `derived_outcome_${Date.now()}`,
    name: 'Derived outcome set',
    description: '',
    level,
    targetKeys,
    outcomes: [],
    mappings: [],
  }
}

function getDefaultOutcome(): V2DerivedOutcome {
  return {
    id: crypto.randomUUID(),
    key: `outcome_${Date.now()}`,
    label: 'New outcome',
    shortDescription: '',
    reportSummary: '',
    fullNarrative: '',
    recommendations: [],
    sortOrder: 0,
  }
}

function getDefaultMapping(targetKeys: string[], outcomeKey = ''): V2DerivedOutcomeMapping {
  return {
    id: crypto.randomUUID(),
    combination: Object.fromEntries(targetKeys.map((targetKey) => [targetKey, '*'])),
    outcomeKey,
    rationale: '',
  }
}

function makeBand(): V2BandDefinition {
  return {
    id: crypto.randomUUID(),
    label: '',
    min: 0,
    max: 0,
    color: '#D0D8E8',
    meaning: '',
    behaviouralIndicators: '',
    strengths: '',
    watchouts: '',
    developmentFocus: '',
    narrativeText: '',
  }
}

function roundBandValue(value: number) {
  return Number(value.toFixed(2))
}

function createStarterBands(
  min: number,
  max: number,
  legacy?: ReturnType<typeof getInterpretationContent>
): V2BandDefinition[] {
  const safeMin = Number.isFinite(min) ? min : 1
  const safeMax = Number.isFinite(max) ? max : Math.max(safeMin, 5)
  const span = safeMax - safeMin
  const step = span / 3
  const lowMax = roundBandValue(safeMin + step)
  const midMax = roundBandValue(safeMin + step * 2)

  return [
    {
      ...makeBand(),
      label: 'Low',
      min: roundBandValue(safeMin),
      max: lowMax,
      color: '#C9D5EA',
      meaning: legacy?.lowMeaning ?? '',
      behaviouralIndicators: legacy?.behaviouralIndicators ?? '',
      strengths: '',
      watchouts: legacy?.risksWatchouts ?? '',
      developmentFocus: legacy?.developmentFocus ?? '',
      narrativeText: legacy?.narrativeText ?? '',
    },
    {
      ...makeBand(),
      label: 'Mid',
      min: roundBandValue(lowMax),
      max: midMax,
      color: '#E8DFC6',
      meaning: legacy?.midMeaning ?? '',
      behaviouralIndicators: '',
      strengths: legacy?.strengths ?? '',
      watchouts: '',
      developmentFocus: '',
      narrativeText: '',
    },
    {
      ...makeBand(),
      label: 'High',
      min: roundBandValue(midMax),
      max: roundBandValue(safeMax),
      color: '#CFE5D2',
      meaning: legacy?.highMeaning ?? '',
      behaviouralIndicators: '',
      strengths: legacy?.strengths ?? '',
      watchouts: legacy?.risksWatchouts ?? '',
      developmentFocus: legacy?.developmentFocus ?? '',
      narrativeText: legacy?.narrativeText ?? '',
    },
  ]
}

export default function AssessmentV2ScoringPage() {
  const params = useParams<{ id: string }>()
  const assessmentId = params.id

  const [questionBank, setQuestionBank] = useState<V2QuestionBank>(createEmptyV2QuestionBank())
  const [scoringConfig, setScoringConfig] = useState<V2ScoringConfig>(createEmptyV2ScoringConfig())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ScoreTabKey>('calculation')
  const [meaningLevel, setMeaningLevel] = useState<V2ScoringLevel>('trait')
  const [meaningTargetKey, setMeaningTargetKey] = useState('')
  const [selectedBandId, setSelectedBandId] = useState('')
  const [selectedOutcomeSetKey, setSelectedOutcomeSetKey] = useState('')
  const { isDirty, markSaved } = useUnsavedChanges(scoringConfig)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const [questionsResponse, scoringResponse] = await Promise.all([
          fetch(`/api/admin/assessments/${assessmentId}/v2/questions`, { cache: 'no-store' }),
          fetch(`/api/admin/assessments/${assessmentId}/v2/scoring`, { cache: 'no-store' }),
        ])

        const [questionsBody, scoringBody] = await Promise.all([
          questionsResponse.json().catch(() => null) as Promise<{ questionBank?: unknown } | null>,
          scoringResponse.json().catch(() => null) as Promise<{ scoringConfig?: unknown } | null>,
        ])

        if (!active) return

        if (!questionsResponse.ok || !scoringResponse.ok) {
          setError('Failed to load the scoring workspace.')
          return
        }

        setQuestionBank(normalizeV2QuestionBank(questionsBody?.questionBank))
        const normalizedScoring = normalizeV2ScoringConfig(scoringBody?.scoringConfig)
        setScoringConfig(normalizedScoring)
        markSaved(normalizedScoring)
        setSavedAt(null)
      } catch {
        if (active) setError('Failed to load the scoring workspace.')
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [assessmentId, markSaved])

  const meaningOptions = useMemo(() => getEntityOptions(questionBank, meaningLevel), [questionBank, meaningLevel])
  useEffect(() => {
    if (!meaningOptions.some((item) => item.key === meaningTargetKey)) {
      setMeaningTargetKey(getDefaultTargetKey(meaningOptions))
    }
  }, [meaningOptions, meaningTargetKey])

  useEffect(() => {
    if (!scoringConfig.derivedOutcomes.some((item) => item.key === selectedOutcomeSetKey)) {
      setSelectedOutcomeSetKey(scoringConfig.derivedOutcomes[0]?.key ?? '')
    }
  }, [scoringConfig.derivedOutcomes, selectedOutcomeSetKey])

  const traitSummaries = useMemo(() => {
    return questionBank.traits.map((trait) => {
      const items = questionBank.scoredItems.filter((item) => item.traitKey === trait.key)
      const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
      return {
        trait,
        itemCount: items.length,
        totalWeight,
      }
    })
  }, [questionBank])

  const selectedOutcomeSet = selectedOutcomeSetKey
    ? getDerivedOutcomeSet(scoringConfig, selectedOutcomeSetKey)
    : scoringConfig.derivedOutcomes[0] ?? null
  const outcomeTargetOptions = useMemo(
    () => getEntityOptions(questionBank, selectedOutcomeSet?.level ?? 'dimension'),
    [questionBank, selectedOutcomeSet?.level]
  )
  const outcomeCoverage = useMemo(
    () => (selectedOutcomeSet ? analyzeDerivedOutcomeCoverage(scoringConfig, selectedOutcomeSet) : null),
    [scoringConfig, selectedOutcomeSet]
  )

  const scoringTabs = [
    { key: 'calculation' as const, label: 'Calculation' },
    { key: 'rollups' as const, label: 'Rollups' },
    { key: 'transforms' as const, label: 'Norms & transforms' },
    { key: 'bands' as const, label: 'Bands & meanings' },
    { key: 'outcomes' as const, label: 'Derived outcomes' },
  ]

  function setConfig(updater: (current: V2ScoringConfig) => V2ScoringConfig) {
    setScoringConfig((current) => normalizeV2ScoringConfig(updater(current)))
    setMessage(null)
    setError(null)
  }

  function updateNormGroup(id: string, patch: Partial<V2ScoringConfig['transforms']['normGroups'][number]>) {
    setConfig((current) => ({
      ...current,
      transforms: {
        ...current.transforms,
        normGroups: current.transforms.normGroups.map((group) => (group.id === id ? { ...group, ...patch } : group)),
      },
    }))
  }

  function addNormGroup() {
    setConfig((current) => ({
      ...current,
      transforms: {
        ...current.transforms,
        normGroups: [
          ...current.transforms.normGroups,
          {
            id: crypto.randomUUID(),
            key: `norm_group_${current.transforms.normGroups.length + 1}`,
            name: '',
            description: '',
            sampleDescription: '',
          },
        ],
      },
    }))
  }

  function deleteNormGroup(id: string) {
    setConfig((current) => ({
      ...current,
      transforms: {
        ...current.transforms,
        defaultNormGroupId: current.transforms.defaultNormGroupId === id ? null : current.transforms.defaultNormGroupId,
        normGroups: current.transforms.normGroups.filter((group) => group.id !== id),
      },
    }))
  }

  function updateBanding(bands: V2BandDefinition[]) {
    if (!meaningTargetKey) return

    setConfig((current) => upsertBandingConfig(current, {
      level: meaningLevel,
      targetKey: meaningTargetKey,
      bands,
    }))
  }

  function createMeaningStarterBands() {
    if (!meaningTargetKey) return

    const legacy = getInterpretationContent(scoringConfig, meaningLevel, meaningTargetKey)
    const starterBands = createStarterBands(
      scoringConfig.transforms.displayRangeMin,
      scoringConfig.transforms.displayRangeMax,
      legacy
    )
    updateBanding(starterBands)
    setSelectedBandId(starterBands[0]?.id ?? '')
  }

  function updateSelectedBand(patch: Partial<V2BandDefinition>) {
    if (!selectedBandId || !meaningTargetKey) return

    const currentBanding = getBandingConfig(scoringConfig, meaningLevel, meaningTargetKey)
    const nextBands = currentBanding.bands.map((band) => (band.id === selectedBandId ? { ...band, ...patch } : band))
    updateBanding(nextBands)
  }

  function updateOutcomeSet(patch: Partial<V2DerivedOutcomeSet>) {
    if (!selectedOutcomeSet) return
    setConfig((current) => upsertDerivedOutcomeSet(current, {
      ...selectedOutcomeSet,
      ...patch,
    }))
  }

  function addOutcomeSet() {
    const defaultLevel: V2ScoringLevel =
      questionBank.dimensions.length > 0 ? 'dimension' : questionBank.competencies.length > 0 ? 'competency' : 'trait'
    const targetKeys = getEntityOptions(questionBank, defaultLevel).slice(0, 3).map((item) => item.key)
    const nextSet = getDefaultOutcomeSet(defaultLevel, targetKeys)
    setConfig((current) => upsertDerivedOutcomeSet(current, nextSet))
    setSelectedOutcomeSetKey(nextSet.key)
  }

  function removeOutcomeSet() {
    if (!selectedOutcomeSet) return
    const nextKey = scoringConfig.derivedOutcomes.find((item) => item.key !== selectedOutcomeSet.key)?.key ?? ''
    setConfig((current) => deleteDerivedOutcomeSet(current, selectedOutcomeSet.key))
    setSelectedOutcomeSetKey(nextKey)
  }

  function addOutcome() {
    if (!selectedOutcomeSet) return
    const nextOutcome = {
      ...getDefaultOutcome(),
      sortOrder: selectedOutcomeSet.outcomes.length + 1,
    }
    updateOutcomeSet({
      outcomes: [...selectedOutcomeSet.outcomes, nextOutcome],
    })
  }

  function updateOutcome(outcomeId: string, patch: Partial<V2DerivedOutcome>) {
    if (!selectedOutcomeSet) return
    updateOutcomeSet({
      outcomes: selectedOutcomeSet.outcomes.map((outcome) =>
        outcome.id === outcomeId ? { ...outcome, ...patch } : outcome
      ),
    })
  }

  function removeOutcome(outcomeId: string) {
    if (!selectedOutcomeSet) return
    updateOutcomeSet({
      outcomes: selectedOutcomeSet.outcomes.filter((outcome) => outcome.id !== outcomeId),
      mappings: selectedOutcomeSet.mappings.map((mapping) =>
        selectedOutcomeSet.outcomes.find((outcome) => outcome.id === outcomeId)?.key === mapping.outcomeKey
          ? { ...mapping, outcomeKey: '' }
          : mapping
      ),
    })
  }

  function addOutcomeMapping() {
    if (!selectedOutcomeSet) return
    updateOutcomeSet({
      mappings: [
        ...selectedOutcomeSet.mappings,
        getDefaultMapping(selectedOutcomeSet.targetKeys, selectedOutcomeSet.outcomes[0]?.key ?? ''),
      ],
    })
  }

  function updateOutcomeMapping(mappingId: string, patch: Partial<V2DerivedOutcomeMapping>) {
    if (!selectedOutcomeSet) return
    updateOutcomeSet({
      mappings: selectedOutcomeSet.mappings.map((mapping) =>
        mapping.id === mappingId
          ? {
              ...mapping,
              ...patch,
              combination: patch.combination ? { ...mapping.combination, ...patch.combination } : mapping.combination,
            }
          : mapping
      ),
    })
  }

  function removeOutcomeMapping(mappingId: string) {
    if (!selectedOutcomeSet) return
    updateOutcomeSet({
      mappings: selectedOutcomeSet.mappings.filter((mapping) => mapping.id !== mappingId),
    })
  }

  async function save() {
    setSaving(true)
    setError(null)
    setMessage(null)
    setSavedAt(null)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/v2/scoring`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoringConfig }),
      })
      const body = (await response.json().catch(() => null)) as { scoringConfig?: unknown; error?: string; message?: string } | null
      if (!response.ok) {
        setError(body?.message || (body?.error ? `Failed to save: ${body.error}` : 'Failed to save the V2 scoring setup.'))
        return
      }
      const normalized = normalizeV2ScoringConfig(body?.scoringConfig)
      setScoringConfig(normalized)
      markSaved(normalized)
      setSavedAt(new Date().toLocaleTimeString())
      setMessage('V2 scoring setup saved.')
    } catch {
      setError('Failed to save the V2 scoring setup.')
    } finally {
      setSaving(false)
    }
  }

  const selectedBanding = meaningTargetKey ? getBandingConfig(scoringConfig, meaningLevel, meaningTargetKey) : null
  const legacyInterpretation = meaningTargetKey ? getInterpretationContent(scoringConfig, meaningLevel, meaningTargetKey) : null
  const hasLegacyMeaningContent = Boolean(
    legacyInterpretation
    && [
      legacyInterpretation.lowMeaning,
      legacyInterpretation.midMeaning,
      legacyInterpretation.highMeaning,
      legacyInterpretation.behaviouralIndicators,
      legacyInterpretation.strengths,
      legacyInterpretation.risksWatchouts,
      legacyInterpretation.developmentFocus,
      legacyInterpretation.narrativeText,
    ].some(Boolean)
  )
  const selectedBand = selectedBanding?.bands.find((band) => band.id === selectedBandId) ?? selectedBanding?.bands[0] ?? null

  useEffect(() => {
    if (!selectedBanding) {
      setSelectedBandId('')
      return
    }

    if (!selectedBanding.bands.some((band) => band.id === selectedBandId)) {
      setSelectedBandId(selectedBanding.bands[0]?.id ?? '')
    }
  }, [selectedBandId, selectedBanding])

  if (loading) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader
          eyebrow="Assessment workspace"
          title="Scoring"
          description="Loading the scoring workspace."
        />
      </DashboardPageShell>
    )
  }

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="Assessment workspace"
        title="Scoring"
        description="Define how traits are calculated, how higher layers roll up, and what different score ranges mean so reports can present useful outcomes later."
        actions={(
          <div className="flex flex-col items-end gap-2">
            <FoundationButton type="button" variant="primary" size="sm" onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </FoundationButton>
            {isDirty ? <p className="text-xs font-medium text-amber-700">Unsaved changes</p> : null}
            {!isDirty && savedAt ? <p className="text-xs text-emerald-700">Saved at {savedAt}</p> : null}
          </div>
        )}
      />

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Traits" value={questionBank.traits.length} />
        <MetricCard label="Competencies" value={questionBank.competencies.length} />
        <MetricCard label="Dimensions" value={questionBank.dimensions.length} />
        <MetricCard label="Norm groups" value={scoringConfig.transforms.normGroups.length} />
      </div>

      <FoundationSurface className="p-5">
        <p className="text-sm font-semibold text-[var(--admin-text-primary)]">Scoring stores structured meaning for reports.</p>
        <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
          This section defines calculation, score ranges, and what each outcome means. Report blocks can then point to those scores and meanings later, including AI-driven report blocks when you build them in Reports.
        </p>
      </FoundationSurface>

      <FoundationSurface className="p-4">
        <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Scoring sections">
          {scoringTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={['admin-toggle-chip', activeTab === tab.key ? 'admin-toggle-chip-active' : ''].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </FoundationSurface>

      {activeTab === 'calculation' && (
        <div className="space-y-4">
          <SectionCard
            title="Trait calculation defaults"
            description="Traits are the base scored unit. Set the default trait method here, and then override individual traits only where needed."
          >
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Default trait method</span>
                <select
                  value={scoringConfig.calculation.traitDefaultMethod}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    calculation: {
                      ...current.calculation,
                      traitDefaultMethod: event.target.value as V2ScoreMethod,
                    },
                  }))}
                  className="foundation-field w-full"
                >
                  <option value="average">Average</option>
                  <option value="sum">Total / sum</option>
                </select>
              </label>

              <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={scoringConfig.calculation.useItemWeights}
                    onChange={(event) => setConfig((current) => ({
                      ...current,
                      calculation: {
                        ...current.calculation,
                        useItemWeights: event.target.checked,
                      },
                    }))}
                  />
                  <span className="text-sm text-[var(--admin-text-primary)]">
                    Use item weights from the Questions tab when calculating traits.
                    <span className="mt-1 block text-xs text-[var(--admin-text-muted)]">
                      Item-to-trait weights are edited in{' '}
                      <Link href={`/dashboard/assessments-v2/${assessmentId}/questions`} className="underline underline-offset-4">
                        Questions
                      </Link>
                      .
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Trait scoring rules"
            description="Keep most traits on the default method and only override the traits that genuinely need a different calculation."
          >
            {traitSummaries.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">Add traits and scored items in Questions before configuring scoring.</p>
            ) : traitSummaries.map(({ trait, itemCount, totalWeight }) => {
              const override = scoringConfig.calculation.traitOverrides.find((item) => item.targetKey === trait.key)?.method ?? 'default'

              return (
                <div key={trait.id} className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{trait.internalName || trait.key}</p>
                      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                        {itemCount} item{itemCount === 1 ? '' : 's'} linked • total item weight {totalWeight.toFixed(1)}
                      </p>
                    </div>
                    <label className="block w-full max-w-[220px] space-y-1.5">
                      <span className="text-xs text-[var(--admin-text-muted)]">Scoring method</span>
                      <select
                        value={override}
                        onChange={(event) => setConfig((current) => setTraitScoringMethod(current, trait.key, event.target.value as V2ScoreMethod | 'default'))}
                        className="foundation-field w-full"
                      >
                        <option value="default">Use default</option>
                        <option value="average">Average</option>
                        <option value="sum">Total / sum</option>
                      </select>
                    </label>
                  </div>
                </div>
              )
            })}
          </SectionCard>
        </div>
      )}

      {activeTab === 'rollups' && (
        <div className="space-y-4">
          <SectionCard
            title="Trait to competency rollups"
            description="Competency scores are derived from their linked traits. Set one method for the layer, then adjust per-link weights where needed."
          >
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Competency method</span>
                <select
                  value={scoringConfig.rollups.competency.method}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    rollups: {
                      ...current.rollups,
                      competency: {
                        ...current.rollups.competency,
                        method: event.target.value as V2ScoreMethod,
                      },
                    },
                  }))}
                  className="foundation-field w-full"
                >
                  <option value="average">Average</option>
                  <option value="sum">Total / sum</option>
                </select>
              </label>
              <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-4 py-3 text-sm text-[var(--admin-text-muted)]">
                Competencies are always derived from traits in V2. There is no direct competency scoring path.
              </div>
            </div>

            {questionBank.competencies.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No competencies configured. Traits will remain the highest scored layer.</p>
            ) : questionBank.competencies.map((competency) => {
              const linkedTraits = questionBank.traits.filter((trait) => trait.competencyKeys.includes(competency.key))

              return (
                <div key={competency.id} className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                  <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{competency.internalName || competency.key}</p>
                  {linkedTraits.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--admin-text-muted)]">No traits linked to this competency yet.</p>
                  ) : (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {linkedTraits.map((trait) => (
                        <label key={trait.key} className="block space-y-1.5 rounded-[18px] border border-[var(--admin-border)] bg-white/60 p-3">
                          <span className="text-xs text-[var(--admin-text-muted)]">{trait.internalName || trait.key}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={getRollupWeight(scoringConfig.rollups.competency.weights, competency.key, trait.key)}
                            onChange={(event) => setConfig((current) => ({
                              ...current,
                              rollups: {
                                ...current.rollups,
                                competency: {
                                  ...current.rollups.competency,
                                  weights: setRollupWeight(
                                    current.rollups.competency.weights,
                                    competency.key,
                                    trait.key,
                                    Number(event.target.value)
                                  ),
                                },
                              },
                            }))}
                            className="foundation-field w-full"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </SectionCard>

          <SectionCard
            title="Competency to dimension rollups"
            description="Dimension scores are derived from linked competencies. Keep this layer simple unless you genuinely need uneven weighting."
          >
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Dimension method</span>
                <select
                  value={scoringConfig.rollups.dimension.method}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    rollups: {
                      ...current.rollups,
                      dimension: {
                        ...current.rollups.dimension,
                        method: event.target.value as V2ScoreMethod,
                      },
                    },
                  }))}
                  className="foundation-field w-full"
                >
                  <option value="average">Average</option>
                  <option value="sum">Total / sum</option>
                </select>
              </label>
              <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-4 py-3 text-sm text-[var(--admin-text-muted)]">
                Dimensions are optional. If you skip them, reporting can still stop cleanly at competencies or traits.
              </div>
            </div>

            {questionBank.dimensions.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No dimensions configured. Competencies or traits will remain the highest summary layer.</p>
            ) : questionBank.dimensions.map((dimension) => {
              const linkedCompetencies = questionBank.competencies.filter((competency) => competency.dimensionKeys.includes(dimension.key))

              return (
                <div key={dimension.id} className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                  <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{dimension.internalName || dimension.key}</p>
                  {linkedCompetencies.length === 0 ? (
                    <p className="mt-2 text-sm text-[var(--admin-text-muted)]">No competencies linked to this dimension yet.</p>
                  ) : (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {linkedCompetencies.map((competency) => (
                        <label key={competency.key} className="block space-y-1.5 rounded-[18px] border border-[var(--admin-border)] bg-white/60 p-3">
                          <span className="text-xs text-[var(--admin-text-muted)]">{competency.internalName || competency.key}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={getRollupWeight(scoringConfig.rollups.dimension.weights, dimension.key, competency.key)}
                            onChange={(event) => setConfig((current) => ({
                              ...current,
                              rollups: {
                                ...current.rollups,
                                dimension: {
                                  ...current.rollups.dimension,
                                  weights: setRollupWeight(
                                    current.rollups.dimension.weights,
                                    dimension.key,
                                    competency.key,
                                    Number(event.target.value)
                                  ),
                                },
                              },
                            }))}
                            className="foundation-field w-full"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </SectionCard>
        </div>
      )}

      {activeTab === 'transforms' && (
        <div className="space-y-4">
          <SectionCard
            title="Report output transforms"
            description="Store the display logic that turns a calculated raw score into the forms reports may need later, including rescaled values and STEN output."
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Display mode</span>
                <select
                  value={scoringConfig.transforms.displayMode}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    transforms: {
                      ...current.transforms,
                      displayMode: event.target.value as V2ScoringConfig['transforms']['displayMode'],
                    },
                  }))}
                  className="foundation-field w-full"
                >
                  <option value="raw">Keep raw score</option>
                  <option value="rescaled">Rescale for display</option>
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Display min</span>
                <input
                  type="number"
                  value={scoringConfig.transforms.displayRangeMin}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    transforms: {
                      ...current.transforms,
                      displayRangeMin: Number(event.target.value),
                    },
                  }))}
                  className="foundation-field w-full"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Display max</span>
                <input
                  type="number"
                  value={scoringConfig.transforms.displayRangeMax}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    transforms: {
                      ...current.transforms,
                      displayRangeMax: Number(event.target.value),
                    },
                  }))}
                  className="foundation-field w-full"
                />
              </label>
              <label className="flex items-center gap-3 rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-4 py-3 text-sm text-[var(--admin-text-primary)]">
                <input
                  type="checkbox"
                  checked={scoringConfig.transforms.sten.enabled}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    transforms: {
                      ...current.transforms,
                      sten: {
                        ...current.transforms.sten,
                        enabled: event.target.checked,
                      },
                    },
                  }))}
                />
                Enable STEN output
              </label>
            </div>

            {scoringConfig.transforms.sten.enabled ? (
              <div className="grid gap-4 md:grid-cols-3">
                <label className="block space-y-1.5">
                  <span className="text-xs text-[var(--admin-text-muted)]">STEN source</span>
                  <select
                    value={scoringConfig.transforms.sten.source}
                    onChange={(event) => setConfig((current) => ({
                      ...current,
                      transforms: {
                        ...current.transforms,
                        sten: {
                          ...current.transforms.sten,
                          source: event.target.value as V2ScoringConfig['transforms']['sten']['source'],
                        },
                      },
                    }))}
                    className="foundation-field w-full"
                  >
                    <option value="raw">Raw score</option>
                    <option value="normed">Normed score</option>
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs text-[var(--admin-text-muted)]">STEN min</span>
                  <input
                    type="number"
                    value={scoringConfig.transforms.sten.min}
                    onChange={(event) => setConfig((current) => ({
                      ...current,
                      transforms: {
                        ...current.transforms,
                        sten: {
                          ...current.transforms.sten,
                          min: Number(event.target.value),
                        },
                      },
                    }))}
                    className="foundation-field w-full"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs text-[var(--admin-text-muted)]">STEN max</span>
                  <input
                    type="number"
                    value={scoringConfig.transforms.sten.max}
                    onChange={(event) => setConfig((current) => ({
                      ...current,
                      transforms: {
                        ...current.transforms,
                        sten: {
                          ...current.transforms.sten,
                          max: Number(event.target.value),
                        },
                      },
                    }))}
                    className="foundation-field w-full"
                  />
                </label>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Norm groups"
            description="Capture the norm sets you may use later without tying the assessment to a reporting engine yet."
            footer={<FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={addNormGroup}>Add norm group</FoundationButton>}
          >
            <div className="max-w-[280px]">
              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Default norm group</span>
                <select
                  value={scoringConfig.transforms.defaultNormGroupId ?? ''}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    transforms: {
                      ...current.transforms,
                      defaultNormGroupId: event.target.value || null,
                    },
                  }))}
                  className="foundation-field w-full"
                >
                  <option value="">None selected</option>
                  {scoringConfig.transforms.normGroups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name || group.key}</option>
                  ))}
                </select>
              </label>
            </div>

            {scoringConfig.transforms.normGroups.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No norm groups configured yet.</p>
            ) : scoringConfig.transforms.normGroups.map((group) => (
              <div key={group.id} className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-xs text-[var(--admin-text-muted)]">{group.key}</span>
                  <button type="button" onClick={() => deleteNormGroup(group.id)} className="text-xs text-red-600">Delete</button>
                </div>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--admin-text-muted)]">Key</span>
                    <input
                      value={group.key}
                      onChange={(event) => updateNormGroup(group.id, { key: event.target.value })}
                      className="foundation-field w-full"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-[var(--admin-text-muted)]">Name</span>
                    <input
                      value={group.name}
                      onChange={(event) => updateNormGroup(group.id, { name: event.target.value })}
                      className="foundation-field w-full"
                    />
                  </label>
                </div>
                <label className="mt-4 block space-y-1.5">
                  <span className="text-xs text-[var(--admin-text-muted)]">Description</span>
                  <textarea
                    value={group.description}
                    onChange={(event) => updateNormGroup(group.id, { description: event.target.value })}
                    className="foundation-field min-h-24 w-full"
                  />
                </label>
                <label className="mt-4 block space-y-1.5">
                  <span className="text-xs text-[var(--admin-text-muted)]">Sample description</span>
                  <textarea
                    value={group.sampleDescription}
                    onChange={(event) => updateNormGroup(group.id, { sampleDescription: event.target.value })}
                    className="foundation-field min-h-24 w-full"
                  />
                </label>
              </div>
            ))}
          </SectionCard>
        </div>
      )}

      {activeTab === 'bands' && (
        <div className="space-y-4">
          <SectionCard
            title="Bands and interpretation"
            description="Choose one scored entity at a time, define its score bands, and attach interpretation content directly to each band."
          >
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Level</span>
                <select
                  value={meaningLevel}
                  onChange={(event) => setMeaningLevel(event.target.value as V2ScoringLevel)}
                  className="foundation-field w-full"
                >
                  <option value="trait">Trait</option>
                  <option value="competency">Competency</option>
                  <option value="dimension">Dimension</option>
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs text-[var(--admin-text-muted)]">Target</span>
                <select
                  value={meaningTargetKey}
                  onChange={(event) => setMeaningTargetKey(event.target.value)}
                  className="foundation-field w-full"
                  disabled={meaningOptions.length === 0}
                >
                  {meaningOptions.length === 0 ? (
                    <option value="">No items available</option>
                  ) : meaningOptions.map((item) => (
                    <option key={item.key} value={item.key}>{item.label}</option>
                  ))}
                </select>
              </label>
            </div>
          </SectionCard>

          {!selectedBanding ? (
            <FoundationSurface className="p-6 text-sm text-[var(--admin-text-muted)]">
              Add traits, competencies, or dimensions in Questions before authoring score meanings.
            </FoundationSurface>
          ) : (
            <>
              <SectionCard
                title="Band setup"
                description="Create named score ranges first. Then select a band to edit its interpretation content on the right."
                footer={(
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedBanding.bands.length === 0 ? (
                      <FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={createMeaningStarterBands}>
                        Create Low / Mid / High
                      </FoundationButton>
                    ) : null}
                    <FoundationButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="inline-flex whitespace-nowrap"
                      onClick={() => {
                        const nextBand = makeBand()
                        updateBanding([...selectedBanding.bands, nextBand])
                        setSelectedBandId(nextBand.id)
                      }}
                    >
                      Add band
                    </FoundationButton>
                  </div>
                )}
              >
                {selectedBanding.bands.length === 0 ? (
                  <div className="rounded-[20px] border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-5 text-sm text-[var(--admin-text-muted)]">
                    No bands configured for this target yet.
                    {hasLegacyMeaningContent && (
                      <span className="mt-2 block">
                        There is older low / mid / high meaning content stored for this target. Use "Create Low / Mid / High" to convert that into editable bands.
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="space-y-3">
                      {selectedBanding.bands.map((band, index) => {
                        const isActive = selectedBand?.id === band.id
                        return (
                          <div
                            key={band.id}
                            className={[
                              'rounded-[20px] border p-4 transition',
                              isActive
                                ? 'border-[var(--admin-accent)] bg-[var(--admin-surface-alt)] shadow-[0_10px_30px_rgba(15,23,42,0.08)]'
                                : 'border-[var(--admin-border)] bg-[var(--admin-surface-alt)] hover:border-[var(--admin-accent-soft)]',
                            ].join(' ')}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                onClick={() => setSelectedBandId(band.id)}
                                className="min-w-0 flex-1 text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: band.color }} />
                                  <p className="truncate text-sm font-semibold text-[var(--admin-text-primary)]">
                                    {band.label || `Band ${index + 1}`}
                                  </p>
                                </div>
                                <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                                  {band.min} to {band.max}
                                </p>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextBands = selectedBanding.bands.filter((item) => item.id !== band.id)
                                  updateBanding(nextBands)
                                  if (selectedBandId === band.id) {
                                    setSelectedBandId(nextBands[0]?.id ?? '')
                                  }
                                }}
                                className="text-xs text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {selectedBand ? (
                      <div className="rounded-[24px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-5">
                        <div className="grid gap-4 md:grid-cols-4">
                          <label className="block space-y-1.5 md:col-span-2">
                            <span className="text-xs text-[var(--admin-text-muted)]">Band label</span>
                            <input
                              value={selectedBand.label}
                              onChange={(event) => updateSelectedBand({ label: event.target.value })}
                              className="foundation-field w-full"
                            />
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-xs text-[var(--admin-text-muted)]">Min</span>
                            <input
                              type="number"
                              value={selectedBand.min}
                              onChange={(event) => updateSelectedBand({ min: Number(event.target.value) })}
                              className="foundation-field w-full"
                            />
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-xs text-[var(--admin-text-muted)]">Max</span>
                            <input
                              type="number"
                              value={selectedBand.max}
                              onChange={(event) => updateSelectedBand({ max: Number(event.target.value) })}
                              className="foundation-field w-full"
                            />
                          </label>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
                          <label className="block space-y-1.5">
                            <span className="text-xs text-[var(--admin-text-muted)]">Color</span>
                            <input
                              type="color"
                              value={selectedBand.color}
                              onChange={(event) => updateSelectedBand({ color: event.target.value })}
                              className="h-11 w-full rounded-[14px] border border-[var(--admin-border)] bg-white px-2"
                            />
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-xs text-[var(--admin-text-muted)]">Meaning summary</span>
                            <textarea
                              value={selectedBand.meaning}
                              onChange={(event) => updateSelectedBand({ meaning: event.target.value })}
                              className="foundation-field min-h-24 w-full"
                            />
                          </label>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <label className="block space-y-1.5">
                            <span className="text-xs text-[var(--admin-text-muted)]">Behavioural indicators</span>
                            <textarea
                              value={selectedBand.behaviouralIndicators}
                              onChange={(event) => updateSelectedBand({ behaviouralIndicators: event.target.value })}
                              className="foundation-field min-h-28 w-full"
                            />
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-xs text-[var(--admin-text-muted)]">Strengths</span>
                            <textarea
                              value={selectedBand.strengths}
                              onChange={(event) => updateSelectedBand({ strengths: event.target.value })}
                              className="foundation-field min-h-28 w-full"
                            />
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-xs text-[var(--admin-text-muted)]">Watchouts</span>
                            <textarea
                              value={selectedBand.watchouts}
                              onChange={(event) => updateSelectedBand({ watchouts: event.target.value })}
                              className="foundation-field min-h-28 w-full"
                            />
                          </label>
                          <label className="block space-y-1.5">
                            <span className="text-xs text-[var(--admin-text-muted)]">Development focus</span>
                            <textarea
                              value={selectedBand.developmentFocus}
                              onChange={(event) => updateSelectedBand({ developmentFocus: event.target.value })}
                              className="foundation-field min-h-28 w-full"
                            />
                          </label>
                        </div>

                        <label className="mt-4 block space-y-1.5">
                          <span className="text-xs text-[var(--admin-text-muted)]">Narrative text</span>
                          <textarea
                            value={selectedBand.narrativeText}
                            onChange={(event) => updateSelectedBand({ narrativeText: event.target.value })}
                            className="foundation-field min-h-32 w-full"
                          />
                        </label>
                      </div>
                    ) : null}
                  </div>
                )}
              </SectionCard>
            </>
          )}
        </div>
      )}

      {activeTab === 'outcomes' && (
        <div className="space-y-4">
          <SectionCard
            title="Derived outcome sets"
            description="Resolve a higher-order outcome from a small set of banded targets. Keep these sets small, explicit, and fully covered."
            footer={(
              <FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={addOutcomeSet}>
                Add outcome set
              </FoundationButton>
            )}
          >
            {scoringConfig.derivedOutcomes.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-5 text-sm text-[var(--admin-text-muted)]">
                No derived outcome sets configured yet. Use this when an assessment needs an overall profile driven by a small combination of banded targets.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
                <div className="space-y-3">
                  {scoringConfig.derivedOutcomes.map((outcomeSet) => (
                    <button
                      key={outcomeSet.id}
                      type="button"
                      onClick={() => setSelectedOutcomeSetKey(outcomeSet.key)}
                      className={[
                        'w-full rounded-[20px] border p-4 text-left transition',
                        selectedOutcomeSet?.key === outcomeSet.key
                          ? 'border-[var(--admin-accent)] bg-[var(--admin-surface-alt)] shadow-[0_10px_30px_rgba(15,23,42,0.08)]'
                          : 'border-[var(--admin-border)] bg-[var(--admin-surface-alt)] hover:border-[var(--admin-accent-soft)]',
                      ].join(' ')}
                    >
                      <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{outcomeSet.name}</p>
                      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                        {outcomeSet.level} • {outcomeSet.targetKeys.length} inputs • {outcomeSet.outcomes.length} outcomes
                      </p>
                    </button>
                  ))}
                </div>

                {selectedOutcomeSet ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                      <div>
                        <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{selectedOutcomeSet.name}</p>
                        <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
                          Keep input sets to {MAX_V2_DERIVED_OUTCOME_TARGETS} or fewer targets and cover every combination before publishing.
                        </p>
                      </div>
                      <button type="button" onClick={removeOutcomeSet} className="text-xs text-red-600">
                        Delete outcome set
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Name</span>
                        <input
                          value={selectedOutcomeSet.name}
                          onChange={(event) => updateOutcomeSet({ name: event.target.value })}
                          className="foundation-field w-full"
                        />
                      </label>
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Key</span>
                        <input
                          value={selectedOutcomeSet.key}
                          onChange={(event) => {
                            const nextKey = event.target.value
                            updateOutcomeSet({ key: nextKey })
                            setSelectedOutcomeSetKey(nextKey)
                          }}
                          className="foundation-field w-full"
                        />
                      </label>
                    </div>

                    <label className="block space-y-1.5">
                      <span className="text-xs text-[var(--admin-text-muted)]">Description</span>
                      <textarea
                        value={selectedOutcomeSet.description}
                        onChange={(event) => updateOutcomeSet({ description: event.target.value })}
                        className="foundation-field min-h-24 w-full"
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                      <label className="block space-y-1.5">
                        <span className="text-xs text-[var(--admin-text-muted)]">Level</span>
                        <select
                          value={selectedOutcomeSet.level}
                          onChange={(event) => {
                            const nextLevel = event.target.value as V2ScoringLevel
                            const nextTargetKeys = getEntityOptions(questionBank, nextLevel).slice(0, 3).map((item) => item.key)
                            updateOutcomeSet({
                              level: nextLevel,
                              targetKeys: nextTargetKeys,
                              mappings: selectedOutcomeSet.mappings.map((mapping) => ({
                                ...mapping,
                                combination: Object.fromEntries(nextTargetKeys.map((targetKey) => [targetKey, '*'])),
                              })),
                            })
                          }}
                          className="foundation-field w-full"
                        >
                          <option value="trait">Trait</option>
                          <option value="competency">Competency</option>
                          <option value="dimension">Dimension</option>
                        </select>
                      </label>

                      <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--admin-text-muted)]">Inputs</p>
                        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {outcomeTargetOptions.map((option) => {
                            const selected = selectedOutcomeSet.targetKeys.includes(option.key)
                            const disabled = !selected && selectedOutcomeSet.targetKeys.length >= MAX_V2_DERIVED_OUTCOME_TARGETS
                            return (
                              <label key={option.key} className="flex items-center gap-2 rounded-[16px] border border-[var(--admin-border)] bg-white/60 px-3 py-2 text-sm text-[var(--admin-text-primary)]">
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  disabled={disabled}
                                  onChange={(event) => {
                                    const nextTargetKeys = event.target.checked
                                      ? [...selectedOutcomeSet.targetKeys, option.key]
                                      : selectedOutcomeSet.targetKeys.filter((item) => item !== option.key)
                                    updateOutcomeSet({
                                      targetKeys: nextTargetKeys,
                                      mappings: selectedOutcomeSet.mappings.map((mapping) => ({
                                        ...mapping,
                                        combination: Object.fromEntries(
                                          nextTargetKeys.map((targetKey) => [targetKey, mapping.combination[targetKey] ?? '*'])
                                        ),
                                      })),
                                    })
                                  }}
                                />
                                <span>{option.label}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {outcomeCoverage ? (
                      <div className="grid gap-3 md:grid-cols-3">
                        <FoundationSurface className="p-4">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Exact combinations</p>
                          <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{outcomeCoverage.totalCombinations}</p>
                        </FoundationSurface>
                        <FoundationSurface className="p-4">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Resolved</p>
                          <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{outcomeCoverage.resolvedCombinations}</p>
                        </FoundationSurface>
                        <FoundationSurface className="p-4">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-text-soft)]">Issues</p>
                          <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{outcomeCoverage.issues.length}</p>
                        </FoundationSurface>
                      </div>
                    ) : null}

                    {outcomeCoverage && outcomeCoverage.issues.length > 0 ? (
                      <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        {outcomeCoverage.issues.slice(0, 8).map((issue, index) => (
                          <p key={`${issue.type}-${index}`}>{issue.message}</p>
                        ))}
                      </div>
                    ) : null}

                    <SectionCard
                      title="Outcomes"
                      description="Define the reusable outcome cards and their narrative content."
                      footer={(
                        <FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={addOutcome}>
                          Add outcome
                        </FoundationButton>
                      )}
                    >
                      {selectedOutcomeSet.outcomes.length === 0 ? (
                        <p className="text-sm text-[var(--admin-text-muted)]">No outcomes defined yet.</p>
                      ) : selectedOutcomeSet.outcomes.map((outcome) => (
                        <div key={outcome.id} className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{outcome.label}</p>
                            <button type="button" onClick={() => removeOutcome(outcome.id)} className="text-xs text-red-600">Delete</button>
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <label className="block space-y-1.5">
                              <span className="text-xs text-[var(--admin-text-muted)]">Label</span>
                              <input value={outcome.label} onChange={(event) => updateOutcome(outcome.id, { label: event.target.value })} className="foundation-field w-full" />
                            </label>
                            <label className="block space-y-1.5">
                              <span className="text-xs text-[var(--admin-text-muted)]">Key</span>
                              <input value={outcome.key} onChange={(event) => updateOutcome(outcome.id, { key: event.target.value })} className="foundation-field w-full" />
                            </label>
                          </div>
                          <label className="mt-4 block space-y-1.5">
                            <span className="text-xs text-[var(--admin-text-muted)]">Short description</span>
                            <textarea value={outcome.shortDescription} onChange={(event) => updateOutcome(outcome.id, { shortDescription: event.target.value })} className="foundation-field min-h-20 w-full" />
                          </label>
                          <label className="mt-4 block space-y-1.5">
                            <span className="text-xs text-[var(--admin-text-muted)]">Report summary</span>
                            <textarea value={outcome.reportSummary} onChange={(event) => updateOutcome(outcome.id, { reportSummary: event.target.value })} className="foundation-field min-h-20 w-full" />
                          </label>
                          <label className="mt-4 block space-y-1.5">
                            <span className="text-xs text-[var(--admin-text-muted)]">Full narrative</span>
                            <textarea value={outcome.fullNarrative} onChange={(event) => updateOutcome(outcome.id, { fullNarrative: event.target.value })} className="foundation-field min-h-28 w-full" />
                          </label>
                          <label className="mt-4 block space-y-1.5">
                            <span className="text-xs text-[var(--admin-text-muted)]">Recommendations</span>
                            <textarea
                              value={outcome.recommendations.join('\n')}
                              onChange={(event) => updateOutcome(outcome.id, {
                                recommendations: event.target.value.split('\n').map((item) => item.trim()).filter(Boolean),
                              })}
                              className="foundation-field min-h-28 w-full"
                            />
                          </label>
                        </div>
                      ))}
                    </SectionCard>

                    <SectionCard
                      title="Mappings"
                      description="Map exact or wildcard band combinations to one outcome."
                      footer={(
                        <FoundationButton type="button" variant="secondary" size="sm" className="inline-flex whitespace-nowrap" onClick={addOutcomeMapping}>
                          Add mapping
                        </FoundationButton>
                      )}
                    >
                      {selectedOutcomeSet.mappings.length === 0 ? (
                        <p className="text-sm text-[var(--admin-text-muted)]">No mappings configured yet.</p>
                      ) : selectedOutcomeSet.mappings.map((mapping) => (
                        <div key={mapping.id} className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-[var(--admin-text-primary)]">{mapping.id}</p>
                            <button type="button" onClick={() => removeOutcomeMapping(mapping.id)} className="text-xs text-red-600">Delete</button>
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {selectedOutcomeSet.targetKeys.map((targetKey) => (
                              <label key={targetKey} className="block space-y-1.5">
                                <span className="text-xs text-[var(--admin-text-muted)]">{targetKey}</span>
                                <select
                                  value={mapping.combination[targetKey] ?? '*'}
                                  onChange={(event) => updateOutcomeMapping(mapping.id, {
                                    combination: { [targetKey]: event.target.value },
                                  })}
                                  className="foundation-field w-full"
                                >
                                  <option value="*">Any band</option>
                                  {getBandingConfig(scoringConfig, selectedOutcomeSet.level, targetKey).bands.map((band) => (
                                    <option key={band.id} value={band.id}>{band.label}</option>
                                  ))}
                                </select>
                              </label>
                            ))}
                            <label className="block space-y-1.5">
                              <span className="text-xs text-[var(--admin-text-muted)]">Outcome</span>
                              <select
                                value={mapping.outcomeKey}
                                onChange={(event) => updateOutcomeMapping(mapping.id, { outcomeKey: event.target.value })}
                                className="foundation-field w-full"
                              >
                                <option value="">Select outcome</option>
                                {selectedOutcomeSet.outcomes.map((outcome) => (
                                  <option key={outcome.id} value={outcome.key}>{outcome.label}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <label className="mt-4 block space-y-1.5">
                            <span className="text-xs text-[var(--admin-text-muted)]">Rationale</span>
                            <textarea
                              value={mapping.rationale}
                              onChange={(event) => updateOutcomeMapping(mapping.id, { rationale: event.target.value })}
                              className="foundation-field min-h-20 w-full"
                            />
                          </label>
                        </div>
                      ))}
                    </SectionCard>
                  </div>
                ) : null}
              </div>
            )}
          </SectionCard>
        </div>
      )}

    </DashboardPageShell>
  )
}
