'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useParams } from 'next/navigation'
import type { ScoringConfig } from '@/utils/assessments/types'
import { createEmptyScoringConfig, normalizeScoringConfig } from '@/utils/assessments/scoring-config'
import { ConstructSection } from './_components/construct-section'
import { CsvPreviewModal } from './_components/csv-preview-modal'
import { QuestionsToolbar } from './_components/questions-toolbar'
import { ToastContainer } from './_components/toast-container'
import {
  buildCsvImportQuestions,
  createImportedDimensions,
  downloadQuestionsCsvTemplate,
  parseQuestionsCsv,
  toKey,
  type CsvRow,
  type Question,
  type Toast,
} from './_lib/questions-editor'

type QuestionsResponse = {
  questions?: Question[]
}

type ScoringResponse = {
  scoringConfig?: ScoringConfig
}

type BulkQuestionCreateResponse = {
  ok: boolean
  questions?: Question[]
}

export default function AssessmentQuestionsPage() {
  const params = useParams<{ id: string }>()
  const assessmentId = params.id

  const [questions, setQuestions] = useState<Question[]>([])
  const [config, setConfig] = useState<ScoringConfig | null>(null)
  const [newConstructLabel, setNewConstructLabel] = useState('')
  const [addingConstruct, setAddingConstruct] = useState(false)
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const toastId = useRef(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = ++toastId.current
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
    }, 3000)
  }, [])

  useEffect(() => {
    let active = true

    async function loadEditor() {
      try {
        const [questionsResponse, scoringResponse] = await Promise.all([
          fetch(`/api/admin/assessments/${assessmentId}/questions`, { cache: 'no-store' }),
          fetch(`/api/admin/assessments/${assessmentId}/scoring`, { cache: 'no-store' }),
        ])
        if (!questionsResponse.ok || !scoringResponse.ok) {
          throw new Error('load_failed')
        }

        const questionsBody = (await questionsResponse.json()) as QuestionsResponse
        const scoringBody = (await scoringResponse.json()) as ScoringResponse
        if (!active) return

        setQuestions(questionsBody.questions ?? [])
        setConfig(normalizeScoringConfig(scoringBody.scoringConfig ?? createEmptyScoringConfig()))
      } catch {
        if (active) {
          addToast('Failed to load questions', 'error')
        }
      }
    }

    void loadEditor()

    return () => {
      active = false
    }
  }, [addToast, assessmentId])

  function handleUpdated(updated: Question) {
    setQuestions((prev) => prev.map((question) => (question.id === updated.id ? updated : question)))
  }

  function handleDeleted(id: string) {
    setQuestions((prev) => prev.filter((question) => question.id !== id))
  }

  function handleAdded(question: Question) {
    setQuestions((prev) => [...prev, question])
  }

  async function saveConfig(nextConfig: ScoringConfig) {
    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/scoring`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoringConfig: nextConfig }),
      })
      return response.ok
    } catch {
      return false
    }
  }

  async function commitConfig(nextConfig: ScoringConfig, successMessage: string, errorMessage: string) {
    const ok = await saveConfig(nextConfig)
    if (!ok) {
      addToast(errorMessage, 'error')
      return false
    }

    setConfig(nextConfig)
    addToast(successMessage, 'success')
    return true
  }

  async function handleSaveDimensionLabel(key: string, newLabel: string) {
    if (!config) return

    const nextConfig: ScoringConfig = {
      ...config,
      dimensions: config.dimensions.map((dimension) =>
        dimension.key === key ? { ...dimension, label: newLabel } : dimension
      ),
    }
    await commitConfig(nextConfig, 'Label saved', 'Failed to save label')
  }

  async function handleSaveDimensionDescription(key: string, description: string) {
    if (!config) return

    const nextConfig: ScoringConfig = {
      ...config,
      dimensions: config.dimensions.map((dimension) =>
        dimension.key === key ? { ...dimension, description: description || undefined } : dimension
      ),
    }
    await commitConfig(nextConfig, 'Description saved', 'Failed to save description')
  }

  async function handleAddConstruct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!config) return

    const label = newConstructLabel.trim()
    const key = toKey(label)
    if (!label || !key || config.dimensions.some((dimension) => dimension.key === key)) {
      return
    }

    setAddingConstruct(true)
    const nextConfig: ScoringConfig = {
      ...config,
      dimensions: [
        ...config.dimensions,
        {
          key,
          label,
          question_keys: [],
          bands: [],
        },
      ],
    }
    const ok = await commitConfig(nextConfig, 'Construct added', 'Failed to add construct')
    if (ok) {
      setNewConstructLabel('')
    }
    setAddingConstruct(false)
  }

  async function handleDeleteConstruct(key: string) {
    if (!config) return

    const hasQuestions = questions.some((question) => question.dimension === key)
    if (hasQuestions) return
    if (!confirm(`Delete construct "${key}"?`)) return

    const nextConfig: ScoringConfig = {
      ...config,
      dimensions: config.dimensions.filter((dimension) => dimension.key !== key),
    }
    await commitConfig(nextConfig, 'Construct deleted', 'Failed to delete construct')
  }

  async function handleMoveQuestion(dimensionKey: string, fromIndex: number, direction: 'up' | 'down') {
    const dimensionQuestions = questions
      .filter((question) => question.dimension === dimensionKey)
      .sort((left, right) => left.sort_order - right.sort_order)

    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    if (toIndex < 0 || toIndex >= dimensionQuestions.length) return

    const firstQuestion = dimensionQuestions[fromIndex]
    const secondQuestion = dimensionQuestions[toIndex]
    const firstSortOrder = firstQuestion.sort_order
    const secondSortOrder = secondQuestion.sort_order

    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id === firstQuestion.id) return { ...question, sort_order: secondSortOrder }
        if (question.id === secondQuestion.id) return { ...question, sort_order: firstSortOrder }
        return question
      })
    )

    try {
      const [firstResponse, secondResponse] = await Promise.all([
        fetch(`/api/admin/assessments/${assessmentId}/questions/${firstQuestion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: secondSortOrder }),
        }),
        fetch(`/api/admin/assessments/${assessmentId}/questions/${secondQuestion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: firstSortOrder }),
        }),
      ])

      if (firstResponse.ok && secondResponse.ok) {
        return
      }
    } catch {
      // handled by shared revert path below
    }

    setQuestions((prev) =>
      prev.map((question) => {
        if (question.id === firstQuestion.id) return { ...question, sort_order: firstSortOrder }
        if (question.id === secondQuestion.id) return { ...question, sort_order: secondSortOrder }
        return question
      })
    )
    addToast('Failed to reorder', 'error')
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      const text = loadEvent.target?.result as string
      setCsvRows(parseQuestionsCsv(text))
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  async function handleCsvImport() {
    if (!csvRows || !config) return

    setImporting(true)

    const nextDimensions = createImportedDimensions(csvRows, config.dimensions)
    if (nextDimensions !== config.dimensions) {
      const nextConfig: ScoringConfig = {
        ...config,
        dimensions: nextDimensions,
      }
      const configSaved = await saveConfig(nextConfig)
      if (!configSaved) {
        addToast('Import failed', 'error')
        setImporting(false)
        return
      }
      setConfig(nextConfig)
    }

    const importPayload = buildCsvImportQuestions(csvRows, questions)

    try {
      const response = await fetch(`/api/admin/assessments/${assessmentId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(importPayload),
      })
      const body = (await response.json()) as BulkQuestionCreateResponse
      if (body.ok) {
        const importedQuestions = body.questions ?? []
        setQuestions((prev) => [...prev, ...importedQuestions])
        addToast(`Imported ${importedQuestions.length} questions`, 'success')
      } else {
        addToast('Import failed', 'error')
      }
    } catch {
      addToast('Import failed', 'error')
    }

    setCsvRows(null)
    setImporting(false)
  }

  const dimensions = config?.dimensions ?? []

  return (
    <div className="space-y-6">
      <QuestionsToolbar
        questionCount={questions.length}
        newConstructLabel={newConstructLabel}
        addingConstruct={addingConstruct}
        fileInputRef={fileInputRef}
        onConstructLabelChange={setNewConstructLabel}
        onAddConstruct={handleAddConstruct}
        onDownloadTemplate={downloadQuestionsCsvTemplate}
        onFileChange={handleFileChange}
      />

      {dimensions.length === 0 && (
        <p className="text-sm text-zinc-400">No constructs yet. Add a construct above to get started.</p>
      )}

      {dimensions.map((dimension) => {
        const dimensionQuestions = questions
          .filter((question) => question.dimension === dimension.key)
          .sort((left, right) => left.sort_order - right.sort_order)

        return (
          <ConstructSection
            key={dimension.key}
            dimension={dimension}
            questions={dimensionQuestions}
            allQuestions={questions}
            assessmentId={assessmentId}
            onQuestionUpdated={handleUpdated}
            onQuestionDeleted={handleDeleted}
            onQuestionAdded={handleAdded}
            onMoveQuestion={(fromIndex, direction) => handleMoveQuestion(dimension.key, fromIndex, direction)}
            onSaveLabel={(label) => handleSaveDimensionLabel(dimension.key, label)}
            onSaveDescription={(description) => handleSaveDimensionDescription(dimension.key, description)}
            onDelete={() => handleDeleteConstruct(dimension.key)}
            addToast={addToast}
          />
        )
      })}

      {csvRows && (
        <CsvPreviewModal
          rows={csvRows}
          onConfirm={() => {
            void handleCsvImport()
          }}
          onCancel={() => setCsvRows(null)}
        />
      )}

      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <p className="text-sm text-white">Importing...</p>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </div>
  )
}
