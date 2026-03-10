export const DEFAULT_BAND_THRESHOLDS = {
  low: { max: 33 },
  mid: { min: 34, max: 66 },
  high: { min: 67 },
} as const

export function bandFromPercentile(
  p: number | null,
  thresholds: { low: { max: number }; mid: { min: number; max: number }; high: { min: number } } = DEFAULT_BAND_THRESHOLDS
): string | null {
  if (p === null) return null
  if (p >= thresholds.high.min) return 'high'
  if (p >= thresholds.mid.min) return 'mid'
  return 'low'
}
