import { describe, expect, it } from 'vitest'
import {
  mean,
  sampleVariance,
  sampleSD,
  sem,
  skewness,
  excessKurtosis,
  percentileLinear,
  percentilesLinear,
  pearsonR,
  correctedItemTotalR,
  cronbachAlpha,
  alphaIfItemDeleted,
  buildDimensionMatrix,
  normCdf,
  normQuantile,
  tDistributionCdf,
  tDistributionQuantile,
  meanCI95,
  cronbachAlphaCI95,
  cohenD,
  welchTTest,
  standardErrorOfMeasurement,
  ceilingFloorEffect,
} from '@/utils/stats/engine'

// ── mean ─────────────────────────────────────────────────────────────────────

describe('mean', () => {
  it('computes the arithmetic mean', () => {
    expect(mean([1, 2, 3, 4, 5])).toBe(3)
  })

  it('handles a single value', () => {
    expect(mean([7])).toBe(7)
  })

  it('returns 0 for empty array', () => {
    expect(mean([])).toBe(0)
  })

  it('handles negative values', () => {
    expect(mean([-3, -1, 1, 3])).toBe(0)
  })
})

// ── sampleVariance ────────────────────────────────────────────────────────────

describe('sampleVariance', () => {
  it('divides by n − 1', () => {
    // [1, 3]: mean=2, deviations [-1, 1], sum sq = 2, sample var = 2/1 = 2
    expect(sampleVariance([1, 3])).toBe(2)
  })

  it('matches the textbook example', () => {
    // [1, 2, 3]: mean=2, sq devs [1,0,1], sample var = 2/2 = 1
    expect(sampleVariance([1, 2, 3])).toBe(1)
  })

  it('returns null for a single value', () => {
    expect(sampleVariance([5])).toBeNull()
  })

  it('returns null for empty array', () => {
    expect(sampleVariance([])).toBeNull()
  })

  it('returns 0 for identical values', () => {
    expect(sampleVariance([4, 4, 4])).toBe(0)
  })
})

// ── sampleSD ──────────────────────────────────────────────────────────────────

describe('sampleSD', () => {
  it('returns sqrt of sample variance', () => {
    // [1, 2, 3]: sample var = 1, sd = 1
    expect(sampleSD([1, 2, 3])).toBe(1)
  })

  it('returns null for single value', () => {
    expect(sampleSD([3])).toBeNull()
  })

  it('is not equal to population SD for small samples', () => {
    // population SD of [1,2,3] = sqrt(2/3) ≈ 0.816; sample SD = 1
    const sd = sampleSD([1, 2, 3])!
    expect(sd).toBeCloseTo(1, 6)
    expect(sd).not.toBeCloseTo(0.8165, 3)
  })
})

// ── sem ───────────────────────────────────────────────────────────────────────

describe('sem', () => {
  it('equals sampleSD / sqrt(n)', () => {
    // [1,2,3]: sd=1, n=3, sem = 1/sqrt(3) ≈ 0.5774
    expect(sem([1, 2, 3])).toBeCloseTo(1 / Math.sqrt(3), 6)
  })

  it('returns null for single value', () => {
    expect(sem([9])).toBeNull()
  })
})

// ── skewness ──────────────────────────────────────────────────────────────────

describe('skewness', () => {
  it('returns 0 for a symmetric distribution', () => {
    expect(skewness([1, 2, 3, 4, 5])).toBeCloseTo(0, 10)
  })

  it('returns positive value for right-skewed data', () => {
    const g = skewness([1, 1, 1, 1, 10])!
    expect(g).toBeGreaterThan(0)
  })

  it('returns null for fewer than 3 values', () => {
    expect(skewness([1, 2])).toBeNull()
    expect(skewness([1])).toBeNull()
  })

  it('returns null for zero-variance data', () => {
    expect(skewness([3, 3, 3])).toBeNull()
  })
})

// ── excessKurtosis ────────────────────────────────────────────────────────────

describe('excessKurtosis', () => {
  it('returns null for fewer than 4 values', () => {
    expect(excessKurtosis([1, 2, 3])).toBeNull()
  })

  it('returns a finite number for valid input', () => {
    const k = excessKurtosis([1, 2, 3, 4, 5, 6])
    expect(k).not.toBeNull()
    expect(Number.isFinite(k)).toBe(true)
  })
})

// ── percentileLinear ──────────────────────────────────────────────────────────

describe('percentileLinear', () => {
  const sorted = [1, 2, 3, 4, 5]

  it('returns null for empty array', () => {
    expect(percentileLinear([], 50)).toBeNull()
  })

  it('returns null for p outside [0, 100]', () => {
    expect(percentileLinear(sorted, -1)).toBeNull()
    expect(percentileLinear(sorted, 101)).toBeNull()
  })

  it('p0 returns the minimum', () => {
    expect(percentileLinear(sorted, 0)).toBe(1)
  })

  it('p100 returns the maximum', () => {
    expect(percentileLinear(sorted, 100)).toBe(5)
  })

  it('p50 returns the median exactly for odd-length arrays', () => {
    expect(percentileLinear(sorted, 50)).toBe(3)
  })

  it('p25 falls on an exact index for length 5', () => {
    // h = 4 * 0.25 = 1 → sorted[1] = 2
    expect(percentileLinear(sorted, 25)).toBe(2)
  })

  it('p75 falls on an exact index for length 5', () => {
    // h = 4 * 0.75 = 3 → sorted[3] = 4
    expect(percentileLinear(sorted, 75)).toBe(4)
  })

  it('interpolates correctly between indices', () => {
    // h = 4 * 0.4 = 1.6 → 2 + 0.6*(3−2) = 2.6
    expect(percentileLinear(sorted, 40)).toBeCloseTo(2.6, 10)
  })

  it('handles a two-element array', () => {
    // h = 1 * 0.25 = 0.25 → 1 + 0.25*(2−1) = 1.25
    expect(percentileLinear([1, 2], 25)).toBeCloseTo(1.25, 10)
  })

  it('handles a single-element array', () => {
    expect(percentileLinear([7], 50)).toBe(7)
  })

  it('matches R type-7 for a known example', () => {
    // R: quantile(1:10, 0.3, type=7) = 3.7
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(percentileLinear(data, 30)).toBeCloseTo(3.7, 10)
  })

  it('matches R type-7 for p50 on even-length array', () => {
    // R: quantile(c(1,2,3,4), 0.5, type=7) = 2.5
    expect(percentileLinear([1, 2, 3, 4], 50)).toBeCloseTo(2.5, 10)
  })
})

// ── percentilesLinear ─────────────────────────────────────────────────────────

describe('percentilesLinear', () => {
  it('computes multiple percentiles in one call', () => {
    const result = percentilesLinear([1, 2, 3, 4, 5], [25, 50, 75])
    expect(result.get(25)).toBe(2)
    expect(result.get(50)).toBe(3)
    expect(result.get(75)).toBe(4)
  })
})

// ── pearsonR ──────────────────────────────────────────────────────────────────

describe('pearsonR', () => {
  it('returns 1 for perfectly correlated arrays', () => {
    expect(pearsonR([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 10)
  })

  it('returns −1 for perfectly anti-correlated arrays', () => {
    expect(pearsonR([1, 2, 3], [6, 4, 2])).toBeCloseTo(-1, 10)
  })

  it('returns 0 for uncorrelated arrays', () => {
    // [1,2,3] vs [2,2,2]: y has zero variance
    expect(pearsonR([1, 2, 3], [2, 2, 2])).toBeNull()
  })

  it('returns null when x has zero variance', () => {
    expect(pearsonR([3, 3, 3], [1, 2, 3])).toBeNull()
  })

  it('returns null for arrays of different lengths', () => {
    expect(pearsonR([1, 2], [1, 2, 3])).toBeNull()
  })

  it('returns null for arrays shorter than 2', () => {
    expect(pearsonR([1], [1])).toBeNull()
  })

  it('computes a known value', () => {
    // x=[1,2,3,4,5], y=[2,4,5,4,5]
    // mx=3, my=4; num=6; dx²=10; dy²=6 → r = 6/√60 ≈ 0.7746
    const r = pearsonR([1, 2, 3, 4, 5], [2, 4, 5, 4, 5])!
    expect(r).toBeCloseTo(6 / Math.sqrt(60), 10)
  })
})

// ── correctedItemTotalR ───────────────────────────────────────────────────────

describe('correctedItemTotalR', () => {
  it('returns null when fewer than 2 items in matrix', () => {
    expect(correctedItemTotalR(0, [[1, 2, 3]])).toBeNull()
  })

  it('returns null when fewer than 3 respondents', () => {
    expect(correctedItemTotalR(0, [[1, 2], [3, 4]])).toBeNull()
  })

  it('correlates item against rest, not against total', () => {
    // 2 items, identical: item 0 vs rest (item 1) = pearsonR(x, x) = 1
    const matrix = [
      [1, 2, 3, 4, 5],
      [1, 2, 3, 4, 5],
    ]
    expect(correctedItemTotalR(0, matrix)).toBeCloseTo(1, 10)
  })

  it('produces a lower value than uncorrected for a realistic case', () => {
    // 3 items, item 0 = [1,2,3,4,5], item 1 = [2,3,4,5,1], item 2 = [3,4,5,1,2]
    const matrix = [
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5, 1],
      [3, 4, 5, 1, 2],
    ]
    const citc = correctedItemTotalR(0, matrix)!
    // Uncorrected: correlate item 0 against total (sum of all 3)
    const totals = [6, 9, 12, 10, 8]
    const uncorrected = pearsonR([1, 2, 3, 4, 5], totals)!
    // CITC should differ from uncorrected (it uses rest scores, not total)
    expect(citc).not.toBeCloseTo(uncorrected, 2)
  })

  it('CITC is bounded between −1 and 1', () => {
    const matrix = [
      [1, 3, 2, 5, 4],
      [2, 4, 3, 1, 5],
      [5, 2, 4, 3, 1],
    ]
    for (let i = 0; i < matrix.length; i++) {
      const r = correctedItemTotalR(i, matrix)
      if (r !== null) {
        expect(r).toBeGreaterThanOrEqual(-1)
        expect(r).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('alphaIfItemDeleted', () => {
  it('returns null when removing an item would leave fewer than two items', () => {
    expect(alphaIfItemDeleted(0, [[1, 2, 3], [2, 3, 4]])).toBeNull()
  })

  it('returns a valid reduced-scale alpha when enough items remain', () => {
    const matrix = [
      [1, 2, 3, 4],
      [1, 2, 3, 4],
      [2, 3, 4, 5],
    ]
    const reduced = alphaIfItemDeleted(2, matrix)
    expect(reduced).not.toBeNull()
    expect(reduced).toBeGreaterThanOrEqual(0)
  })
})

// ── cronbachAlpha ─────────────────────────────────────────────────────────────

describe('cronbachAlpha', () => {
  it('returns null for fewer than 2 items', () => {
    expect(cronbachAlpha([[1, 2, 3]])).toBeNull()
  })

  it('returns null for fewer than 2 respondents', () => {
    expect(cronbachAlpha([[1], [2]])).toBeNull()
  })

  it('returns 1 for perfectly parallel items', () => {
    // All 4 items identical: alpha should be exactly 1
    // k=4, item sample var=1 each, sum=4; totals=[4,8,12], sample var=16 → alpha=(4/3)*(1-4/16)=1
    const matrix = [
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3],
      [1, 2, 3],
    ]
    expect(cronbachAlpha(matrix)).toBeCloseTo(1, 10)
  })

  it('returns null when total variance is zero (identical total scores)', () => {
    // Items [1,2] and [2,1]: totals are always 3, total var = 0
    expect(cronbachAlpha([[1, 2], [2, 1]])).toBeNull()
  })

  it('returns a value in the expected range for realistic data', () => {
    // Simulated 4-item scale, 6 respondents
    const matrix = [
      [3, 4, 5, 4, 3, 5],
      [4, 5, 5, 5, 4, 5],
      [3, 4, 4, 4, 3, 4],
      [4, 4, 5, 5, 4, 5],
    ]
    const alpha = cronbachAlpha(matrix)!
    expect(alpha).toBeGreaterThan(0)
    expect(alpha).toBeLessThanOrEqual(1)
  })

  it('is symmetric: reordering items does not change alpha', () => {
    const matrix = [
      [1, 2, 3, 4],
      [4, 3, 2, 1],
      [2, 2, 3, 3],
    ]
    const reversed = [matrix[2]!, matrix[1]!, matrix[0]!]
    const a1 = cronbachAlpha(matrix)
    const a2 = cronbachAlpha(reversed)
    if (a1 !== null && a2 !== null) {
      expect(a1).toBeCloseTo(a2, 10)
    }
  })
})

// ── normCdf ───────────────────────────────────────────────────────────────────

describe('normCdf', () => {
  it('normCdf(0) = 0.5', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6)
  })

  it('normCdf(1.96) ≈ 0.975', () => {
    expect(normCdf(1.96)).toBeCloseTo(0.975, 2)
  })

  it('normCdf(-1.96) ≈ 0.025', () => {
    expect(normCdf(-1.96)).toBeCloseTo(0.025, 2)
  })

  it('normCdf(1.645) ≈ 0.95', () => {
    expect(normCdf(1.645)).toBeCloseTo(0.95, 2)
  })

  it('is symmetric: normCdf(z) + normCdf(-z) = 1', () => {
    expect(normCdf(1.5) + normCdf(-1.5)).toBeCloseTo(1, 8)
  })

  it('approaches 1 for large positive z', () => {
    expect(normCdf(5)).toBeGreaterThan(0.999)
  })
})

// ── normQuantile ──────────────────────────────────────────────────────────────

describe('normQuantile', () => {
  it('normQuantile(0.5) = 0', () => {
    expect(normQuantile(0.5)).toBeCloseTo(0, 6)
  })

  it('normQuantile(0.975) ≈ 1.96', () => {
    expect(normQuantile(0.975)).toBeCloseTo(1.96, 1)
  })

  it('normQuantile(0.025) ≈ -1.96', () => {
    expect(normQuantile(0.025)).toBeCloseTo(-1.96, 1)
  })

  it('is inverse of normCdf: normQuantile(normCdf(x)) ≈ x', () => {
    // normCdf is accurate to ±0.0001 (A&S), so round-trip precision is ~3 decimal places
    for (const x of [-2, -1, 0, 1, 2]) {
      expect(normQuantile(normCdf(x))).toBeCloseTo(x, 2)
    }
  })

  it('returns -Infinity for p=0 and Infinity for p=1', () => {
    expect(normQuantile(0)).toBe(-Infinity)
    expect(normQuantile(1)).toBe(Infinity)
  })
})

// ── tDistributionCdf ──────────────────────────────────────────────────────────

describe('tDistributionCdf', () => {
  it('tDistributionCdf(0, df) = 0.5 for any df', () => {
    expect(tDistributionCdf(0, 5)).toBeCloseTo(0.5, 8)
    expect(tDistributionCdf(0, 30)).toBeCloseTo(0.5, 8)
  })

  it('is symmetric: CDF(t) + CDF(-t) = 1', () => {
    expect(tDistributionCdf(2, 10) + tDistributionCdf(-2, 10)).toBeCloseTo(1, 8)
  })

  it('converges to normal CDF for large df', () => {
    // t(df=1000) ≈ normal; CDF(1.96) ≈ 0.975
    expect(tDistributionCdf(1.96, 1000)).toBeCloseTo(0.975, 2)
  })

  it('has heavier tails than normal for small df', () => {
    // P(T > 1.96 | df=5) should be > P(Z > 1.96)
    const tTail = 1 - tDistributionCdf(1.96, 5)
    const normTail = 1 - 0.975
    expect(tTail).toBeGreaterThan(normTail)
  })
})

// ── tDistributionQuantile ──────────────────────────────────────────────────────

describe('tDistributionQuantile', () => {
  it('tDistributionQuantile(0.5, df) = 0', () => {
    expect(tDistributionQuantile(0.5, 10)).toBeCloseTo(0, 8)
  })

  it('is inverse of tDistributionCdf', () => {
    const t = tDistributionQuantile(0.975, 10)
    expect(tDistributionCdf(t, 10)).toBeCloseTo(0.975, 5)
  })

  it('matches known critical value: t(0.975, df=5) ≈ 2.571', () => {
    expect(tDistributionQuantile(0.975, 5)).toBeCloseTo(2.571, 2)
  })

  it('is symmetric: quantile(p) = -quantile(1-p)', () => {
    const pos = tDistributionQuantile(0.9, 8)
    const neg = tDistributionQuantile(0.1, 8)
    expect(pos).toBeCloseTo(-neg, 8)
  })
})

// ── meanCI95 ──────────────────────────────────────────────────────────────────

describe('meanCI95', () => {
  it('returns null for a single value', () => {
    expect(meanCI95([5])).toBeNull()
  })

  it('lower < mean < upper', () => {
    const ci = meanCI95([1, 2, 3, 4, 5])!
    expect(ci.lower).toBeLessThan(mean([1, 2, 3, 4, 5]))
    expect(ci.upper).toBeGreaterThan(mean([1, 2, 3, 4, 5]))
  })

  it('is symmetric around the mean', () => {
    const values = [2, 4, 4, 4, 5, 5, 7, 9]
    const m = mean(values)
    const ci = meanCI95(values)!
    expect(m - ci.lower).toBeCloseTo(ci.upper - m, 6)
  })
})

// ── cronbachAlphaCI95 ─────────────────────────────────────────────────────────

describe('cronbachAlphaCI95', () => {
  it('returns null when n < 2', () => {
    expect(cronbachAlphaCI95(0.8, 6, 1)).toBeNull()
  })

  it('returns null when k < 2', () => {
    expect(cronbachAlphaCI95(0.8, 1, 50)).toBeNull()
  })

  it('returns null when alpha out of [0, 1]', () => {
    expect(cronbachAlphaCI95(-0.1, 6, 50)).toBeNull()
    expect(cronbachAlphaCI95(1.1, 6, 50)).toBeNull()
  })

  it('lower < alpha < upper', () => {
    const ci = cronbachAlphaCI95(0.8, 6, 50)!
    expect(ci.lower).toBeLessThan(0.8)
    expect(ci.upper).toBeGreaterThan(0.8)
  })

  it('CI is plausible for alpha=0.8, k=6, n=50', () => {
    const ci = cronbachAlphaCI95(0.8, 6, 50)!
    // Expect something like [0.72, 0.87]
    expect(ci.lower).toBeGreaterThan(0.5)
    expect(ci.upper).toBeLessThan(1.0)
  })

  it('CI widens with smaller n', () => {
    const ciSmall = cronbachAlphaCI95(0.8, 6, 20)!
    const ciLarge = cronbachAlphaCI95(0.8, 6, 200)!
    const widthSmall = ciSmall.upper - ciSmall.lower
    const widthLarge = ciLarge.upper - ciLarge.lower
    expect(widthSmall).toBeGreaterThan(widthLarge)
  })
})

// ── cohenD ────────────────────────────────────────────────────────────────────

describe('cohenD', () => {
  it('returns null for groups with fewer than 2 values', () => {
    expect(cohenD([1], [1, 2, 3])).toBeNull()
    expect(cohenD([1, 2, 3], [4])).toBeNull()
  })

  it('returns null for zero pooled SD (identical values)', () => {
    expect(cohenD([2, 2, 2], [2, 2, 2])).toBeNull()
  })

  it('returns 0 for identical group means', () => {
    expect(cohenD([1, 2, 3], [1, 2, 3])).toBeCloseTo(0, 8)
  })

  it('is negated when groups are swapped', () => {
    const d = cohenD([1, 2, 3], [4, 5, 6])!
    const dRev = cohenD([4, 5, 6], [1, 2, 3])!
    expect(d).toBeCloseTo(-dRev, 8)
  })

  it('[1,2,3] vs [4,5,6]: pooledSD=1, d=-3', () => {
    expect(cohenD([1, 2, 3], [4, 5, 6])).toBeCloseTo(-3, 4)
  })
})

// ── welchTTest ────────────────────────────────────────────────────────────────

describe('welchTTest', () => {
  it('returns null when either group has fewer than 2 values', () => {
    expect(welchTTest([1], [1, 2, 3])).toBeNull()
    expect(welchTTest([1, 2, 3], [4])).toBeNull()
  })

  it('[1,2,3] vs [4,5,6]: pValue < 0.05', () => {
    const result = welchTTest([1, 2, 3], [4, 5, 6])!
    expect(result.pValue).toBeLessThan(0.05)
  })

  it('meanDiff = mean(x) - mean(y)', () => {
    const result = welchTTest([1, 2, 3], [4, 5, 6])!
    expect(result.meanDiff).toBeCloseTo(mean([1, 2, 3]) - mean([4, 5, 6]), 8)
  })

  it('ci95 contains meanDiff', () => {
    const result = welchTTest([1, 2, 3], [4, 5, 6])!
    expect(result.ci95.lower).toBeLessThan(result.meanDiff)
    expect(result.ci95.upper).toBeGreaterThan(result.meanDiff)
  })

  it('pValue is two-tailed: swapping groups gives same p', () => {
    const r1 = welchTTest([1, 2, 3], [4, 5, 6])!
    const r2 = welchTTest([4, 5, 6], [1, 2, 3])!
    expect(r1.pValue).toBeCloseTo(r2.pValue, 8)
  })

  it('equal groups: pValue should be close to 1', () => {
    const result = welchTTest([2, 3, 4, 5], [2, 3, 4, 5])!
    // Equal means → t=0 → p=1
    expect(result.pValue).toBeCloseTo(1, 4)
  })
})

// ── standardErrorOfMeasurement ────────────────────────────────────────────────

describe('standardErrorOfMeasurement', () => {
  it('SEM = SD * sqrt(1 - alpha)', () => {
    expect(standardErrorOfMeasurement(1, 0.75)).toBeCloseTo(0.5, 8)
  })

  it('SEM = 0 when alpha = 1', () => {
    expect(standardErrorOfMeasurement(1, 1)).toBeCloseTo(0, 8)
  })

  it('SEM = SD when alpha = 0', () => {
    expect(standardErrorOfMeasurement(2, 0)).toBeCloseTo(2, 8)
  })
})

// ── ceilingFloorEffect ────────────────────────────────────────────────────────

describe('ceilingFloorEffect', () => {
  it('detects ceiling when ≥15% at max', () => {
    const result = ceilingFloorEffect([5, 5, 5, 4, 5], 1, 5)
    expect(result.ceiling).toBe(true)
    expect(result.ceilingPct).toBeCloseTo(0.8, 4)
  })

  it('detects floor when ≥15% at min', () => {
    const result = ceilingFloorEffect([1, 1, 2, 3, 4], 1, 5)
    expect(result.floor).toBe(true)
  })

  it('does not flag when proportion is below threshold', () => {
    const result = ceilingFloorEffect([1, 2, 3, 4, 5, 5, 5, 5, 5, 5, 4, 3, 2, 1, 3], 1, 5)
    // 5s: 5/15 = 33% → ceiling; 1s: 2/15 = 13% → no floor
    expect(result.ceiling).toBe(true)
    expect(result.floor).toBe(false)
  })

  it('returns all-false with zero counts for empty array', () => {
    const result = ceilingFloorEffect([], 1, 5)
    expect(result.ceiling).toBe(false)
    expect(result.floor).toBe(false)
    expect(result.ceilingPct).toBe(0)
    expect(result.floorPct).toBe(0)
  })

  it('custom threshold: 0.5 requires 50%+ at the bound', () => {
    // 3/5 = 60% at max → ceiling with threshold 0.5
    const result = ceilingFloorEffect([5, 5, 5, 4, 3], 1, 5, 0.5)
    expect(result.ceiling).toBe(true)
    // 1/5 = 20% at max → no ceiling with threshold 0.5
    const result2 = ceilingFloorEffect([5, 4, 3, 2, 1], 1, 5, 0.5)
    expect(result2.ceiling).toBe(false)
  })
})

// ── buildDimensionMatrix ──────────────────────────────────────────────────────

describe('buildDimensionMatrix', () => {
  const responses = [
    { q1: 1, q2: 2, q3: 3 },
    { q1: 4, q2: 5, q3: 6 },
    { q1: 2, q2: 3, q3: 4 },
  ]

  it('builds a matrix aligned by respondent', () => {
    const m = buildDimensionMatrix(['q1', 'q2', 'q3'], responses)!
    expect(m).toHaveLength(3) // 3 items
    expect(m[0]).toEqual([1, 4, 2]) // q1 scores
    expect(m[1]).toEqual([2, 5, 3]) // q2 scores
    expect(m[2]).toEqual([3, 6, 4]) // q3 scores
  })

  it('excludes respondents who did not answer all items', () => {
    const partialResponses: Array<Record<string, number>> = [
      { q1: 1, q2: 2 },       // missing q3
      { q1: 4, q2: 5, q3: 6 },
      { q1: 2, q2: 3, q3: 4 },
    ]
    const m = buildDimensionMatrix(['q1', 'q2', 'q3'], partialResponses)!
    expect(m[0]).toEqual([4, 2]) // only complete respondents
  })

  it('returns null when fewer than 2 complete respondents', () => {
    const partialResponses: Array<Record<string, number>> = [
      { q1: 1 },
      { q2: 2 },
    ]
    expect(buildDimensionMatrix(['q1', 'q2'], partialResponses)).toBeNull()
  })

  it('returns null for empty responses', () => {
    expect(buildDimensionMatrix(['q1', 'q2'], [])).toBeNull()
  })
})
