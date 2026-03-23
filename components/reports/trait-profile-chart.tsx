import { formatReportScore } from '@/utils/reports/assessment-report'
import type { AssessmentReportData } from '@/utils/reports/assessment-report'
import { normCdf } from '@/utils/stats/engine'

type TraitScore = AssessmentReportData['traitScores'][number]

type Props = {
  traitScores: TraitScore[]
}

function formatOrdinal(value: number) {
  const mod100 = value % 100
  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`
  }

  switch (value % 10) {
    case 1:
      return `${value}st`
    case 2:
      return `${value}nd`
    case 3:
      return `${value}rd`
    default:
      return `${value}th`
  }
}

/**
 * Compute a 95% true-score confidence band in percentile units.
 * SEM_z = sqrt(1 - alpha); lower/upper are normCdf(z ± 1.96 * SEM_z) * 100.
 * Returns null when insufficient data.
 */
function semBand(
  zScore: number | null,
  alpha: number | null
): { lower: number; upper: number } | null {
  if (zScore === null || alpha === null || alpha < 0 || alpha >= 1) return null
  const semZ = Math.sqrt(1 - alpha)
  const lower = Math.round(normCdf(zScore - 1.96 * semZ) * 100)
  const upper = Math.round(normCdf(zScore + 1.96 * semZ) * 100)
  return { lower: Math.max(0, lower), upper: Math.min(100, upper) }
}

function TraitBar({ trait }: { trait: TraitScore }) {
  const hasPercentile = trait.percentile !== null
  const pct = hasPercentile ? Math.max(0, Math.min(100, trait.percentile!)) : null

  // When no percentile, render raw score on 1–5 scale
  const rawPct = !hasPercentile ? Math.max(0, Math.min(100, ((trait.rawScore - 1) / 4) * 100)) : null

  const barWidth = pct ?? rawPct ?? 0

  let barColor = 'var(--site-accent-strong)'
  if (hasPercentile) {
    if (pct! >= 75) barColor = 'var(--site-accent-strong)'
    else if (pct! >= 40) barColor = 'var(--site-chart-mid)'
    else barColor = 'var(--site-chart-low)'
  }

  const band = hasPercentile ? semBand(trait.zScore, trait.alpha) : null

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[var(--site-text-primary)]">{trait.traitName}</span>
        <span className="text-[var(--site-text-muted)] tabular-nums">
          {hasPercentile ? `${formatOrdinal(pct!)} percentile` : `${formatReportScore(trait.rawScore)} / 5`}
          {band && (
            <span className="ml-1.5 text-[11px]">
              ({formatOrdinal(band.lower)}–{formatOrdinal(band.upper)})
            </span>
          )}
        </span>
      </div>
      <div className="relative h-2 w-full rounded-full bg-[var(--site-border)]">
        {/* SEM band — rendered behind the score bar */}
        {band && (
          <div
            className="absolute top-0 h-full rounded-full opacity-20"
            style={{
              left: `${band.lower}%`,
              width: `${band.upper - band.lower}%`,
              backgroundColor: barColor,
            }}
          />
        )}
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${barWidth}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

export function TraitProfileChart({ traitScores }: Props) {
  if (traitScores.length === 0) return null

  // Group by dimension
  const byDimension = new Map<string, TraitScore[]>()
  const undimensioned: TraitScore[] = []

  for (const ts of traitScores) {
    if (ts.dimensionName) {
      const list = byDimension.get(ts.dimensionName) ?? []
      list.push(ts)
      byDimension.set(ts.dimensionName, list)
    } else {
      undimensioned.push(ts)
    }
  }

  const hasNorms = traitScores.some((ts) => ts.percentile !== null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="max-w-2xl">
          <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">Benchmark comparison</p>
          <h2 className="font-serif text-[clamp(1.45rem,2.5vw,2rem)] leading-[1] text-[var(--site-text-primary)]">
            Percentile profile
          </h2>
          {hasNorms ? (
            <p className="mt-2 text-xs leading-relaxed text-[var(--site-text-muted)]">
              These bars compare your scores with the current norm group. They are a benchmark view,
              separate from the descriptor cards above.
            </p>
          ) : null}
        </div>
        {!hasNorms && (
          <p className="text-xs text-[var(--site-text-muted)] max-w-[200px] text-right">
            Benchmark norms not yet available. Showing raw scores instead.
          </p>
        )}
      </div>

      {byDimension.size > 0 && (
        <div className="space-y-6">
          {Array.from(byDimension.entries()).map(([dimension, traits]) => (
            <div key={dimension} className="assessment-web-report-trait-group">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--site-text-muted)]">
                {dimension}
              </p>
              <div className="space-y-3">
                {traits.map((trait) => (
                  <TraitBar key={trait.traitCode} trait={trait} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {undimensioned.length > 0 && (
        <div className="space-y-3">
          {undimensioned.map((trait) => (
            <TraitBar key={trait.traitCode} trait={trait} />
          ))}
        </div>
      )}

      {hasNorms && (
        <div className="flex items-center gap-4 text-xs text-[var(--site-text-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-full" style={{ backgroundColor: 'var(--site-accent-strong)' }} />
            High (75th+)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-full" style={{ backgroundColor: 'var(--site-chart-mid)' }} />
            Mid (40th–75th)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-4 rounded-full" style={{ backgroundColor: 'var(--site-chart-low)' }} />
            Lower (below 40th)
          </span>
        </div>
      )}
    </div>
  )
}
