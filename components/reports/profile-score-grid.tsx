'use client'

import { formatReportScore } from '@/utils/reports/assessment-report'
import type { AssessmentReportProfileCard } from '@/utils/reports/assessment-report'

type Props = {
  title: string
  eyebrow: string
  description: string
  profiles: AssessmentReportProfileCard[]
  emptyMessage?: string | null
}

function formatScore(profile: AssessmentReportProfileCard) {
  if (profile.scoreSource === 'sten') {
    return `STEN ${profile.score}`
  }

  return `Raw ${formatReportScore(profile.score)}`
}

function formatScale(profile: AssessmentReportProfileCard) {
  if (profile.scoreSource === 'sten') {
    return '1-10'
  }

  const min = Number.isInteger(profile.scoreMin) ? profile.scoreMin.toFixed(0) : profile.scoreMin.toFixed(1)
  const max = Number.isInteger(profile.scoreMax) ? profile.scoreMax.toFixed(0) : profile.scoreMax.toFixed(1)
  return `${min}-${max}`
}

function ProfileCard({ profile }: { profile: AssessmentReportProfileCard }) {
  return (
    <article className="assessment-web-report-card assessment-web-report-stack-sm site-card-tint px-5 py-5 md:px-6 md:py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">{profile.label}</p>
          {profile.dimensionLabel && profile.level === 'trait' ? (
            <p className="mt-1 text-xs text-[var(--site-text-muted)]">{profile.dimensionLabel}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-[var(--site-text-primary)]">{formatScore(profile)}</p>
          <p className="text-[11px] text-[var(--site-text-muted)]">{formatScale(profile)}</p>
        </div>
      </div>

      {profile.description ? (
        <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{profile.description}</p>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--site-text-muted)]">
          <span>{profile.lowAnchor ? 'Lower end' : 'Low'}</span>
          <span>{profile.highAnchor ? 'Higher end' : 'High'}</span>
        </div>
        <div className="relative h-3 w-full rounded-full bg-[var(--site-border)]">
          <div
            className="absolute top-0 h-full -translate-x-1/2 rounded-full border-2 border-white bg-[var(--site-accent-strong)] shadow-sm"
            style={{
              left: `${profile.positionPercent}%`,
              width: '18px',
            }}
          />
        </div>
        <div className="grid gap-3 text-xs leading-relaxed text-[var(--site-text-body)] md:grid-cols-2">
          <p>{profile.lowAnchor ?? 'Lower observed scores tend to show a less consistent expression of this capability.'}</p>
          <p className="md:text-right">{profile.highAnchor ?? 'Higher observed scores tend to show a stronger and more consistent expression of this capability.'}</p>
        </div>
      </div>

      {profile.provisional ? (
        <p className="text-xs text-[var(--site-text-muted)]">
          Provisional raw-score view. Normed STEN scores will appear once benchmark data is available.
        </p>
      ) : null}
    </article>
  )
}

export function ProfileScoreGrid({ title, eyebrow, description, profiles, emptyMessage = null }: Props) {
  return (
    <div className="assessment-web-report-stack">
      <div className="assessment-web-report-stack-sm">
        <p className="font-eyebrow text-[11px] text-[var(--site-text-muted)]">{eyebrow}</p>
        <h2 className="font-serif text-[clamp(1.45rem,2.5vw,2rem)] leading-[1] text-[var(--site-text-primary)]">
          {title}
        </h2>
        <p className="max-w-3xl text-sm leading-relaxed text-[var(--site-text-body)]">{description}</p>
      </div>

      {profiles.length > 0 ? (
        <div className="assessment-web-report-dimension-grid">
          {profiles.map((profile) => (
            <ProfileCard key={`${profile.level}-${profile.key}`} profile={profile} />
          ))}
        </div>
      ) : emptyMessage ? (
        <div className="assessment-web-report-note px-5 py-4 text-sm text-[var(--site-text-muted)]">
          {emptyMessage}
        </div>
      ) : null}
    </div>
  )
}
