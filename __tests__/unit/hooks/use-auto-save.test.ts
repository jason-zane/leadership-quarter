import { describe, it, expect } from 'vitest'
import { serializeSnapshot, normalizeSnapshotValue } from '@/components/dashboard/hooks/snapshot'

describe('snapshot utilities', () => {
  it('serializes primitive values', () => {
    expect(serializeSnapshot('hello')).toBe('"hello"')
    expect(serializeSnapshot(42)).toBe('42')
    expect(serializeSnapshot(true)).toBe('true')
    expect(serializeSnapshot(null)).toBe('null')
  })

  it('sorts object keys deterministically', () => {
    const a = serializeSnapshot({ z: 1, a: 2, m: 3 })
    const b = serializeSnapshot({ a: 2, m: 3, z: 1 })
    expect(a).toBe(b)
  })

  it('normalizes nested objects recursively', () => {
    const a = serializeSnapshot({ outer: { z: 1, a: 2 } })
    const b = serializeSnapshot({ outer: { a: 2, z: 1 } })
    expect(a).toBe(b)
  })

  it('handles arrays preserving order', () => {
    const a = serializeSnapshot([3, 1, 2])
    const b = serializeSnapshot([1, 2, 3])
    expect(a).not.toBe(b)
  })

  it('normalizes arrays of objects', () => {
    const a = serializeSnapshot([{ b: 2, a: 1 }])
    const b = serializeSnapshot([{ a: 1, b: 2 }])
    expect(a).toBe(b)
  })

  it('converts Date to ISO string', () => {
    const date = new Date('2026-03-23T12:00:00Z')
    const result = normalizeSnapshotValue(date)
    expect(result).toBe('2026-03-23T12:00:00.000Z')
  })

  it('detects differences in values', () => {
    const saved = serializeSnapshot({ name: 'old', count: 1 })
    const current = serializeSnapshot({ name: 'new', count: 1 })
    expect(saved).not.toBe(current)
  })

  it('detects no difference for equivalent objects', () => {
    const saved = serializeSnapshot({ name: 'same', items: [1, 2] })
    const current = serializeSnapshot({ items: [1, 2], name: 'same' })
    expect(saved).toBe(current)
  })

  it('handles undefined serialization', () => {
    const result = serializeSnapshot(undefined)
    expect(result).toBe('null')
  })

  it('handles empty objects and arrays', () => {
    expect(serializeSnapshot({})).toBe('{}')
    expect(serializeSnapshot([])).toBe('[]')
  })

  it('handles complex nested structures like form snapshots', () => {
    const snapshot1 = serializeSnapshot({
      runnerConfig: { title: 'Test', estimated_minutes: 10 },
      reportConfig: { template: 'default' },
      experienceConfig: { blocks: [{ id: '1', type: 'card' }] },
    })
    const snapshot2 = serializeSnapshot({
      experienceConfig: { blocks: [{ type: 'card', id: '1' }] },
      reportConfig: { template: 'default' },
      runnerConfig: { estimated_minutes: 10, title: 'Test' },
    })
    expect(snapshot1).toBe(snapshot2)
  })
})
