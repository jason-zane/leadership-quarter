'use client'

import { useState, type ReactNode } from 'react'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import { SubmissionReportSelector } from '@/components/reports/submission-report-selector'
import type {
  ResponseCompletionSummary,
  ResponseDemographicEntry,
  ResponseItemRow,
  ResponseReportOption,
  ResponseTraitScore,
} from '@/utils/services/response-experience'

type DetailTab = 'overview' | 'traits' | 'responses' | 'reports'

export type V2AdminResponseDetailData = {
  participantName: string
  email: string | null
  contextLine: string
  submittedLabel: string
  demographics: ResponseDemographicEntry[]
  completeness: ResponseCompletionSummary
  traitScores: ResponseTraitScore[]
  itemResponses: ResponseItemRow[]
  reportOptions: ResponseReportOption[]
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function DetailSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <FoundationSurface className="space-y-4 p-6">
      <div>
        <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">{title}</h2>
        {description ? <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{description}</p> : null}
      </div>
      {children}
    </FoundationSurface>
  )
}

export function V2AdminResponseDetail({
  data,
  initialTab = 'overview',
}: {
  data: V2AdminResponseDetailData
  initialTab?: DetailTab
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab)

  return (
    <div className="space-y-6">
      <FoundationSurface className="p-4">
        <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Response detail sections">
          {([
            ['overview', 'Overview'],
            ['traits', 'Trait scores'],
            ['responses', 'Item responses'],
            ['reports', 'Reports'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={['admin-toggle-chip', activeTab === key ? 'admin-toggle-chip-active' : ''].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>
      </FoundationSurface>

      {activeTab === 'overview' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <DetailSection title="Respondent">
            <div className="space-y-2 text-sm text-[var(--admin-text-muted)]">
              <p className="text-base font-semibold text-[var(--admin-text-primary)]">{data.participantName}</p>
              <p>{data.email || 'No email stored'}</p>
              <p>{data.contextLine || 'No organisation or role stored'}</p>
              <p>{data.submittedLabel}</p>
            </div>
          </DetailSection>

          <DetailSection title="Response completeness">
            <div className="space-y-3">
              <p className="text-2xl font-semibold text-[var(--admin-text-primary)]">
                {data.completeness.completionPercent}%
              </p>
              <p className="text-sm text-[var(--admin-text-muted)]">
                {data.completeness.answeredItems} of {data.completeness.totalItems} items answered
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[rgba(103,127,159,0.14)]">
                <div
                  className="h-full rounded-full bg-[var(--admin-accent)]"
                  style={{ width: `${Math.max(0, Math.min(100, data.completeness.completionPercent))}%` }}
                />
              </div>
            </div>
          </DetailSection>

          <DetailSection title="Demographics" description="Submitted demographic metadata, if any.">
            {data.demographics.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No demographic information was submitted.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.demographics.map((entry) => (
                  <div
                    key={entry.key}
                    className="rounded-[1.15rem] border border-[rgba(103,127,159,0.14)] bg-white p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">{entry.label}</p>
                    <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{entry.value}</p>
                  </div>
                ))}
              </div>
            )}
          </DetailSection>
        </div>
      ) : null}

      {activeTab === 'traits' ? (
        <DetailSection title="Trait scores" description="Neutral trait-level scoring only. Bands are intentionally not shown here.">
          {data.traitScores.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No trait-level scores are available for this response.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
                  <tr>
                    <th className="pb-3">Trait</th>
                    <th className="pb-3">Group</th>
                    <th className="pb-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {data.traitScores.map((trait) => (
                    <tr key={trait.key} className="border-t border-[rgba(103,127,159,0.12)]">
                      <td className="py-3 text-[var(--admin-text-primary)]">{trait.label}</td>
                      <td className="py-3 text-[var(--admin-text-muted)]">{trait.groupLabel || '—'}</td>
                      <td className="py-3 text-[var(--admin-text-primary)]">{formatScore(trait.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailSection>
      ) : null}

      {activeTab === 'responses' ? (
        <DetailSection title="Item responses" description="Each row shows the question text and stored response metadata inline.">
          {data.itemResponses.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No item responses were stored for this submission.</p>
          ) : (
            <div className="space-y-3">
              {data.itemResponses.map((item) => (
                <div
                  key={item.key}
                  className="rounded-[1.25rem] border border-[rgba(103,127,159,0.14)] bg-white px-5 py-4"
                >
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.7fr)_repeat(4,minmax(0,0.55fr))] lg:items-start">
                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Item</p>
                      <p className="mt-1 text-sm font-semibold text-[var(--admin-text-primary)]">{item.key}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Question</p>
                      <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{item.text}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Stored</p>
                      <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{item.rawValue ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Normalized</p>
                      <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{item.normalizedValue ?? '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Reverse</p>
                      <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{item.reverseCoded ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">Mapped traits</p>
                      <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{item.mappedTraits.join(', ') || '—'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailSection>
      ) : null}

      {activeTab === 'reports' ? (
        <DetailSection title="Reports" description="Report access from this submission. Report content is kept separate from response review.">
          {data.reportOptions.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No report options are currently available for this response.</p>
          ) : (
            <SubmissionReportSelector
              options={data.reportOptions}
              canEmail={Boolean(data.email)}
              exportClassName="foundation-btn foundation-btn-secondary foundation-btn-sm"
              emailClassName="foundation-btn foundation-btn-secondary foundation-btn-sm"
              statusClassName="text-xs text-[var(--admin-text-muted)]"
              linkClassName="foundation-btn foundation-btn-secondary foundation-btn-sm"
            />
          )}
        </DetailSection>
      ) : null}
    </div>
  )
}
