export const SAMPLE_THRESHOLDS = {
  ALPHA_MINIMUM: 50,
  ALPHA_STABLE: 200,
  EFA_MINIMUM: 100,
  EFA_STABLE: 300,
  CFA_MINIMUM: 200,
  N_TO_ITEMS_RATIO: 10,
} as const

export type SampleAdequacyType = 'alpha' | 'efa' | 'cfa'

export function sampleAdequacy(n: number, type: SampleAdequacyType): 'insufficient' | 'caution' | 'adequate' {
  switch (type) {
    case 'alpha':
      if (n < SAMPLE_THRESHOLDS.ALPHA_MINIMUM) return 'insufficient'
      if (n < SAMPLE_THRESHOLDS.ALPHA_STABLE) return 'caution'
      return 'adequate'
    case 'efa':
      if (n < SAMPLE_THRESHOLDS.EFA_MINIMUM) return 'insufficient'
      if (n < SAMPLE_THRESHOLDS.EFA_STABLE) return 'caution'
      return 'adequate'
    case 'cfa':
      if (n < SAMPLE_THRESHOLDS.CFA_MINIMUM) return 'insufficient'
      return 'adequate'
  }
}
