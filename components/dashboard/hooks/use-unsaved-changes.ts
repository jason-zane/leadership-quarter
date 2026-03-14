'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type UseUnsavedChangesOptions = {
  warnOnUnload?: boolean
  beforeUnloadMessage?: string
}

const DEFAULT_BEFORE_UNLOAD_MESSAGE = 'You have unsaved changes. Leave without saving?'

function normalizeSnapshotValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeSnapshotValue)
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, normalizeSnapshotValue(entryValue)])
    return Object.fromEntries(entries)
  }

  return value
}

function serializeSnapshot(value: unknown) {
  const serialized = JSON.stringify(normalizeSnapshotValue(value))
  return serialized ?? 'null'
}

export function useBeforeUnloadWarning(enabled: boolean, message = DEFAULT_BEFORE_UNLOAD_MESSAGE) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = message
      return message
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [enabled, message])
}

export function useUnsavedChanges<T>(value: T, options: UseUnsavedChangesOptions = {}) {
  const { warnOnUnload = true, beforeUnloadMessage = DEFAULT_BEFORE_UNLOAD_MESSAGE } = options
  const currentSnapshot = useMemo(() => serializeSnapshot(value), [value])
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null)
  const currentSnapshotRef = useRef(currentSnapshot)

  const isDirty = savedSnapshot !== null && savedSnapshot !== currentSnapshot

  useBeforeUnloadWarning(warnOnUnload && isDirty, beforeUnloadMessage)

  useEffect(() => {
    currentSnapshotRef.current = currentSnapshot
  }, [currentSnapshot])

  const markSaved = useCallback((nextValue?: T) => {
    setSavedSnapshot(nextValue === undefined ? currentSnapshotRef.current : serializeSnapshot(nextValue))
  }, [])

  return {
    isDirty,
    hasSavedSnapshot: savedSnapshot !== null,
    markSaved,
  }
}
