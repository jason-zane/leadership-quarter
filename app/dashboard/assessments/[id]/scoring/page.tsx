'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useParams } from 'next/navigation'
import {
  ClassificationsSection,
} from '@/app/dashboard/assessments/[id]/scoring/_components/classifications-section'
import { CompetenciesSection } from '@/app/dashboard/assessments/[id]/scoring/_components/competencies-section'
import { ImportToolbar } from '@/app/dashboard/assessments/[id]/scoring/_components/import-toolbar'
import { MatrixSection } from '@/app/dashboard/assessments/[id]/scoring/_components/matrix-section'
import { ScaleSection } from '@/app/dashboard/assessments/[id]/scoring/_components/scale-section'
import { ScoreMeaningsSection } from '@/app/dashboard/assessments/[id]/scoring/_components/score-meanings-section'
import {
  ToastContainer,
} from '@/app/dashboard/assessments/[id]/scoring/_components/shared'
import { TestingSection } from '@/app/dashboard/assessments/[id]/scoring/_components/testing-section'
import type {
  MatrixStatusFilter,
  Question,
  Toast,
} from '@/app/dashboard/assessments/[id]/scoring/_lib/scoring-editor-types'
import {
  withAddedBand,
  withAddedClassification,
  withAddedExcludedSignal,
  withAddedPreferredSignal,
  withAddedRecommendation,
  withCombinationClassification,
  withDeletedClassification,
  withRemovedBand,
  withRemovedExcludedSignal,
  withRemovedPreferredSignal,
  withRemovedRecommendation,
  withScaleLabel,
  withScalePoints,
  withUpdatedBand,
  withUpdatedClassification,
  withUpdatedExcludedSignal,
  withUpdatedPreferredSignal,
  withUpdatedRecommendation,
} from '@/app/dashboard/assessments/[id]/scoring/_lib/scoring-editor-config'
import {
  MATRIX_PAGE_SIZE,
  summarizeImportErrors,
} from '@/app/dashboard/assessments/[id]/scoring/_lib/scoring-editor-utils'
import {
  parseScoringConfigCsv,
} from '@/utils/assessments/scoring-csv'
import {
  analyzeScoringConfig,
  buildMatrixPreviewRows,
  clearGeneratedClassificationMatrixCells,
  createEmptyScoringConfig,
  DEFAULT_SCALE_CONFIG,
  generateDraftClassificationMatrix,
  getClassificationCombinationCount,
  normalizeScoringConfig,
  upgradeScoringConfigToV2,
  type MatrixDraftGenerationSummary,
} from '@/utils/assessments/scoring-config'
import type {
  ScoringBand,
  ScoringClassification,
  ScoringClassificationExclusion,
  ScoringClassificationSignal,
  ScoringEngineType,
  ScoringConfig,
  ScoringDimension,
} from '@/utils/assessments/types'

type ScoringModelItem = {
  id: string
  name: string
  mode: ScoringEngineType
  status: 'draft' | 'published' | 'archived'
  is_default: boolean
  output_summary?: {
    competency_count?: number
    classification_count?: number
    uses_matrix?: boolean
    scale_points?: number
  } | null
}

type LinkedReportVariant = {
  id: string
  name: string
  status: 'draft' | 'published' | 'archived'
  is_default: boolean
  scoring_model_id?: string | null
}

function scoringModeLabel(value: ScoringEngineType) {
  switch (value) {
    case 'psychometric':
      return 'Psychometric'
    case 'hybrid':
      return 'Hybrid'
    default:
      return 'Rule-based'
  }
}

export default function AssessmentScoringPage() {
  const params = useParams<{ id: string }>()
  const assessmentId = params.id
  const [config, setConfig] = useState<ScoringConfig>(createEmptyScoringConfig())
  const [questions, setQuestions] = useState<Question[]>([])
  const [scoringModels, setScoringModels] = useState<ScoringModelItem[]>([])
  const [reportVariants, setReportVariants] = useState<LinkedReportVariant[]>([])
  const [selectedScoringModelId, setSelectedScoringModelId] = useState('')
  const [selectedModelName, setSelectedModelName] = useState('')
  const [selectedModelMode, setSelectedModelMode] = useState<ScoringEngineType>('rule_based')
  const [selectedModelStatus, setSelectedModelStatus] = useState<'draft' | 'published' | 'archived'>('draft')
  const [selectedModelIsDefault, setSelectedModelIsDefault] = useState(false)
  const [modelSaving, setModelSaving] = useState(false)
  const [creatingModel, setCreatingModel] = useState(false)
  const [newModelName, setNewModelName] = useState('')
  const [newModelMode, setNewModelMode] = useState<ScoringEngineType>('rule_based')
  const [saving, setSaving] = useState(false)
  const [legacySourceDetected, setLegacySourceDetected] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [newClassificationLabel, setNewClassificationLabel] = useState('')
  const [newRecommendation, setNewRecommendation] = useState<Record<string, string>>({})
  const [matrixStatusFilter, setMatrixStatusFilter] = useState<MatrixStatusFilter>('all')
  const [matrixClassificationFilter, setMatrixClassificationFilter] = useState('')
  const [matrixBandFilters, setMatrixBandFilters] = useState<Record<string, string>>({})
  const [matrixPage, setMatrixPage] = useState(0)
  const [lastGenerationSummary, setLastGenerationSummary] =
    useState<MatrixDraftGenerationSummary | null>(null)
  const jsonFileInputRef = useRef<HTMLInputElement>(null)
  const csvFileInputRef = useRef<HTMLInputElement>(null)
  const toastId = useRef(0)

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = ++toastId.current
    setToasts((current) => [...current, { id, message, type }])
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 3000)
  }, [])

  const load = useCallback(async (modelId?: string) => {
    const query = modelId ? `?modelId=${encodeURIComponent(modelId)}` : ''

    const [scoringRes, questionsRes, reportVariantsRes] = await Promise.all([
      fetch(`/api/admin/assessments/${assessmentId}/scoring${query}`, { cache: 'no-store' }),
      fetch(`/api/admin/assessments/${assessmentId}/questions`, { cache: 'no-store' }),
      fetch(`/api/admin/assessments/${assessmentId}/report-variants`, { cache: 'no-store' }),
    ])
    const scoringBody = (await scoringRes.json().catch(() => null)) as {
      scoringConfig?: unknown
      scoringModels?: ScoringModelItem[]
      selectedScoringModel?: ScoringModelItem
      selectedScoringModelId?: string
    } | null
    const questionsBody = (await questionsRes.json().catch(() => null)) as { questions?: Question[] } | null
    const reportVariantsBody = (await reportVariantsRes.json().catch(() => null)) as {
      variants?: LinkedReportVariant[]
    } | null
    const normalized = normalizeScoringConfig(scoringBody?.scoringConfig)
    const selectedModel = scoringBody?.selectedScoringModel ?? null

    setLegacySourceDetected(normalized.version !== 2)
    setConfig(normalized.version === 2 ? normalized : upgradeScoringConfigToV2(normalized))
    setQuestions(questionsBody?.questions ?? [])
    setScoringModels(scoringBody?.scoringModels ?? [])
    setReportVariants(reportVariantsBody?.variants ?? [])
    setSelectedScoringModelId(scoringBody?.selectedScoringModelId ?? selectedModel?.id ?? '')
    setSelectedModelName(selectedModel?.name ?? '')
    setSelectedModelMode(selectedModel?.mode ?? 'rule_based')
    setSelectedModelStatus(selectedModel?.status ?? 'draft')
    setSelectedModelIsDefault(Boolean(selectedModel?.is_default))
  }, [assessmentId])

  useEffect(() => {
    void load()
  }, [assessmentId, load])

  useEffect(() => {
    setMatrixPage(0)
  }, [matrixBandFilters, matrixClassificationFilter, matrixStatusFilter])

  const analysis = useMemo(() => analyzeScoringConfig(config, questions), [config, questions])
  const scaleConfig = config.scale_config ?? DEFAULT_SCALE_CONFIG
  const totalExactCombinations = useMemo(
    () => getClassificationCombinationCount(config),
    [config]
  )
  const filteredExactCombinations = useMemo(
    () => getClassificationCombinationCount(config, { filters: matrixBandFilters }),
    [config, matrixBandFilters]
  )
  const matrixPreview = useMemo(
    () =>
      buildMatrixPreviewRows(config, {
        filters: matrixBandFilters,
        offset: matrixPage * MATRIX_PAGE_SIZE,
        limit: MATRIX_PAGE_SIZE,
      }),
    [config, matrixBandFilters, matrixPage]
  )
  const visibleRows = useMemo(
    () =>
      matrixPreview.rows.filter((row) => {
        if (matrixStatusFilter !== 'all' && row.source !== matrixStatusFilter) return false
        if (matrixClassificationFilter && row.classification_key !== matrixClassificationFilter) {
          return false
        }
        return true
      }),
    [matrixClassificationFilter, matrixPreview.rows, matrixStatusFilter]
  )
  const selectedModelVariantCount = useMemo(
    () => reportVariants.filter((variant) => variant.scoring_model_id === selectedScoringModelId).length,
    [reportVariants, selectedScoringModelId]
  )
  const selectedModelPublishedVariantCount = useMemo(
    () =>
      reportVariants.filter(
        (variant) => variant.scoring_model_id === selectedScoringModelId && variant.status === 'published'
      ).length,
    [reportVariants, selectedScoringModelId]
  )
  const readinessLabel = analysis.canPublish ? 'Ready for reports' : 'Needs setup'
  const hasQuestions = questions.length > 0
  const hasCompetencies = config.dimensions.length > 0
  const selectedModelNeedsPsychometrics = selectedModelMode === 'psychometric' || selectedModelMode === 'hybrid'

  function handleScalePoints(points: number) {
    setConfig((current) => withScalePoints(current, points))
  }

  function handleScaleLabel(index: number, value: string) {
    setConfig((current) => withScaleLabel(current, index, value))
  }

  function addBand(dimension: ScoringDimension) {
    setConfig((current) => withAddedBand(current, dimension, scaleConfig.points))
  }

  function updateBand(dimensionKey: string, bandKey: string, patch: Partial<ScoringBand>) {
    setConfig((current) => withUpdatedBand(current, dimensionKey, bandKey, patch))
  }

  function removeBand(dimensionKey: string, bandKey: string) {
    setConfig((current) => withRemovedBand(current, dimensionKey, bandKey))
  }

  function updateClassification(classificationKey: string, patch: Partial<ScoringClassification>) {
    setConfig((current) => withUpdatedClassification(current, classificationKey, patch))
  }

  function addClassification() {
    const label = newClassificationLabel.trim()
    if (!label) return
    setConfig((current) => withAddedClassification(current, label))
    setNewClassificationLabel('')
  }

  function deleteClassification(classificationKey: string) {
    setConfig((current) => withDeletedClassification(current, classificationKey))
  }

  function addRecommendation(classificationKey: string) {
    const next = (newRecommendation[classificationKey] ?? '').trim()
    if (!next) return
    setConfig((current) => withAddedRecommendation(current, classificationKey, next))
    setNewRecommendation((current) => ({ ...current, [classificationKey]: '' }))
  }

  function updateRecommendation(classificationKey: string, index: number, value: string) {
    setConfig((current) => withUpdatedRecommendation(current, classificationKey, index, value))
  }

  function removeRecommendation(classificationKey: string, index: number) {
    setConfig((current) => withRemovedRecommendation(current, classificationKey, index))
  }

  function addPreferredSignal(classificationKey: string) {
    setConfig((current) => withAddedPreferredSignal(current, classificationKey))
  }

  function updatePreferredSignal(
    classificationKey: string,
    index: number,
    patch: Partial<ScoringClassificationSignal>
  ) {
    setConfig((current) => withUpdatedPreferredSignal(current, classificationKey, index, patch))
  }

  function removePreferredSignal(classificationKey: string, index: number) {
    setConfig((current) => withRemovedPreferredSignal(current, classificationKey, index))
  }

  function addExcludedSignal(classificationKey: string) {
    setConfig((current) => withAddedExcludedSignal(current, classificationKey))
  }

  function updateExcludedSignal(
    classificationKey: string,
    index: number,
    patch: Partial<ScoringClassificationExclusion>
  ) {
    setConfig((current) => withUpdatedExcludedSignal(current, classificationKey, index, patch))
  }

  function removeExcludedSignal(classificationKey: string, index: number) {
    setConfig((current) => withRemovedExcludedSignal(current, classificationKey, index))
  }

  function setCombinationClassification(combination: Record<string, string>, classificationKey: string) {
    setConfig((current) => withCombinationClassification(current, combination, classificationKey))
  }

  async function handleJsonImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const raw = JSON.parse(await file.text())
      const imported = normalizeScoringConfig(raw)
      setConfig(imported.version === 2 ? imported : upgradeScoringConfigToV2(imported))
      setLegacySourceDetected(imported.version !== 2)
      setLastGenerationSummary(null)
      addToast('JSON scoring config loaded into the editor. Review and save when ready.', 'success')
    } catch {
      addToast('Could not parse scoring config JSON.', 'error')
    } finally {
      event.target.value = ''
    }
  }

  async function handleCsvImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const result = parseScoringConfigCsv(await file.text(), config)
      if (!result.config) {
        addToast(summarizeImportErrors(result.errors), 'error')
        return
      }
      setConfig(result.config)
      setLegacySourceDetected(false)
      setLastGenerationSummary(null)
      addToast('CSV scoring config loaded into the editor. Review and save when ready.', 'success')
    } catch {
      addToast('Could not parse scoring config CSV.', 'error')
    } finally {
      event.target.value = ''
    }
  }

  function generateDraftMappings() {
    const result = generateDraftClassificationMatrix(config, { filters: matrixBandFilters })
    setConfig(result.config)
    setLastGenerationSummary(result.summary)
    addToast(
      `Refreshed ${result.summary.assigned} cached preview rows. Live matrix preview still comes from the rules and overrides.`,
      'success'
    )
  }

  function clearGeneratedMappings() {
    setConfig((current) => clearGeneratedClassificationMatrixCells(current))
    setLastGenerationSummary(null)
    addToast('Saved preview rows cleared. Manual overrides were preserved.', 'success')
  }

  async function save() {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/scoring`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scoringConfig: config,
          scoringModelId: selectedScoringModelId || null,
        }),
      })
      if (!response.ok) {
        addToast('Could not save scoring config.', 'error')
        return
      }

      const body = (await response.json().catch(() => null)) as { scoringConfig?: unknown } | null
      if (body?.scoringConfig) setConfig(normalizeScoringConfig(body.scoringConfig))
      addToast('Scoring config saved.', 'success')
      setLegacySourceDetected(false)
    } finally {
      setSaving(false)
    }
  }

  async function saveSelectedModelSettings() {
    if (!selectedScoringModelId) return

    setModelSaving(true)
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/scoring-models/${selectedScoringModelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedModelName,
          mode: selectedModelMode,
          status: selectedModelStatus,
          isDefault: selectedModelIsDefault,
        }),
      })
      const body = (await response.json().catch(() => null)) as { ok?: boolean } | null
      if (!response.ok || !body?.ok) {
        addToast('Could not save scoring model settings.', 'error')
        return
      }

      await load(selectedScoringModelId)
      addToast('Scoring model settings saved.', 'success')
    } finally {
      setModelSaving(false)
    }
  }

  async function createScoringModel() {
    const trimmedName = newModelName.trim()
    if (!trimmedName) {
      addToast('Enter a name for the new scoring model.', 'error')
      return
    }

    setCreatingModel(true)
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/scoring-models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          mode: newModelMode,
          cloneFromModelId: selectedScoringModelId || null,
          status: 'draft',
          isDefault: false,
        }),
      })
      const body = (await response.json().catch(() => null)) as {
        ok?: boolean
        scoringModel?: { id: string }
      } | null
      if (!response.ok || !body?.ok || !body.scoringModel?.id) {
        addToast('Could not create scoring model.', 'error')
        return
      }

      setNewModelName('')
      setNewModelMode(selectedModelMode)
      setSelectedScoringModelId(body.scoringModel.id)
      await load(body.scoringModel.id)
      addToast('Scoring model created.', 'success')
    } finally {
      setCreatingModel(false)
    }
  }

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Scoring models</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Define how the shared question and competency data should be interpreted. Psychometrics stays as the advanced statistical workspace on the next tab.
            </p>
          </div>
          <div className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            {scoringModels.length} model{scoringModels.length === 1 ? '' : 's'} configured
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">Current scoring model</span>
                <select
                  value={selectedScoringModelId}
                  onChange={(event) => {
                    const nextId = event.target.value
                    setSelectedScoringModelId(nextId)
                    void load(nextId)
                  }}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {scoringModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name} ({scoringModeLabel(model.mode)}{model.is_default ? ', default' : ''})
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">Name</span>
                <input
                  value={selectedModelName}
                  onChange={(event) => setSelectedModelName(event.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">Mode</span>
                <select
                  value={selectedModelMode}
                  onChange={(event) => setSelectedModelMode(event.target.value as ScoringEngineType)}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="rule_based">Rule-based</option>
                  <option value="psychometric">Psychometric</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-zinc-600 dark:text-zinc-300">Status</span>
                <select
                  value={selectedModelStatus}
                  onChange={(event) => setSelectedModelStatus(event.target.value as 'draft' | 'published' | 'archived')}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={selectedModelIsDefault}
                  onChange={(event) => setSelectedModelIsDefault(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
                />
                Use as default scoring model
              </label>
              <button
                type="button"
                onClick={() => void saveSelectedModelSettings()}
                disabled={modelSaving || !selectedScoringModelId}
                className="rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
              >
                {modelSaving ? 'Saving model...' : 'Save model settings'}
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
            <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Create scoring model</h2>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">Name</span>
              <input
                value={newModelName}
                onChange={(event) => setNewModelName(event.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                placeholder="Executive scoring model"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-zinc-600 dark:text-zinc-300">Mode</span>
              <select
                value={newModelMode}
                onChange={(event) => setNewModelMode(event.target.value as ScoringEngineType)}
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="rule_based">Rule-based</option>
                <option value="psychometric">Psychometric</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              New models clone the currently selected model so you can branch scoring logic without duplicating questions or competencies.
            </p>
            <button
              type="button"
              onClick={() => void createScoringModel()}
              disabled={creatingModel}
              className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {creatingModel ? 'Creating...' : 'Create scoring model'}
            </button>
          </div>
        </div>

        {selectedScoringModelId ? (
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            {scoringModels
              .filter((model) => model.id === selectedScoringModelId)
              .map((model) => (
                <div key={model.id} className="contents">
                  <div key={`${model.id}-summary`} className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">{model.name}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {model.output_summary?.competency_count ?? 0} competencies • {model.output_summary?.classification_count ?? 0} classifications • {model.output_summary?.scale_points ?? 5}-point scale
                    </p>
                  </div>
                  <div key={`${model.id}-readiness`} className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Readiness</p>
                    <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{readinessLabel}</p>
                  </div>
                  <div key={`${model.id}-reports`} className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Linked report variants</p>
                    <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{selectedModelVariantCount}</p>
                  </div>
                  <div key={`${model.id}-published`} className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm dark:border-zinc-700 dark:bg-zinc-800/50">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Published variants</p>
                    <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{selectedModelPublishedVariantCount}</p>
                  </div>
                </div>
              ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Guided setup</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">1. Core scale</p>
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">Set the scale and make sure competencies reflect the question structure.</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">2. Interpretation</p>
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">Define bands, classifications, and recommendations for the selected scoring model.</p>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">3. Validate</p>
            <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">Use the advanced preview and diagnostics only after the common path is stable.</p>
          </div>
        </div>
      </section>

      {!hasQuestions || !hasCompetencies ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/40 dark:bg-amber-900/20">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-100">Builder dependency</h2>
          <p className="mt-1 text-sm text-amber-800 dark:text-amber-200">
            Finish the question and competency structure first. Scoring models work best once the question pool and competencies are stable.
          </p>
          <Link
            href={`/dashboard/assessments/${assessmentId}/questions`}
            className="mt-4 inline-flex rounded border border-amber-300 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:text-amber-100"
          >
            Open Questions
          </Link>
        </section>
      ) : null}

      {hasQuestions && hasCompetencies ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Next likely step</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Questions</p>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{questions.length} active item{questions.length === 1 ? '' : 's'}</p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Competencies</p>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">
                {config.dimensions.length} mapped {config.dimensions.length === 1 ? 'competency' : 'competencies'}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Published reports</p>
              <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-100">{selectedModelPublishedVariantCount}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {selectedModelNeedsPsychometrics ? (
              <Link
                href={`/dashboard/assessments/${assessmentId}/psychometrics`}
                className="inline-flex rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
              >
                Continue to Psychometrics
              </Link>
            ) : null}
            <Link
              href={`/dashboard/assessments/${assessmentId}/report`}
              className="inline-flex rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              Open Reports
            </Link>
            <Link
              href={`/dashboard/assessments/${assessmentId}/campaigns`}
              className="inline-flex rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700"
            >
              Open Campaigns
            </Link>
          </div>
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            {selectedModelNeedsPsychometrics
              ? 'This model expects advanced psychometric setup next. Finish traits, mappings, and norms before treating it as delivery-ready.'
              : selectedModelPublishedVariantCount > 0
                ? 'This scoring model is already connected to published report variants.'
                : 'No published reports use this scoring model yet. The next common step is to create or publish a report variant.'}
          </p>
        </section>
      ) : null}

      {legacySourceDetected ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/20">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Legacy scoring converted to the new builder
          </p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            This assessment was using the older rule-based format. The editor has generated a v2
            matrix draft from the existing rules so you can review, adjust, and save it without
            rebuilding from scratch.
          </p>
        </div>
      ) : null}

      <details className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Advanced tools
        </summary>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Import or debug scoring only when you are branching or repairing a model. Day-to-day editing should happen in the sections below.
        </p>
        <div className="mt-4">
          <ImportToolbar
            config={config}
            jsonFileInputRef={jsonFileInputRef}
            csvFileInputRef={csvFileInputRef}
            onJsonImportChange={(event) => {
              void handleJsonImportFile(event)
            }}
            onCsvImportChange={(event) => {
              void handleCsvImportFile(event)
            }}
          />
        </div>
      </details>

      <ScaleSection
        scaleConfig={scaleConfig}
        onPointsChange={handleScalePoints}
        onLabelChange={handleScaleLabel}
      />

      <CompetenciesSection
        config={config}
        questions={questions}
        scalePoints={scaleConfig.points}
      />

      <ScoreMeaningsSection
        config={config}
        scalePoints={scaleConfig.points}
        onAddBand={addBand}
        onUpdateBand={updateBand}
        onRemoveBand={removeBand}
      />

      <ClassificationsSection
        config={config}
        newClassificationLabel={newClassificationLabel}
        newRecommendation={newRecommendation}
        onNewClassificationLabelChange={setNewClassificationLabel}
        onAddClassification={addClassification}
        onDeleteClassification={deleteClassification}
        onUpdateClassification={updateClassification}
        onAddRecommendation={addRecommendation}
        onNewRecommendationChange={(classificationKey, value) =>
          setNewRecommendation((current) => ({ ...current, [classificationKey]: value }))
        }
        onUpdateRecommendation={updateRecommendation}
        onRemoveRecommendation={removeRecommendation}
        onAddPreferredSignal={addPreferredSignal}
        onUpdatePreferredSignal={updatePreferredSignal}
        onRemovePreferredSignal={removePreferredSignal}
        onAddExcludedSignal={addExcludedSignal}
        onUpdateExcludedSignal={updateExcludedSignal}
        onRemoveExcludedSignal={removeExcludedSignal}
      />

      <details className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <summary className="cursor-pointer text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Advanced matrix and diagnostics
        </summary>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Open this when you need to inspect exact band combinations, generate draft mappings, or review blocking diagnostics before publishing.
        </p>
        <div className="mt-4 space-y-10">
          <MatrixSection
            config={config}
            coverage={analysis.coverage}
            totalExactCombinations={totalExactCombinations}
            filteredExactCombinations={filteredExactCombinations}
            matrixPreview={matrixPreview}
            visibleRows={visibleRows}
            matrixPage={matrixPage}
            pageSize={MATRIX_PAGE_SIZE}
            matrixStatusFilter={matrixStatusFilter}
            matrixClassificationFilter={matrixClassificationFilter}
            matrixBandFilters={matrixBandFilters}
            lastGenerationSummary={lastGenerationSummary}
            onGenerateDraftMappings={generateDraftMappings}
            onClearGeneratedMappings={clearGeneratedMappings}
            onJumpToUnresolved={() => setMatrixStatusFilter('unmapped')}
            onMatrixStatusFilterChange={setMatrixStatusFilter}
            onMatrixClassificationFilterChange={setMatrixClassificationFilter}
            onMatrixBandFilterChange={(dimensionKey, bandKey) =>
              setMatrixBandFilters((current) => ({ ...current, [dimensionKey]: bandKey }))
            }
            onClearFilters={() => {
              setMatrixStatusFilter('all')
              setMatrixClassificationFilter('')
              setMatrixBandFilters({})
              setMatrixPage(0)
            }}
            onPreviousPage={() => setMatrixPage((current) => Math.max(0, current - 1))}
            onNextPage={() =>
              setMatrixPage((current) =>
                Math.min(Math.max(0, Math.ceil(matrixPreview.total_rows / MATRIX_PAGE_SIZE) - 1), current + 1)
              )
            }
            onSetCombinationClassification={setCombinationClassification}
          />

          <TestingSection
            config={config}
            checks={analysis.checks}
            coverage={analysis.coverage}
          />
        </div>
      </details>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            void save()
          }}
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {saving ? 'Saving…' : 'Save scoring config'}
        </button>
        {!analysis.canPublish ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            This draft can be saved, but the assessment cannot be activated until the blocking
            checks pass.
          </p>
        ) : (
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            This scoring setup is ready for activation checks.
          </p>
        )}
      </div>

      <ToastContainer toasts={toasts} />
    </div>
  )
}
