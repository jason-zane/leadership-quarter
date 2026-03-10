import { Badge } from '@/components/ui/badge'
import { FoundationSurface } from '@/components/ui/foundation/surface'

type HealthCardProps = {
  score: number
  validationStage: 'pilot' | 'analysis' | 'certified' | 'review'
  itemCount: number
  alpha: number | null
  referenceGroupN: number
  lastRunDaysAgo: number | null
}

const STAGE_BADGE: Record<HealthCardProps['validationStage'], string> = {
  pilot: 'signal-grey',
  analysis: 'signal-blue',
  certified: 'signal-green',
  review: 'signal-amber',
}

const STAGE_LABEL: Record<HealthCardProps['validationStage'], string> = {
  pilot: 'Pilot',
  analysis: 'Analysis',
  certified: 'Certified',
  review: 'Review',
}

export function AssessmentHealthCard({
  score,
  validationStage,
  itemCount,
  alpha,
  referenceGroupN,
  lastRunDaysAgo,
}: HealthCardProps) {
  const scorePercent = Math.min(100, Math.max(0, score))

  return (
    <FoundationSurface tone="admin" className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--admin-text)]">Psychometric health</p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--admin-text)]">{scorePercent}%</span>
          <Badge variant={STAGE_BADGE[validationStage]}>{STAGE_LABEL[validationStage]}</Badge>
        </div>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--admin-surface-strong)]">
        <div
          className="h-full rounded-full bg-[var(--admin-accent)] transition-all"
          style={{ width: `${scorePercent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
        {itemCount} item{itemCount === 1 ? '' : 's'} mapped
        {alpha !== null ? <> &middot; Reliability &alpha; {alpha.toFixed(2)}</> : null}
        {' '}&middot; Reference group n = {referenceGroupN}
        {lastRunDaysAgo !== null ? <> &middot; Last run {lastRunDaysAgo} day{lastRunDaysAgo === 1 ? '' : 's'} ago</> : <> &middot; No run yet</>}
      </p>
    </FoundationSurface>
  )
}
