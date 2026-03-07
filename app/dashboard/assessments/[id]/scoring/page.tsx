'use client'

import { useEffect, useMemo, useRef, useState, useCallback, type ChangeEvent, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { classifyResult, getBands } from '@/utils/assessments/scoring-engine'
import { buildScoringJsonTemplate, parseScoringConfigCsv, serializeScoringConfigToCsv } from '@/utils/assessments/scoring-csv'
import {
  analyzeScoringConfig,
  buildMatrixPreviewRows,
  clearGeneratedClassificationMatrixCells,
  createEmptyScoringConfig,
  DEFAULT_SCALE_CONFIG,
  generateDraftClassificationMatrix,
  getClassificationCombinationCount,
  getDimensionBands,
  normalizeScoringConfig,
  resolveClassificationCombination,
  upgradeScoringConfigToV2,
  type MatrixDraftGenerationSummary,
} from '@/utils/assessments/scoring-config'
import type {
  ScoringBand,
  ScoringClassification,
  ScoringClassificationExclusion,
  ScoringClassificationSignal,
  ScoringConfig,
  ScoringCoverageReport,
  ScoringDimension,
} from '@/utils/assessments/types'

type Question = {
  id: string
  question_key: string
  text: string
  dimension: string
  is_reverse_coded: boolean
  sort_order: number
  is_active: boolean
}

type Toast = { id: number; message: string; type: 'success' | 'error' }
type MatrixStatusFilter = 'all' | 'manual' | 'generated' | 'unmapped'

const SCALE_POINTS = [2, 3, 4, 5, 6, 7] as const
const MATRIX_PAGE_SIZE = 100

function toKey(value: string, fallback: string) {
  const key = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return key || fallback
}

function downloadTextFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadJsonFile(value: unknown, filename: string) {
  downloadTextFile(JSON.stringify(value, null, 2), filename, 'application/json')
}

function summarizeImportErrors(errors: string[]) {
  if (errors.length === 0) return 'Import failed.'
  if (errors.length === 1) return errors[0]
  return `${errors[0]} (+${errors.length - 1} more)`
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={[
            'rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg',
            toast.type === 'success'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
              : 'bg-red-600 text-white',
          ].join(' ')}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{description}</p>
      </div>
      {children}
    </section>
  )
}

function CheckList({
  checks,
}: {
  checks: Array<{ label: string; pass: boolean; message: string }>
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="space-y-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-start gap-3">
            <span
              className={[
                'mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-semibold',
                check.pass
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
              ].join(' ')}
            >
              {check.pass ? 'OK' : '!'}
            </span>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{check.label}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{check.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function IssueList({ coverage }: { coverage: ScoringCoverageReport }) {
  if (coverage.issues.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
        Coverage is complete. Manual rows: {coverage.manual_combinations}. Generated rows: {coverage.generated_combinations}.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Manual</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{coverage.manual_combinations}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Generated</p>
          <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{coverage.generated_combinations}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-900/20">
          <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">Unresolved</p>
          <p className="mt-1 text-lg font-semibold text-amber-800 dark:text-amber-100">{coverage.unresolved_combinations}</p>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/20">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Coverage issues</p>
        <ul className="mt-2 space-y-2 text-xs text-amber-700 dark:text-amber-300">
          {coverage.issues.map((issue, index) => (
            <li key={`${issue.type}-${index}`} className="rounded-md bg-white/70 px-3 py-2 dark:bg-zinc-950/40">
              <p>{issue.message}</p>
              {issue.combination ? (
                <p className="mt-1 font-mono text-[11px] text-amber-600 dark:text-amber-400">
                  {Object.entries(issue.combination).map(([dimension, band]) => `${dimension}=${band}`).join(' · ')}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function MatrixSourceBadge({ source }: { source: MatrixStatusFilter }) {
  const className =
    source === 'manual'
      ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'
      : source === 'generated'
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200'

  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${className}`}>{source}</span>
}

function ManualScoreTester({ config }: { config: ScoringConfig }) {
  const [scores, setScores] = useState<Record<string, number>>({})
  const dimensions = config.dimensions
  const scaleMax = config.scale_config?.points ?? DEFAULT_SCALE_CONFIG.points
  const resolvedScores = useMemo(
    () =>
      Object.fromEntries(dimensions.map((dimension) => [dimension.key, scores[dimension.key] ?? Math.ceil(scaleMax / 2)])),
    [dimensions, scaleMax, scores]
  )

  const bands = useMemo(() => getBands(resolvedScores, config), [config, resolvedScores])
  const classification = useMemo(() => classifyResult(resolvedScores, config), [config, resolvedScores])

  if (dimensions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
        Add competencies before testing the scoring engine.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Manual score test</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dimensions.map((dimension) => (
          <label key={dimension.key} className="space-y-1">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{dimension.label}</span>
            <input
              type="number"
              min={1}
              max={scaleMax}
              step={0.1}
              value={resolvedScores[dimension.key] ?? ''}
              onChange={(event) =>
                setScores((current) => ({ ...current, [dimension.key]: Number(event.target.value) }))
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Band: {bands[dimension.key] || 'No match'}</p>
          </label>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Classification</p>
        <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {classification?.label ?? 'No classification matched'}
        </p>
      </div>
    </div>
  )
}

function BandProfileTester({ config }: { config: ScoringConfig }) {
  const dimensions = config.dimensions
  const [selectedBands, setSelectedBands] = useState<Record<string, string>>({})
  const resolvedBands = useMemo(
    () =>
      Object.fromEntries(
        dimensions.map((dimension) => {
          const firstBand = getDimensionBands(config, dimension)[0]
          return [dimension.key, selectedBands[dimension.key] ?? firstBand?.key ?? '']
        })
      ),
    [config, dimensions, selectedBands]
  )

  const resolution = useMemo(() => resolveClassificationCombination(config, resolvedBands), [config, resolvedBands])

  if (dimensions.length === 0) return null

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Band-profile test</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dimensions.map((dimension) => {
          const bands = getDimensionBands(config, dimension)
          return (
            <label key={dimension.key} className="space-y-1">
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">{dimension.label}</span>
              <select
                value={resolvedBands[dimension.key] ?? ''}
                onChange={(event) =>
                  setSelectedBands((current) => ({ ...current, [dimension.key]: event.target.value }))
                }
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {bands.map((band) => (
                  <option key={band.key} value={band.key}>
                    {band.label}
                  </option>
                ))}
              </select>
            </label>
          )
        })}
      </div>
      <div className="mt-4 rounded-lg bg-zinc-50 px-4 py-3 dark:bg-zinc-800/60">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Classification</p>
            <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {resolution.status === 'matched' ? resolution.classification.label : 'No classification matched'}
            </p>
          </div>
          <MatrixSourceBadge
            source={
              resolution.status === 'matched'
                ? resolution.source === 'override'
                  ? 'manual'
                  : 'generated'
                : 'unmapped'
            }
          />
        </div>
        {resolution.rationale.length ? (
          <div className="mt-3 space-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            {resolution.rationale.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ClassificationSignalEditor({
  title,
  description,
  mode,
  config,
  signals,
  onAdd,
  onChange,
  onRemove,
}: {
  title: string
  description: string
  mode: 'preferred' | 'excluded'
  config: ScoringConfig
  signals: Array<ScoringClassificationSignal | ScoringClassificationExclusion>
  onAdd: () => void
  onChange: (index: number, patch: Partial<ScoringClassificationSignal> | Partial<ScoringClassificationExclusion>) => void
  onRemove: (index: number) => void
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-200">{title}</p>
          <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">{description}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Add {mode === 'preferred' ? 'signal' : 'exclusion'}
        </button>
      </div>

      {signals.length === 0 ? (
        <p className="text-xs text-zinc-400">
          {mode === 'preferred'
            ? 'No preferred signals yet. Add the competency-band patterns that should push this classification forward.'
            : 'No exclusions yet. Add any competency-band states that should automatically disqualify this classification.'}
        </p>
      ) : null}

      {signals.map((signal, index) => {
        const dimension = config.dimensions.find((item) => item.key === signal.dimension)
        const bands = dimension ? getDimensionBands(config, dimension) : []
        return (
          <div key={`${mode}-${index}`} className="grid gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800 lg:grid-cols-[1fr_1fr_120px_auto]">
            <label className="space-y-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Competency</span>
              <select
                value={signal.dimension}
                onChange={(event) => {
                  const nextDimensionKey = event.target.value
                  const nextDimension = config.dimensions.find((item) => item.key === nextDimensionKey)
                  const nextBandKey = nextDimension ? getDimensionBands(config, nextDimension)[0]?.key ?? '' : ''
                  onChange(index, { dimension: nextDimensionKey, band_key: nextBandKey })
                }}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {config.dimensions.map((dimensionOption) => (
                  <option key={dimensionOption.key} value={dimensionOption.key}>
                    {dimensionOption.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Band</span>
              <select
                value={signal.band_key}
                onChange={(event) => onChange(index, { band_key: event.target.value })}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                {bands.map((band) => (
                  <option key={band.key} value={band.key}>
                    {band.label}
                  </option>
                ))}
              </select>
            </label>

            {mode === 'preferred' ? (
              <label className="space-y-1">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Weight</span>
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={'weight' in signal ? signal.weight : 1}
                  onChange={(event) => onChange(index, { weight: Number(event.target.value) || 1 })}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
            ) : (
              <div className="flex items-end text-[11px] text-zinc-500 dark:text-zinc-400">
                Blocks this classification when matched.
              </div>
            )}

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Remove
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

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
  const [lastGenerationSummary, setLastGenerationSummary] = useState<MatrixDraftGenerationSummary | null>(null)
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
  const totalExactCombinations = useMemo(() => getClassificationCombinationCount(config), [config])
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
        if (matrixClassificationFilter && row.classification_key !== matrixClassificationFilter) return false
        return true
      }),
    [matrixClassificationFilter, matrixPreview.rows, matrixStatusFilter]
  )

  function getDefaultSignalPlacement(currentConfig: ScoringConfig, dimensionKey?: string) {
    const dimension =
      currentConfig.dimensions.find((item) => item.key === dimensionKey) ??
      currentConfig.dimensions[0] ??
      null
    const bandKey = dimension ? getDimensionBands(currentConfig, dimension)[0]?.key ?? '' : ''
    return {
      dimensionKey: dimension?.key ?? '',
      bandKey,
    }
  }

  function handleScalePoints(points: number) {
    setConfig((current) => ({
      ...current,
      version: 2,
      scale_config: {
        points: points as NonNullable<ScoringConfig['scale_config']>['points'],
        labels: Array.from(
          { length: points },
          (_, index) => current.scale_config?.labels[index] ?? DEFAULT_SCALE_CONFIG.labels[index] ?? `Option ${index + 1}`
        ),
      },
    }))
  }

  function handleScaleLabel(index: number, value: string) {
    setConfig((current) => ({
      ...current,
      scale_config: {
        points: current.scale_config?.points ?? DEFAULT_SCALE_CONFIG.points,
        labels: Array.from(
          { length: current.scale_config?.points ?? DEFAULT_SCALE_CONFIG.points },
          (_, currentIndex) =>
            currentIndex === index
              ? value
              : current.scale_config?.labels[currentIndex] ?? DEFAULT_SCALE_CONFIG.labels[currentIndex]
        ),
      },
    }))
  }

  function updateDimensionBands(dimensionKey: string, updater: (bands: ScoringBand[]) => ScoringBand[]) {
    setConfig((current) => ({
      ...current,
      dimensions: current.dimensions.map((dimension) =>
        dimension.key === dimensionKey
          ? { ...dimension, bands: updater(getDimensionBands(current, dimension)) }
          : dimension
      ),
    }))
  }

  function addBand(dimension: ScoringDimension) {
    const bands = getDimensionBands(config, dimension)
    const fallbackIndex = bands.length + 1
    updateDimensionBands(dimension.key, (current) => [
      ...current,
      {
        key: `band_${fallbackIndex}`,
        label: `Band ${fallbackIndex}`,
        min_score: current.at(-1)?.max_score ?? 1,
        max_score: scaleConfig.points,
        meaning: '',
      },
    ])
  }

  function updateBand(dimensionKey: string, bandKey: string, patch: Partial<ScoringBand>) {
    updateDimensionBands(dimensionKey, (bands) =>
      bands.map((band) => (band.key === bandKey ? { ...band, ...patch } : band))
    )
  }

  function removeBand(dimensionKey: string, bandKey: string) {
    updateDimensionBands(dimensionKey, (bands) => bands.filter((band) => band.key !== bandKey))
  }

  function updateClassification(classificationKey: string, patch: Partial<ScoringClassification>) {
    setConfig((current) => ({
      ...current,
      classifications: current.classifications.map((classification) =>
        classification.key === classificationKey ? { ...classification, ...patch } : classification
      ),
    }))
  }

  function addClassification() {
    const label = newClassificationLabel.trim()
    if (!label) return
    const key = toKey(label, `classification_${config.classifications.length + 1}`)
    setConfig((current) => ({
      ...current,
      classifications: [
        ...current.classifications,
        {
          key,
          label,
          description: '',
          automation_rationale: '',
          conditions: [],
          recommendations: [],
          preferred_signals: [],
          excluded_signals: [],
        },
      ],
    }))
    setNewClassificationLabel('')
  }

  function deleteClassification(classificationKey: string) {
    setConfig((current) => ({
      ...current,
      classifications: current.classifications.filter((classification) => classification.key !== classificationKey),
      classification_overrides: (current.classification_overrides ?? []).filter(
        (cell) => cell.classification_key !== classificationKey
      ),
      classification_matrix: (current.classification_matrix ?? []).filter((cell) => cell.classification_key !== classificationKey),
    }))
  }

  function addRecommendation(classificationKey: string) {
    const next = (newRecommendation[classificationKey] ?? '').trim()
    if (!next) return
    setConfig((current) => ({
      ...current,
      classifications: current.classifications.map((classification) =>
        classification.key === classificationKey
          ? { ...classification, recommendations: [...classification.recommendations, next] }
          : classification
      ),
    }))
    setNewRecommendation((current) => ({ ...current, [classificationKey]: '' }))
  }

  function updateRecommendation(classificationKey: string, index: number, value: string) {
    setConfig((current) => ({
      ...current,
      classifications: current.classifications.map((classification) =>
        classification.key === classificationKey
          ? {
              ...classification,
              recommendations: classification.recommendations.map((recommendation, recommendationIndex) =>
                recommendationIndex === index ? value : recommendation
              ),
            }
          : classification
      ),
    }))
  }

  function removeRecommendation(classificationKey: string, index: number) {
    setConfig((current) => ({
      ...current,
      classifications: current.classifications.map((classification) =>
        classification.key === classificationKey
          ? {
              ...classification,
              recommendations: classification.recommendations.filter((_, recommendationIndex) => recommendationIndex !== index),
            }
          : classification
      ),
    }))
  }

  function addPreferredSignal(classificationKey: string) {
    setConfig((current) => {
      const placement = getDefaultSignalPlacement(current)
      if (!placement.dimensionKey || !placement.bandKey) return current

      return {
        ...current,
        classifications: current.classifications.map((classification) =>
          classification.key === classificationKey
            ? {
                ...classification,
                preferred_signals: [
                  ...(classification.preferred_signals ?? []),
                  { dimension: placement.dimensionKey, band_key: placement.bandKey, weight: 1 },
                ],
              }
            : classification
        ),
      }
    })
  }

  function updatePreferredSignal(classificationKey: string, index: number, patch: Partial<ScoringClassificationSignal>) {
    setConfig((current) => ({
      ...current,
      classifications: current.classifications.map((classification) => {
        if (classification.key !== classificationKey) return classification
        const signals = [...(classification.preferred_signals ?? [])]
        const existing = signals[index]
        if (!existing) return classification
        const nextDimension = patch.dimension ?? existing.dimension
        const placement = getDefaultSignalPlacement(current, nextDimension)
        signals[index] = {
          ...existing,
          ...patch,
          dimension: nextDimension,
          band_key:
            patch.dimension && patch.dimension !== existing.dimension
              ? placement.bandKey
              : patch.band_key ?? existing.band_key,
          weight: patch.weight ?? existing.weight,
        }
        return { ...classification, preferred_signals: signals }
      }),
    }))
  }

  function removePreferredSignal(classificationKey: string, index: number) {
    setConfig((current) => ({
      ...current,
      classifications: current.classifications.map((classification) =>
        classification.key === classificationKey
          ? {
              ...classification,
              preferred_signals: (classification.preferred_signals ?? []).filter((_, signalIndex) => signalIndex !== index),
            }
          : classification
      ),
    }))
  }

  function addExcludedSignal(classificationKey: string) {
    setConfig((current) => {
      const placement = getDefaultSignalPlacement(current)
      if (!placement.dimensionKey || !placement.bandKey) return current

      return {
        ...current,
        classifications: current.classifications.map((classification) =>
          classification.key === classificationKey
            ? {
                ...classification,
                excluded_signals: [
                  ...(classification.excluded_signals ?? []),
                  { dimension: placement.dimensionKey, band_key: placement.bandKey },
                ],
              }
            : classification
        ),
      }
    })
  }

  function updateExcludedSignal(classificationKey: string, index: number, patch: Partial<ScoringClassificationExclusion>) {
    setConfig((current) => ({
      ...current,
      classifications: current.classifications.map((classification) => {
        if (classification.key !== classificationKey) return classification
        const signals = [...(classification.excluded_signals ?? [])]
        const existing = signals[index]
        if (!existing) return classification
        const nextDimension = patch.dimension ?? existing.dimension
        const placement = getDefaultSignalPlacement(current, nextDimension)
        signals[index] = {
          ...existing,
          ...patch,
          dimension: nextDimension,
          band_key:
            patch.dimension && patch.dimension !== existing.dimension
              ? placement.bandKey
              : patch.band_key ?? existing.band_key,
        }
        return { ...classification, excluded_signals: signals }
      }),
    }))
  }

  function removeExcludedSignal(classificationKey: string, index: number) {
    setConfig((current) => ({
      ...current,
      classifications: current.classifications.map((classification) =>
        classification.key === classificationKey
          ? {
              ...classification,
              excluded_signals: (classification.excluded_signals ?? []).filter((_, signalIndex) => signalIndex !== index),
            }
          : classification
      ),
    }))
  }

  function setCombinationClassification(combination: Record<string, string>, classificationKey: string) {
    setConfig((current) => {
      const existingIndex = (current.classification_overrides ?? []).findIndex((cell) =>
        current.dimensions.every((dimension) => cell.combination[dimension.key] === combination[dimension.key])
      )
      const nextOverrides = [...(current.classification_overrides ?? [])]

      if (!classificationKey) {
        if (existingIndex >= 0) nextOverrides.splice(existingIndex, 1)
      } else if (existingIndex >= 0) {
        nextOverrides[existingIndex] = {
          combination,
          classification_key: classificationKey,
          source: 'manual',
        }
      } else {
        nextOverrides.push({ combination, classification_key: classificationKey, source: 'manual' })
      }

      return {
        ...current,
        classification_overrides: nextOverrides,
      }
    })
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
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Legacy scoring converted to the new builder</p>
          <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
            This assessment was using the older rule-based format. The editor has generated a v2 matrix draft from the
            existing rules so you can review, adjust, and save it without rebuilding from scratch.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => downloadJsonFile(config, 'scoring-config.json')}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Export JSON
        </button>
        <button
          type="button"
          onClick={() => downloadJsonFile(buildScoringJsonTemplate(config), 'scoring-config-template.json')}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          JSON template
        </button>
        <button
          type="button"
          onClick={() => jsonFileInputRef.current?.click()}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Import JSON
        </button>
        <button
          type="button"
          onClick={() => downloadTextFile(serializeScoringConfigToCsv(config), 'scoring-config.csv', 'text/csv')}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() =>
            downloadTextFile(
              serializeScoringConfigToCsv(config, { template: true }),
              'scoring-config-template.csv',
              'text/csv'
            )
          }
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          CSV template
        </button>
        <button
          type="button"
          onClick={() => csvFileInputRef.current?.click()}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Import CSV
        </button>
        <input ref={jsonFileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={(event) => { void handleJsonImportFile(event) }} />
        <input ref={csvFileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { void handleCsvImportFile(event) }} />
        <span className="text-xs text-zinc-400">
          JSON remains the full-fidelity format. CSV uses one combined template grouped by scale, competencies, bands, classifications, signals, and matrix rows.
        </span>
      </div>

      <SectionShell
        title="1. Scale"
        description="Set the response scale used by every question. Score-meaning bands should cover the full scale range."
      >
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Points</label>
            <select
              value={scaleConfig.points}
              onChange={(event) => handleScalePoints(Number(event.target.value))}
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              {SCALE_POINTS.map((points) => (
                <option key={points} value={points}>
                  {points}-point
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {scaleConfig.labels.map((label, index) => (
              <label key={index} className="space-y-1">
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Value {index + 1}</span>
                <input
                  value={label}
                  onChange={(event) => handleScaleLabel(index, event.target.value)}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell
        title="2. Competencies"
        description="Competencies come from the Questions tab. This section shows whether each competency has enough items and enough scoring detail."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {config.dimensions.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
              No competencies yet. Add them in the Questions tab first.
            </div>
          ) : (
            config.dimensions.map((dimension) => {
              const questionCount = questions.filter((question) => question.dimension === dimension.key && question.is_active).length
              const bands = getDimensionBands(config, dimension)
              return (
                <div key={dimension.key} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{dimension.label}</p>
                      <p className="mt-1 font-mono text-[11px] text-zinc-400">{dimension.key}</p>
                    </div>
                    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {questionCount} questions
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                      <p className="font-medium text-zinc-700 dark:text-zinc-200">Meaning bands</p>
                      <p className="mt-1">{bands.length}</p>
                    </div>
                    <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-800/50">
                      <p className="font-medium text-zinc-700 dark:text-zinc-200">Coverage</p>
                      <p className="mt-1">
                        {bands.length > 0 ? `${bands[0].min_score} to ${bands.at(-1)?.max_score ?? scaleConfig.points}` : 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </SectionShell>

      <SectionShell
        title="3. Score Meanings"
        description="For each competency, define what a score range means. These bands become the building blocks for the overall classification matrix."
      >
        <div className="space-y-4">
          {config.dimensions.map((dimension) => {
            const bands = getDimensionBands(config, dimension)
            return (
              <div key={dimension.key} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{dimension.label}</p>
                    <p className="text-xs text-zinc-400">Define what this competency score means across the full scale.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => addBand(dimension)}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Add band
                  </button>
                </div>

                <div className="space-y-3">
                  {bands.map((band, index) => (
                    <div key={band.key} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
                      <div className="grid gap-3 lg:grid-cols-[140px_1fr_120px_120px]">
                        <label className="space-y-1">
                          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Band key</span>
                          <input
                            value={band.key ?? ''}
                            onChange={(event) =>
                              updateBand(dimension.key, band.key ?? '', { key: toKey(event.target.value, `band_${index + 1}`) })
                            }
                            className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Label</span>
                          <input
                            value={band.label}
                            onChange={(event) => updateBand(dimension.key, band.key ?? '', { label: event.target.value })}
                            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Min score</span>
                          <input
                            type="number"
                            min={1}
                            max={scaleConfig.points}
                            step={0.1}
                            value={band.min_score}
                            onChange={(event) => updateBand(dimension.key, band.key ?? '', { min_score: Number(event.target.value) })}
                            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                          />
                        </label>
                        <label className="space-y-1">
                          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Max score</span>
                          <input
                            type="number"
                            min={1}
                            max={scaleConfig.points}
                            step={0.1}
                            value={band.max_score ?? scaleConfig.points}
                            onChange={(event) => updateBand(dimension.key, band.key ?? '', { max_score: Number(event.target.value) })}
                            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                          />
                        </label>
                      </div>
                      <label className="mt-3 block space-y-1">
                        <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Meaning</span>
                        <textarea
                          value={band.meaning ?? ''}
                          onChange={(event) => updateBand(dimension.key, band.key ?? '', { meaning: event.target.value })}
                          rows={2}
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                          placeholder="Explain what this score range typically reflects."
                        />
                      </label>
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => removeBand(dimension.key, band.key ?? '')}
                          className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Remove band
                        </button>
                      </div>
                    </div>
                  ))}
                  {bands.length === 0 ? (
                    <p className="text-sm text-zinc-400">No score meanings defined yet.</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </SectionShell>

      <SectionShell
        title="4. Classifications"
        description="Define the overall outcomes, their recommendations, and the signal rules the draft matrix generator should follow."
      >
        <div className="space-y-4">
          {config.classifications.map((classification) => (
            <div key={classification.key} className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{classification.label}</p>
                  <p className="mt-1 font-mono text-[11px] text-zinc-400">{classification.key}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteClassification(classification.key)}
                  className="text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Remove
                </button>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Label</span>
                  <input
                    value={classification.label}
                    onChange={(event) => updateClassification(classification.key, { label: event.target.value })}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Description</span>
                  <input
                    value={classification.description ?? ''}
                    onChange={(event) => updateClassification(classification.key, { description: event.target.value })}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                </label>
              </div>

              <label className="mt-4 block space-y-1">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Automation rationale</span>
                <textarea
                  rows={2}
                  value={classification.automation_rationale ?? ''}
                  onChange={(event) => updateClassification(classification.key, { automation_rationale: event.target.value })}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  placeholder="Explain the logic behind this classification so generated mappings stay interpretable."
                />
              </label>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <ClassificationSignalEditor
                  title="Preferred signals"
                  description="Use these to express the competency-band patterns that should pull combinations into this classification."
                  mode="preferred"
                  config={config}
                  signals={classification.preferred_signals ?? []}
                  onAdd={() => addPreferredSignal(classification.key)}
                  onChange={(index, patch) => updatePreferredSignal(classification.key, index, patch as Partial<ScoringClassificationSignal>)}
                  onRemove={(index) => removePreferredSignal(classification.key, index)}
                />
                <ClassificationSignalEditor
                  title="Exclusions"
                  description="Use these to block combinations that should never land in this classification."
                  mode="excluded"
                  config={config}
                  signals={classification.excluded_signals ?? []}
                  onAdd={() => addExcludedSignal(classification.key)}
                  onChange={(index, patch) => updateExcludedSignal(classification.key, index, patch as Partial<ScoringClassificationExclusion>)}
                  onRemove={(index) => removeExcludedSignal(classification.key, index)}
                />
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Recommendations</p>
                {classification.recommendations.map((recommendation, index) => (
                  <div key={`${classification.key}-${index}`} className="flex items-start gap-2">
                    <textarea
                      value={recommendation}
                      onChange={(event) => updateRecommendation(classification.key, index, event.target.value)}
                      rows={2}
                      className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                    <button
                      type="button"
                      onClick={() => removeRecommendation(classification.key, index)}
                      className="mt-2 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    value={newRecommendation[classification.key] ?? ''}
                    onChange={(event) =>
                      setNewRecommendation((current) => ({ ...current, [classification.key]: event.target.value }))
                    }
                    placeholder="Add recommendation"
                    className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                  />
                  <button
                    type="button"
                    onClick={() => addRecommendation(classification.key)}
                    className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={newClassificationLabel}
            onChange={(event) => setNewClassificationLabel(event.target.value)}
            placeholder="Classification label"
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="button"
            onClick={addClassification}
            disabled={!newClassificationLabel.trim()}
            className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Add classification
          </button>
        </div>
      </SectionShell>

      <SectionShell
        title="5. Classification Matrix"
        description="Exact manual overrides stay authoritative. Generated rows are a scale-safe preview of the rule engine, not the persisted source of truth."
      >
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {totalExactCombinations.toLocaleString()} exact combinations
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manual: {analysis.coverage.manual_combinations} · Generated: {analysis.coverage.generated_combinations} · Unresolved:{' '}
                {analysis.coverage.unresolved_combinations}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={generateDraftMappings}
                className="rounded-md bg-zinc-900 px-3 py-2 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Refresh preview cache
              </button>
              <button
                type="button"
                onClick={clearGeneratedMappings}
                className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Clear saved preview
              </button>
              <button
                type="button"
                onClick={() => setMatrixStatusFilter('unmapped')}
                className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Jump to unresolved
              </button>
            </div>
          </div>

          {lastGenerationSummary ? (
            <div className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200 md:grid-cols-5">
              <div>
                <p className="font-medium">Assigned</p>
                <p className="mt-1">{lastGenerationSummary.assigned}</p>
              </div>
              <div>
                <p className="font-medium">Left blank</p>
                <p className="mt-1">{lastGenerationSummary.left_blank}</p>
              </div>
              <div>
                <p className="font-medium">Changed</p>
                <p className="mt-1">{lastGenerationSummary.changed}</p>
              </div>
              <div>
                <p className="font-medium">Ambiguous</p>
                <p className="mt-1">{lastGenerationSummary.ambiguous}</p>
              </div>
              <div>
                <p className="font-medium">No match</p>
                <p className="mt-1">{lastGenerationSummary.no_match}</p>
              </div>
            </div>
          ) : null}

          {matrixPreview.grouped ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-800 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
              This slice is too large to render exactly ({filteredExactCombinations.toLocaleString()} combinations), so the matrix is showing grouped rule profiles.
              Add more band filters to drill into exact combinations before creating manual overrides.
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-300">
              This slice is exact. Changing a classification here creates or updates an exact manual override for that competency-band combination.
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-[160px_180px_repeat(auto-fit,minmax(160px,1fr))]">
            <label className="space-y-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Status</span>
              <select
                value={matrixStatusFilter}
                onChange={(event) => setMatrixStatusFilter(event.target.value as MatrixStatusFilter)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="all">All rows</option>
                <option value="manual">Manual only</option>
                <option value="generated">Generated only</option>
                <option value="unmapped">Unmapped only</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Classification</span>
              <select
                value={matrixClassificationFilter}
                onChange={(event) => setMatrixClassificationFilter(event.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              >
                <option value="">All classifications</option>
                {config.classifications.map((classification) => (
                  <option key={classification.key} value={classification.key}>
                    {classification.label}
                  </option>
                ))}
              </select>
            </label>

            {config.dimensions.map((dimension) => (
              <label key={dimension.key} className="space-y-1">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">{dimension.label}</span>
                <select
                  value={matrixBandFilters[dimension.key] ?? ''}
                  onChange={(event) =>
                    setMatrixBandFilters((current) => ({
                      ...current,
                      [dimension.key]: event.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                >
                  <option value="">All bands</option>
                  {getDimensionBands(config, dimension).map((band) => (
                    <option key={band.key} value={band.key}>
                      {band.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMatrixStatusFilter('all')
                setMatrixClassificationFilter('')
                setMatrixBandFilters({})
                setMatrixPage(0)
              }}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Clear filters
            </button>
            <span className="text-xs text-zinc-400">
              Showing {visibleRows.length} rows from {matrixPreview.total_rows.toLocaleString()} preview rows.
            </span>
          </div>

          {matrixPreview.total_rows > MATRIX_PAGE_SIZE ? (
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <button
                type="button"
                onClick={() => setMatrixPage((current) => Math.max(0, current - 1))}
                disabled={matrixPage === 0}
                className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
              >
                Previous
              </button>
              <span>
                Page {matrixPage + 1} of {Math.max(1, Math.ceil(matrixPreview.total_rows / MATRIX_PAGE_SIZE))}
              </span>
              <button
                type="button"
                onClick={() =>
                  setMatrixPage((current) =>
                    Math.min(Math.max(0, Math.ceil(matrixPreview.total_rows / MATRIX_PAGE_SIZE) - 1), current + 1)
                  )
                }
                disabled={matrixPage >= Math.ceil(matrixPreview.total_rows / MATRIX_PAGE_SIZE) - 1}
                className="rounded-md border border-zinc-300 px-3 py-1.5 font-medium text-zinc-600 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300"
              >
                Next
              </button>
            </div>
          ) : null}

          {config.dimensions.length === 0 ? (
            <p className="text-sm text-zinc-400">Add competencies and score meanings first.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-500 dark:bg-zinc-800/50 dark:text-zinc-400">
                  <tr>
                    {config.dimensions.map((dimension) => (
                      <th key={dimension.key} className="px-3 py-2 font-medium">
                        {dimension.label}
                      </th>
                    ))}
                    <th className="px-3 py-2 font-medium">Classification</th>
                    <th className="px-3 py-2 font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, index) => {
                    return (
                      <tr
                        key={row.id}
                        className={[
                          'border-t border-zinc-100 dark:border-zinc-800',
                          row.source === 'generated'
                            ? 'bg-blue-50/40 dark:bg-blue-950/10'
                            : row.source === 'unmapped'
                              ? 'bg-amber-50/40 dark:bg-amber-950/10'
                              : '',
                        ].join(' ')}
                      >
                        {config.dimensions.map((dimension) => {
                          const bandKey = row.combination[dimension.key]
                          const band = getDimensionBands(config, dimension).find((item) => item.key === bandKey)
                          return (
                            <td key={`${index}-${dimension.key}`} className="px-3 py-2 align-top">
                              <div>
                                <p className="text-sm text-zinc-900 dark:text-zinc-100">
                                  {bandKey === '*' ? 'Any' : band?.label ?? bandKey}
                                </p>
                                <p className="font-mono text-[11px] text-zinc-400">{bandKey}</p>
                              </div>
                            </td>
                          )
                        })}
                        <td className="px-3 py-2 align-top">
                          <select
                            value={row.classification_key ?? ''}
                            onChange={(event) => setCombinationClassification(row.combination, event.target.value)}
                            disabled={!row.editable}
                            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                          >
                            <option value="">Select classification</option>
                            {config.classifications.map((classification) => (
                              <option key={classification.key} value={classification.key}>
                                {classification.label}
                              </option>
                            ))}
                          </select>
                          {!row.editable ? (
                            <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                              Filter further to create an exact override from this grouped row.
                            </p>
                          ) : null}
                          {row.rationale.length ? (
                            <div className="mt-2 space-y-1 rounded-md bg-blue-50 px-3 py-2 text-[11px] text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
                              {row.rationale.map((line, rationaleIndex) => (
                                <p key={rationaleIndex}>{line}</p>
                              ))}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <MatrixSourceBadge source={row.source} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionShell>

      <SectionShell
        title="6. Testing and Coverage"
        description="Review readiness, spot gaps, and test both score inputs and band profiles before activation."
      >
        <CheckList checks={analysis.checks} />
        <IssueList coverage={analysis.coverage} />
        <div className="grid gap-4 xl:grid-cols-2">
          <ManualScoreTester config={config} />
          <BandProfileTester config={config} />
        </div>
      </SectionShell>

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
            This draft can be saved, but the assessment cannot be activated until the blocking checks pass.
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
