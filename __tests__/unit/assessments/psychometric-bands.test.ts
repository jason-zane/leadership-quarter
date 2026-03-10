import { describe, expect, it } from 'vitest'
import { bandFromPercentile } from '@/utils/assessments/psychometric-bands'

describe('bandFromPercentile', () => {
  it('classifies bands at correct thresholds', () => {
    expect(bandFromPercentile(0)).toBe('low')
    expect(bandFromPercentile(33)).toBe('low')
    expect(bandFromPercentile(34)).toBe('mid')
    expect(bandFromPercentile(66)).toBe('mid')
    expect(bandFromPercentile(67)).toBe('high')
    expect(bandFromPercentile(100)).toBe('high')
    expect(bandFromPercentile(null)).toBeNull()
  })
})
