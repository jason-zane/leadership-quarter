'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { serializeSnapshot } from './snapshot'

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type UseAutoSaveOptions<T> = {
  data: T
  onSave: (data: T) => Promise<void>
  validate?: (data: T) => string | null
  debounceMs?: number
  enabled?: boolean
}

type UseAutoSaveReturn = {
  status: AutoSaveStatus
  error: string | null
  savedAt: string | null
  saveNow: () => Promise<void>
  markSaved: (data?: unknown) => void
  isDirty: boolean
  isSaving: boolean
}

export function useAutoSave<T>({
  data,
  onSave,
  validate,
  debounceMs = 800,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [status, setStatus] = useState<AutoSaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)

  const currentSnapshot = useMemo(() => serializeSnapshot(data), [data])
  const currentSnapshotRef = useRef(currentSnapshot)
  const dataRef = useRef(data)
  const generationRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSaveRef = useRef(onSave)
  const validateRef = useRef(validate)
  const mountedRef = useRef(true)

  useEffect(() => {
    currentSnapshotRef.current = currentSnapshot
    dataRef.current = data
  }, [currentSnapshot, data])

  useEffect(() => {
    onSaveRef.current = onSave
  }, [onSave])

  useEffect(() => {
    validateRef.current = validate
  }, [validate])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const isDirty = savedSnapshot !== null && savedSnapshot !== currentSnapshot

  const executeSave = useCallback(async () => {
    const snapshot = currentSnapshotRef.current
    const saveData = dataRef.current

    if (savedSnapshot !== null && snapshot === savedSnapshot) return

    const validationError = validateRef.current?.(saveData) ?? null
    if (validationError) {
      setStatus('error')
      setError(validationError)
      return
    }

    const generation = ++generationRef.current
    setStatus('saving')
    setError(null)

    try {
      await onSaveRef.current(saveData)

      if (!mountedRef.current) return
      if (generation !== generationRef.current) return

      setSavedSnapshot(currentSnapshotRef.current)
      setSavedAt(new Date().toLocaleTimeString())
      setStatus('saved')

      if (savedIdleTimerRef.current) clearTimeout(savedIdleTimerRef.current)
      savedIdleTimerRef.current = setTimeout(() => {
        if (mountedRef.current) setStatus('idle')
      }, 2000)
    } catch (err) {
      if (!mountedRef.current) return
      if (generation !== generationRef.current) return
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Save failed.')
    }
  }, [savedSnapshot])

  // Debounced auto-save on data changes
  useEffect(() => {
    if (savedSnapshot === null) return
    if (!enabled) return
    if (currentSnapshot === savedSnapshot) return

    const validationError = validateRef.current?.(dataRef.current) ?? null
    if (validationError) {
      setStatus('error')
      setError(validationError)
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      void executeSave()
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [currentSnapshot, savedSnapshot, enabled, debounceMs, executeSave])

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    await executeSave()
  }, [executeSave])

  const markSaved = useCallback((nextData?: unknown) => {
    const snapshot = nextData === undefined
      ? currentSnapshotRef.current
      : serializeSnapshot(nextData)
    setSavedSnapshot(snapshot)
    setError(null)
  }, [])

  // beforeunload only while saving
  useEffect(() => {
    if (status !== 'saving' || typeof window === 'undefined') return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = 'Changes are being saved.'
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [status])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (savedIdleTimerRef.current) clearTimeout(savedIdleTimerRef.current)
    }
  }, [])

  return {
    status,
    error,
    savedAt,
    saveNow,
    markSaved,
    isDirty,
    isSaving: status === 'saving',
  }
}
