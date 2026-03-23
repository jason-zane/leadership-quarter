export function normalizeSnapshotValue(value: unknown): unknown {
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

export function serializeSnapshot(value: unknown) {
  const serialized = JSON.stringify(normalizeSnapshotValue(value))
  return serialized ?? 'null'
}
