'use client'

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
  ScoringConfig,
  ScoringDimension,
} from '@/utils/assessments/types'

export default function AssessmentScoringPage() {
  const params = useParams<{ id: string }>()
  const assessmentId = params.id
  const [config, setConfig] = useState<ScoringConfig>(createEmptyScoringConfig())
  const [questions, setQuestions] = useState<Question[]>([])
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

  useEffect(() => {
    async function load() {
      const [scoringRes, questionsRes] = await Promise.all([
        fetch(`/api/admin/assessments/${assessmentId}/scoring`, { cache: 'no-store' }),
        fetch(`/api/admin/assessments/${assessmentId}/questions`, { cache: 'no-store' }),
      ])
      const scoringBody = (await scoringRes.json().catch(() => null)) as { scoringConfig?: unknown } | null
      const questionsBody = (await questionsRes.json().catch(() => null)) as { questions?: Question[] } | null
      const normalized = normalizeScoringConfig(scoringBody?.scoringConfig)
      setLegacySourceDetected(normalized.version !== 2)
      setConfig(normalized.version === 2 ? normalized : upgradeScoringConfigToV2(normalized))
      setQuestions(questionsBody?.questions ?? [])
    }

    void load()
  }, [assessmentId])

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
        body: JSON.stringify({ scoringConfig: config }),
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

  return (
    <div className="space-y-10">
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
