'use client'

import { useState } from 'react'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import { SubmissionReportSelector } from '@/components/reports/submission-report-selector'
import type {
  ResponseDemographicEntry,
  ResponseItemRow,
  ResponseReportOption,
  ResponseTraitScore,
} from '@/utils/services/response-experience'

type OutcomeScoreGroup = {
  title: string
  emptyMessage: string
  items: ResponseTraitScore[]
}

export type AdminResponseDetailData = {
  participantName: string
  email: string | null
  contextLine: string
  submittedLabel: string
  statusLabel: string | null
  demographics: ResponseDemographicEntry[]
  traitScores: ResponseTraitScore[]
  itemResponses: ResponseItemRow[]
  classificationLabel: string | null
  classificationDescription: string | null
  recommendations: string[]
  interpretations: Array<{ key: string; label: string; description: string }>
  outcomeGroups: OutcomeScoreGroup[]
  reportOptions: ResponseReportOption[]
}

type DetailTab = 'overview' | 'traits' | 'responses' | 'outcomes' | 'reports'
type ResponseViewTab = 'compact' | 'detail'

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={['admin-toggle-pill', active ? 'admin-toggle-pill-active' : ''].join(' ')}
    >
      {label}
    </button>
  )
}

function SectionCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <FoundationSurface className="space-y-4 p-6">
      <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">{title}</h2>
      {children}
    </FoundationSurface>
  )
}

export function AdminResponseDetail({
  data,
  initialTab = 'overview',
}: {
  data: AdminResponseDetailData
  initialTab?: DetailTab
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>(initialTab)
  const [responseViewTab, setResponseViewTab] = useState<ResponseViewTab>('compact')

  return (
    <div className="space-y-6">
      <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Response detail sections">
        {([
          ['overview', 'Overview'],
          ['traits', 'Trait scores'],
          ['responses', 'Item responses'],
          ['outcomes', 'Outcomes'],
          ['reports', 'Reports'],
        ] as const).map(([key, label]) => (
          <TabButton key={key} active={activeTab === key} label={label} onClick={() => setActiveTab(key)} />
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
          <SectionCard title="Respondent">
            <div className="space-y-2 text-sm text-[var(--admin-text-muted)]">
              <p className="text-base font-semibold text-[var(--admin-text-primary)]">{data.participantName}</p>
              <p>{data.email || 'No email stored'}</p>
              <p>{data.contextLine || 'No organisation or role stored'}</p>
              <p>{data.submittedLabel}</p>
              {data.statusLabel ? <p>Status: {data.statusLabel}</p> : null}
            </div>
          </SectionCard>

          <SectionCard title="Demographics">
            {data.demographics.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No demographic information was submitted.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.demographics.map((entry) => (
                  <div
                    key={entry.key}
                    className="rounded-[1.15rem] border border-[rgba(103,127,159,0.14)] bg-white p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
                      {entry.label}
                    </p>
                    <p className="mt-1 text-sm text-[var(--admin-text-primary)]">{entry.value}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === 'traits' ? (
        <SectionCard title="Trait scores">
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
                    <th className="pb-3">Band</th>
                  </tr>
                </thead>
                <tbody>
                  {data.traitScores.map((trait) => (
                    <tr key={trait.key} className="border-t border-[rgba(103,127,159,0.12)]">
                      <td className="py-3 text-[var(--admin-text-primary)]">{trait.label}</td>
                      <td className="py-3 text-[var(--admin-text-muted)]">{trait.groupLabel || '—'}</td>
                      <td className="py-3 text-[var(--admin-text-primary)]">{formatScore(trait.value)}</td>
                      <td className="py-3 text-[var(--admin-text-muted)]">{trait.band || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : null}

      {activeTab === 'responses' ? (
        <SectionCard title="Item responses">
          <div className="admin-toggle-group mb-4 overflow-x-auto" role="tablist" aria-label="Item response views">
            <TabButton active={responseViewTab === 'compact'} label="Compact" onClick={() => setResponseViewTab('compact')} />
            <TabButton active={responseViewTab === 'detail'} label="Question detail" onClick={() => setResponseViewTab('detail')} />
          </div>

          {data.itemResponses.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No item responses were stored for this submission.</p>
          ) : responseViewTab === 'compact' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
                  <tr>
                    <th className="pb-3">Item</th>
                    <th className="pb-3">Stored value</th>
                    <th className="pb-3">Normalized value</th>
                    <th className="pb-3">Reverse coded</th>
                  </tr>
                </thead>
                <tbody>
                  {data.itemResponses.map((item) => (
                    <tr key={item.key} className="border-t border-[rgba(103,127,159,0.12)]">
                      <td className="py-3 text-[var(--admin-text-primary)]">{item.key}</td>
                      <td className="py-3 text-[var(--admin-text-muted)]">{item.rawValue ?? '—'}</td>
                      <td className="py-3 text-[var(--admin-text-muted)]">{item.normalizedValue ?? '—'}</td>
                      <td className="py-3 text-[var(--admin-text-muted)]">{item.reverseCoded ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              {data.itemResponses.map((item) => (
                <details
                  key={item.key}
                  className="rounded-[1.25rem] border border-[rgba(103,127,159,0.14)] bg-white p-4"
                >
                  <summary className="cursor-pointer list-none text-sm font-semibold text-[var(--admin-text-primary)]">
                    {item.key}
                    <span className="ml-2 font-normal text-[var(--admin-text-muted)]">
                      {item.reverseCoded ? '· Reverse coded' : ''}
                    </span>
                  </summary>
                  <div className="mt-3 space-y-2 text-sm text-[var(--admin-text-muted)]">
                    <p className="text-[var(--admin-text-primary)]">{item.text}</p>
                    <p>Stored value: {item.rawValue ?? '—'}</p>
                    <p>Normalized value: {item.normalizedValue ?? '—'}</p>
                    <p>Mapped trait{item.mappedTraits.length === 1 ? '' : 's'}: {item.mappedTraits.join(', ') || '—'}</p>
                  </div>
                </details>
              ))}
            </div>
          )}
        </SectionCard>
      ) : null}

      {activeTab === 'outcomes' ? (
        <div className="space-y-6">
          <SectionCard title="Overall outcome">
            <div className="space-y-3 text-sm text-[var(--admin-text-muted)]">
              <p className="text-base font-semibold text-[var(--admin-text-primary)]">
                {data.classificationLabel || 'No overall classification stored'}
              </p>
              {data.classificationDescription ? <p>{data.classificationDescription}</p> : null}
            </div>
          </SectionCard>

          {data.outcomeGroups.map((group) => (
            <SectionCard key={group.title} title={group.title}>
              {group.items.length === 0 ? (
                <p className="text-sm text-[var(--admin-text-muted)]">{group.emptyMessage}</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((item) => (
                    <div
                      key={`${group.title}-${item.key}`}
                      className="rounded-[1.15rem] border border-[rgba(103,127,159,0.14)] bg-white p-4"
                    >
                      <p className="text-xs uppercase tracking-[0.08em] text-[var(--admin-text-soft)]">
                        {item.label}
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--admin-text-primary)]">
                        {formatScore(item.value)}
                      </p>
                      <p className="mt-1 text-xs text-[var(--admin-text-muted)]">{item.band || item.meaning || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          ))}

          <SectionCard title="Interpretations">
            {data.interpretations.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No interpretation text is available for this response.</p>
            ) : (
              <div className="space-y-3">
                {data.interpretations.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-[1.15rem] border border-[rgba(103,127,159,0.14)] bg-white p-4"
                  >
                    <p className="font-semibold text-[var(--admin-text-primary)]">{item.label}</p>
                    <p className="mt-1 text-sm text-[var(--admin-text-muted)]">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Recommendations">
            {data.recommendations.length === 0 ? (
              <p className="text-sm text-[var(--admin-text-muted)]">No recommendations are stored for this response.</p>
            ) : (
              <ul className="space-y-2 text-sm text-[var(--admin-text-muted)]">
                {data.recommendations.map((recommendation, index) => (
                  <li key={`${index}-${recommendation}`}>{recommendation}</li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      ) : null}

      {activeTab === 'reports' ? (
        <SectionCard title="Reports">
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
        </SectionCard>
      ) : null}
    </div>
  )
}
