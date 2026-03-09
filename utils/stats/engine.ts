/**
 * Pure statistical functions used across analytics and norm computation.
 *
 * Conventions:
 *  - Variance / SD are *sample* estimates (divide by n − 1) throughout.
 *    For Cronbach's alpha the n − 1 cancels in the ratio, so the result is
 *    identical to the population form — but being explicit avoids confusion.
 *  - Percentile uses linear interpolation (R type 7 / numpy default / SPSS).
 *    `sorted` parameters must already be sorted ascending.
 *  - Functions return null rather than NaN when inputs are insufficient.
 *  - All inputs are assumed finite. Filter out non-finite values before calling.
 */

// ── Univariate descriptives ───────────────────────────────────────────────────

export function mean(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/**
 * Unbiased sample variance (divides by n − 1).
 * Returns null when n < 2.
 */
export function sampleVariance(values: number[]): number | null {
  if (values.length < 2) return null
  const m = mean(values)
  return values.reduce((acc, v) => acc + (v - m) ** 2, 0) / (values.length - 1)
}

/**
 * Sample standard deviation. Returns null when n < 2.
 */
export function sampleSD(values: number[]): number | null {
  const v = sampleVariance(values)
  return v === null ? null : Math.sqrt(v)
}

/**
 * Standard error of the mean. Returns null when n < 2.
 */
export function sem(values: number[]): number | null {
  const sd = sampleSD(values)
  return sd === null ? null : sd / Math.sqrt(values.length)
}

/**
 * Adjusted Fisher-Pearson skewness coefficient (matches Excel SKEW).
 * Returns null when n < 3 or SD is zero.
 */
export function skewness(values: number[]): number | null {
  const n = values.length
  if (n < 3) return null
  const m = mean(values)
  const sd = sampleSD(values)
  if (!sd || sd === 0) return null
  const s3 = values.reduce((acc, v) => acc + ((v - m) / sd) ** 3, 0)
  return (n / ((n - 1) * (n - 2))) * s3
}

/**
 * Adjusted excess kurtosis (matches Excel KURT).
 * Returns null when n < 4 or SD is zero.
 */
export function excessKurtosis(values: number[]): number | null {
  const n = values.length
  if (n < 4) return null
  const m = mean(values)
  const sd = sampleSD(values)
  if (!sd || sd === 0) return null
  const s4 = values.reduce((acc, v) => acc + ((v - m) / sd) ** 4, 0)
  return (
    ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * s4 -
    (3 * (n - 1) ** 2) / ((n - 2) * (n - 3))
  )
}

// ── Percentiles ──────────────────────────────────────────────────────────────

/**
 * Linear-interpolation percentile (R type 7 / numpy `linear` / SPSS default).
 *
 * `sorted` must already be sorted ascending.
 * Returns null for empty arrays or p outside [0, 100].
 */
export function percentileLinear(sorted: number[], p: number): number | null {
  if (sorted.length === 0 || p < 0 || p > 100) return null
  if (sorted.length === 1) return sorted[0]!
  const h = (p / 100) * (sorted.length - 1)
  const lo = Math.floor(h)
  const hi = Math.ceil(h)
  const frac = h - lo
  return sorted[lo]! + frac * (sorted[hi]! - sorted[lo]!)
}

/**
 * Compute multiple percentiles in one call. Returns a map of pct → value.
 * `sorted` must already be sorted ascending.
 */
export function percentilesLinear(
  sorted: number[],
  pcts: number[]
): Map<number, number | null> {
  const result = new Map<number, number | null>()
  for (const p of pcts) {
    result.set(p, percentileLinear(sorted, p))
  }
  return result
}

// ── Correlation ───────────────────────────────────────────────────────────────

/**
 * Pearson product-moment correlation coefficient.
 * Returns null if either array has zero variance or lengths differ.
 */
export function pearsonR(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 2) return null
  const n = x.length
  const mx = mean(x)
  const my = mean(y)
  let num = 0
  let dx2 = 0
  let dy2 = 0
  for (let i = 0; i < n; i++) {
    const dx = x[i]! - mx
    const dy = y[i]! - my
    num += dx * dy
    dx2 += dx ** 2
    dy2 += dy ** 2
  }
  if (dx2 === 0 || dy2 === 0) return null
  return num / Math.sqrt(dx2 * dy2)
}

// ── Reliability ───────────────────────────────────────────────────────────────

/**
 * Corrected item-total correlation (CITC).
 *
 * The "corrected" form correlates the item against the sum of *all other* items
 * in the scale (rest score), avoiding the inflation that arises when the item
 * is correlated against a total that includes itself.
 *
 * @param itemIndex  - Index of the target item in `allItemScores`.
 * @param allItemScores - Matrix of shape [items][respondents]. All arrays must
 *                        be the same length and already aligned by respondent.
 */
export function correctedItemTotalR(
  itemIndex: number,
  allItemScores: number[][]
): number | null {
  if (allItemScores.length < 2) return null
  const itemScores = allItemScores[itemIndex]
  if (!itemScores || itemScores.length < 3) return null

  const n = itemScores.length
  const restScores = Array.from({ length: n }, (_, j) =>
    allItemScores.reduce(
      (sum, scores, i) => (i === itemIndex ? sum : sum + (scores[j] ?? 0)),
      0
    )
  )

  return pearsonR(itemScores, restScores)
}

/**
 * Cronbach's coefficient alpha.
 *
 * `itemMatrix` is an array of per-item score arrays, shape [items][respondents].
 * All inner arrays must be the same length (aligned by respondent).
 *
 * Returns null when k < 2 or n < 2 or total variance is zero.
 *
 * Note: because both the item variances and total variance use n − 1 in the
 * denominator, the n − 1 terms cancel in the ratio — alpha is the same
 * whether you use sample or population variance. We use sampleVariance here
 * for consistency with the rest of the engine.
 */
export function cronbachAlpha(itemMatrix: number[][]): number | null {
  const k = itemMatrix.length
  if (k < 2) return null
  const n = itemMatrix[0]!.length
  if (n < 2) return null

  const itemVars = itemMatrix.map((scores) => sampleVariance(scores) ?? 0)

  const totals = Array.from({ length: n }, (_, j) =>
    itemMatrix.reduce((sum, scores) => sum + (scores[j] ?? 0), 0)
  )
  const totalVar = sampleVariance(totals)
  if (!totalVar || totalVar === 0) return null

  const sumItemVar = itemVars.reduce((a, b) => a + b, 0)
  return (k / (k - 1)) * (1 - sumItemVar / totalVar)
}

// ── Private helpers ───────────────────────────────────────────────────────────

/** Log Gamma via Lanczos approximation (g=7, accurate to ~1e-13). */
function logGamma(z: number): number {
  const g = 7
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z)
  }
  z -= 1
  let x = c[0]!
  for (let i = 1; i < g + 2; i++) x += c[i]! / (z + i)
  const t = z + g + 0.5
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
}

/**
 * Regularized incomplete beta function Ix(a, b) via Lentz's continued fraction.
 * Returns a value in [0, 1].
 */
function regularizedIncompleteBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0
  if (x >= 1) return 1
  if (x > (a + 1) / (a + b + 2)) return 1 - regularizedIncompleteBeta(1 - x, b, a)

  const lbeta = logGamma(a) + logGamma(b) - logGamma(a + b)
  const front = Math.exp(a * Math.log(x) + b * Math.log(1 - x) - lbeta) / a

  const EPS = 1e-30
  let f = 1, C = 1
  let D = 1 - (a + b) * x / (a + 1)
  if (Math.abs(D) < EPS) D = EPS
  D = 1 / D
  f = D

  for (let m = 1; m <= 200; m++) {
    // Even step
    let num = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m))
    D = 1 + num * D; if (Math.abs(D) < EPS) D = EPS
    C = 1 + num / C; if (Math.abs(C) < EPS) C = EPS
    D = 1 / D; f *= C * D
    // Odd step
    num = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1))
    D = 1 + num * D; if (Math.abs(D) < EPS) D = EPS
    C = 1 + num / C; if (Math.abs(C) < EPS) C = EPS
    D = 1 / D
    const delta = C * D
    f *= delta
    if (Math.abs(delta - 1) < 1e-10) break
  }
  return front * f
}

/** Brent's method root-finder. Assumes f(lo) and f(hi) have opposite signs. */
function brentSolve(
  f: (x: number) => number,
  lo: number,
  hi: number,
  tol = 1e-10,
  maxIter = 200
): number {
  let a = lo, b = hi, fa = f(a), fb = f(b)
  if (fa * fb > 0) return (a + b) / 2
  let c = a, fc = fa, d = b - a, e = d
  for (let i = 0; i < maxIter; i++) {
    if (fb * fc > 0) { c = a; fc = fa; d = e = b - a }
    if (Math.abs(fc) < Math.abs(fb)) {
      a = b; b = c; c = a; fa = fb; fb = fc; fc = fa
    }
    const tol1 = 2 * Number.EPSILON * Math.abs(b) + 0.5 * tol
    const xm = 0.5 * (c - b)
    if (Math.abs(xm) <= tol1 || fb === 0) return b
    if (Math.abs(e) >= tol1 && Math.abs(fa) > Math.abs(fb)) {
      const s = fb / fa
      let p: number, q: number
      if (a === c) {
        p = 2 * xm * s; q = 1 - s
      } else {
        const q2 = fa / fc, r = fb / fc
        p = s * (2 * xm * q2 * (q2 - r) - (b - a) * (r - 1))
        q = (q2 - 1) * (r - 1) * (s - 1)
      }
      if (p > 0) q = -q; else p = -p
      if (2 * p < Math.min(3 * xm * q - Math.abs(tol1 * q), Math.abs(e * q))) {
        e = d; d = p / q
      } else { d = xm; e = d }
    } else { d = xm; e = d }
    a = b; fa = fb
    b += Math.abs(d) > tol1 ? d : (xm > 0 ? tol1 : -tol1)
    fb = f(b)
  }
  return b
}

/** Inverse regularized incomplete beta via Brent's method. */
function betaQuantile(p: number, a: number, b: number): number {
  if (p <= 0) return 0
  if (p >= 1) return 1
  return brentSolve((x) => regularizedIncompleteBeta(x, a, b) - p, 0, 1, 1e-12, 200)
}

/** F-distribution quantile (inverse CDF) via beta quantile. */
function fDistributionQuantile(p: number, d1: number, d2: number): number {
  const x = betaQuantile(p, d1 / 2, d2 / 2)
  if (x >= 1) return Infinity
  return (d2 / d1) * x / (1 - x)
}

// ── Distribution functions ────────────────────────────────────────────────────

/**
 * Normal CDF (Abramowitz & Stegun approximation, accurate to ±0.0001).
 * normCdf(0) = 0.5, normCdf(1.96) ≈ 0.975.
 */
export function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const poly =
    t * (0.319381530 +
    t * (-0.356563782 +
    t * (1.781477937 +
    t * (-1.821255978 +
    t * 1.330274429))))
  const approx = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly
  return z >= 0 ? approx : 1 - approx
}

/**
 * Normal quantile / inverse CDF (Peter Acklam's rational approximation).
 * Accurate to < 1.15e-9 for p in (0, 1). Returns ±Infinity at the bounds.
 */
export function normQuantile(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
              1.383577518672690e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
              6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
              -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.223967577442934e-1, 2.445134137142996, 3.754408661907416]
  const pLow = 0.02425
  const pHigh = 1 - pLow
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p))
    return (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
           ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
  }
  if (p <= pHigh) {
    const q = p - 0.5
    const r = q * q
    return (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q /
           (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1)
  }
  const q = Math.sqrt(-2 * Math.log(1 - p))
  return -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) /
           ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1)
}

/**
 * Student's t-distribution CDF (exact via regularized incomplete beta).
 * Works for non-integer df (Welch–Satterthwaite).
 */
export function tDistributionCdf(t: number, df: number): number {
  const x = df / (df + t * t)
  const ibeta = regularizedIncompleteBeta(x, df / 2, 0.5)
  return t >= 0 ? 1 - 0.5 * ibeta : 0.5 * ibeta
}

/**
 * Student's t-distribution quantile (inverse CDF) via Brent's method.
 * Returns the t value such that P(T ≤ t | df) = p.
 */
export function tDistributionQuantile(p: number, df: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity
  if (Math.abs(p - 0.5) < 1e-15) return 0
  if (p < 0.5) return -tDistributionQuantile(1 - p, df)
  return brentSolve((t) => tDistributionCdf(t, df) - p, 0, 1000, 1e-10, 200)
}

// ── Interval estimates ────────────────────────────────────────────────────────

/**
 * 95% confidence interval for the mean (t-based, two-sided).
 * Returns null when n < 2.
 */
export function meanCI95(values: number[]): { lower: number; upper: number } | null {
  if (values.length < 2) return null
  const m = mean(values)
  const s = sem(values)
  if (s === null) return null
  const tCrit = tDistributionQuantile(0.975, values.length - 1)
  return { lower: m - tCrit * s, upper: m + tCrit * s }
}

/**
 * Feldt (1965) 95% confidence interval for Cronbach's alpha.
 * Returns null when n < 2, k < 2, or alpha is out of [0, 1].
 *
 * @param alpha - Cronbach's alpha point estimate.
 * @param k     - Number of items.
 * @param n     - Number of respondents.
 */
export function cronbachAlphaCI95(
  alpha: number,
  k: number,
  n: number
): { lower: number; upper: number } | null {
  if (n < 2 || k < 2 || alpha < 0 || alpha > 1) return null
  const d1 = n - 1
  const d2 = (n - 1) * (k - 1)
  const fLow = fDistributionQuantile(0.025, d1, d2)
  const fHigh = fDistributionQuantile(0.975, d1, d2)
  return {
    lower: Math.max(0, 1 - (1 - alpha) * fHigh),
    upper: Math.min(1, 1 - (1 - alpha) * fLow),
  }
}

// ── Group comparison ──────────────────────────────────────────────────────────

/**
 * Cohen's d effect size (pooled-SD form).
 * Returns null when either group has < 2 values or pooled SD is zero.
 */
export function cohenD(x: number[], y: number[]): number | null {
  if (x.length < 2 || y.length < 2) return null
  const vx = sampleVariance(x), vy = sampleVariance(y)
  if (vx === null || vy === null) return null
  const nx = x.length, ny = y.length
  const pooledVar = ((nx - 1) * vx + (ny - 1) * vy) / (nx + ny - 2)
  if (pooledVar <= 0) return null
  return (mean(x) - mean(y)) / Math.sqrt(pooledVar)
}

/**
 * Welch's t-test (does not assume equal variances).
 * Returns null when either group has < 2 values.
 *
 * Result fields:
 *  - t        : test statistic
 *  - df       : Welch–Satterthwaite degrees of freedom (may be non-integer)
 *  - pValue   : two-tailed p-value
 *  - cohenD   : pooled-SD effect size
 *  - meanDiff : mean(x) − mean(y)
 *  - ci95     : 95% CI on the mean difference
 */
export function welchTTest(x: number[], y: number[]): {
  t: number
  df: number
  pValue: number
  cohenD: number
  meanDiff: number
  ci95: { lower: number; upper: number }
} | null {
  if (x.length < 2 || y.length < 2) return null
  const vx = sampleVariance(x), vy = sampleVariance(y)
  if (vx === null || vy === null) return null
  const nx = x.length, ny = y.length
  const se2x = vx / nx, se2y = vy / ny
  const seDiff = Math.sqrt(se2x + se2y)
  if (seDiff === 0) return null
  const meanDiff = mean(x) - mean(y)
  const t = meanDiff / seDiff
  const df = (se2x + se2y) ** 2 / (se2x ** 2 / (nx - 1) + se2y ** 2 / (ny - 1))
  const pValue = 2 * (1 - tDistributionCdf(Math.abs(t), df))
  const tCrit = tDistributionQuantile(0.975, df)
  return {
    t,
    df,
    pValue,
    cohenD: cohenD(x, y) ?? 0,
    meanDiff,
    ci95: { lower: meanDiff - tCrit * seDiff, upper: meanDiff + tCrit * seDiff },
  }
}

// ── Scale quality ─────────────────────────────────────────────────────────────

/**
 * Standard error of measurement: SEM = SD × √(1 − alpha).
 * Represents the expected spread of observed scores around a true score.
 */
export function standardErrorOfMeasurement(sd: number, alpha: number): number {
  return sd * Math.sqrt(1 - alpha)
}

/**
 * Detect ceiling and floor effects in a set of scores.
 * Flagged when the proportion at the scale max/min exceeds `threshold` (default 15%).
 */
export function ceilingFloorEffect(
  values: number[],
  scaleMin: number,
  scaleMax: number,
  threshold = 0.15
): { ceiling: boolean; floor: boolean; ceilingPct: number; floorPct: number } {
  if (values.length === 0) return { ceiling: false, floor: false, ceilingPct: 0, floorPct: 0 }
  const n = values.length
  const ceilingPct = values.filter((v) => v >= scaleMax).length / n
  const floorPct = values.filter((v) => v <= scaleMin).length / n
  return { ceiling: ceilingPct >= threshold, floor: floorPct >= threshold, ceilingPct, floorPct }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a dimension matrix from a collection of respondent response objects.
 *
 * Only includes respondents who answered every item in `questionKeys`.
 * Returns null if fewer than 2 respondents answered all items.
 *
 * The returned matrix has shape [items][respondents].
 */
export function buildDimensionMatrix(
  questionKeys: string[],
  responses: Array<Record<string, number>>
): number[][] | null {
  const matrix: number[][] = questionKeys.map(() => [])

  for (const resp of responses) {
    const row: number[] = []
    let complete = true
    for (const key of questionKeys) {
      const val = resp[key]
      if (typeof val !== 'number' || !Number.isFinite(val)) {
        complete = false
        break
      }
      row.push(val)
    }
    if (!complete) continue
    for (let i = 0; i < row.length; i++) {
      matrix[i]!.push(row[i]!)
    }
  }

  const n = matrix[0]?.length ?? 0
  return n >= 2 ? matrix : null
}
