import { describe, expect, it } from 'vitest'
import {
  buildPsychometricInputHash,
  compareNormStatSet,
  comparePsychometricSessionScores,
  computeExpectedPsychometricScores,
  mergePsychometricMathStatuses,
} from '@/utils/services/psychometric-math-verification'

describe('psychometric math verification helpers', () => {
  it('builds deterministic input hashes from the current trait mapping model', () => {
    const base = {
      traitScales: [
        {
          key: 'strategic',
          items: [
            { questionKey: 'q1', weight: 1, reverseScored: false },
            { questionKey: 'q2', weight: 1, reverseScored: true },
          ],
        },
      ],
    }

    const same = buildPsychometricInputHash('assessment-1', base as never)
    const changed = buildPsychometricInputHash('assessment-1', {
      traitScales: [
        {
          key: 'strategic',
          items: [
            { questionKey: 'q1', weight: 1, reverseScored: false },
            { questionKey: 'q2', weight: 1, reverseScored: false },
          ],
        },
      ],
    } as never)

    expect(same).toBe(buildPsychometricInputHash('assessment-1', base as never))
    expect(changed).not.toBe(same)
  })

  it('recomputes expected trait and dimension scores from keyed responses', () => {
    const structure = {
      traitScales: [
        {
          key: 'strategic',
          traitId: 'trait-1',
          dimensionId: 'dim-1',
          items: [
            {
              questionKey: 'q1',
              reverseScored: false,
              weight: 1,
            },
            {
              questionKey: 'q2',
              reverseScored: true,
              weight: 2,
            },
          ],
        },
        {
          key: 'adaptive',
          traitId: 'trait-2',
          dimensionId: 'dim-1',
          items: [
            {
              questionKey: 'q3',
              reverseScored: false,
              weight: 1,
            },
          ],
        },
      ],
    }

    const result = computeExpectedPsychometricScores(structure as never, {
      q1: 5,
      q2: 1,
      q3: 3,
    })

    expect(result.traitScores.get('trait-1')).toBe(5)
    expect(result.traitScores.get('trait-2')).toBe(3)
    expect(result.dimensionScores.get('dim-1')).toBe(4)
  })

  it('compares stored session scores against recomputed expectations', () => {
    const comparison = comparePsychometricSessionScores({
      expectedTraitScores: new Map([
        ['trait-1', 4],
        ['trait-2', 3],
      ]),
      expectedDimensionScores: new Map([['dim-1', 3.5]]),
      storedTraitScores: new Map([
        ['trait-1', 4],
        ['trait-2', 2.6],
        ['trait-extra', 5],
      ]),
      storedDimensionScores: new Map(),
      tolerance: 0.05,
    })

    expect(comparison.traits.compared).toBe(2)
    expect(comparison.traits.mismatched).toBe(1)
    expect(comparison.traits.extra).toBe(1)
    expect(comparison.dimensions.missing).toBe(1)
  })

  it('detects norm-stat drift, rounding tolerance, and missing coverage', () => {
    const comparison = compareNormStatSet({
      storedStats: [
        { key: 'trait-1', mean: 2.5, sd: 1.291 },
        { key: 'trait-2', mean: 4, sd: 0.5 },
      ],
      valuesByKey: new Map([
        ['trait-1', [1, 2, 3, 4]],
        ['trait-2', [1, 1, 1]],
        ['trait-3', [5, 5]],
      ]),
      tolerance: 0.001,
    })

    expect(comparison.compared).toBe(2)
    expect(comparison.mismatched).toBe(1)
    expect(comparison.missingStored).toBe(1)
    expect(comparison.missingLive).toBe(0)
    expect(comparison.maxMeanDelta).toBeGreaterThan(0)
  })

  it('reduces verification statuses to the worst observed state', () => {
    expect(mergePsychometricMathStatuses(['pass', 'info'])).toBe('info')
    expect(mergePsychometricMathStatuses(['pass', 'warning'])).toBe('warning')
    expect(mergePsychometricMathStatuses(['pass', 'fail', 'warning'])).toBe('fail')
  })
})
