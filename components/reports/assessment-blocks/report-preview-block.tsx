'use client'

import type { BlockRendererProps } from '@/utils/reports/assessment-report-block-registry'
import { isValidCtaUrl, type CtaInternalDestinationKey } from '@/utils/assessments/assessment-report-template'
import { AssessmentReportHero } from '@/components/reports/assessment-report-hero'

const CTA_DESTINATIONS: Record<CtaInternalDestinationKey, { href: string; label: string }> = {
  home: { href: '/', label: 'Leadership Quarter home' },
  contact: { href: '/contact', label: 'Contact Leadership Quarter' },
  framework: { href: '/framework', label: 'Explore the framework' },
  framework_ai_readiness: { href: '/framework/lq-ai-readiness', label: 'Explore the AI framework' },
  framework_lq8: { href: '/framework/lq8', label: 'Explore the LQ8 framework' },
  capabilities: { href: '/capabilities', label: 'View capabilities' },
  capability_ai_readiness: { href: '/capabilities/ai-readiness', label: 'View AI readiness capability' },
  capability_leadership_assessment: { href: '/capabilities/leadership-assessment', label: 'View leadership assessment capability' },
  capability_executive_search: { href: '/capabilities/executive-search', label: 'View executive search capability' },
  capability_succession_strategy: { href: '/capabilities/succession-strategy', label: 'View succession strategy capability' },
  work_with_us: { href: '/work-with-us', label: 'Work with us' },
}

function gridColsClass(columns?: number): string {
  if (columns === 1) return ''
  if (columns === 3) return 'md:grid-cols-3'
  return 'md:grid-cols-2'
}

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

function ScoreBar({
  label,
  value,
  band,
  showScore = true,
  description,
  lowMeaning,
  highMeaning,
  scoreLabel,
}: {
  label: string
  value: number
  band?: string
  showScore?: boolean
  description?: string
  lowMeaning?: string
  highMeaning?: string
  scoreLabel?: string | number
}) {
  const safeValue = Math.max(0, Math.min(100, value))

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <div className="flex items-center gap-2">
          {showScore ? (
            <span className="text-sm font-semibold tabular-nums text-slate-900">{scoreLabel ?? safeValue}</span>
          ) : null}
          {band ? (
            <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-sky-700">
              {band}
            </span>
          ) : null}
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500"
          style={{ width: `${safeValue}%` }}
        />
      </div>
      {(lowMeaning || highMeaning) ? (
        <div className="flex items-start justify-between gap-4">
          <p className="max-w-[42%] text-[11px] leading-4 text-slate-400">{lowMeaning}</p>
          <p className="max-w-[42%] text-right text-[11px] leading-4 text-slate-400">{highMeaning}</p>
        </div>
      ) : null}
      {description ? (
        <p className="mt-1 text-[13px] leading-5 text-slate-500">{description}</p>
      ) : null}
    </div>
  )
}

function ScoreCard({
  label,
  value,
  band,
  description,
  showScore = true,
}: {
  label: string
  value?: number
  band?: string
  description?: string
  showScore?: boolean
}) {
  return (
    <div className="assessment-report-score-card rounded-[22px] border border-sky-100 bg-gradient-to-br from-white to-sky-50/60 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {showScore && typeof value === 'number' ? (
          <div className="text-right">
            <p className="text-xl font-semibold tabular-nums text-slate-900">{value}</p>
            {band ? <p className="text-[11px] uppercase tracking-wide text-slate-400">{band}</p> : null}
          </div>
        ) : !showScore && band ? (
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">{band}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ProfileCard({
  eyebrow,
  heading,
  description,
  secondaryDescription,
}: {
  eyebrow: string
  heading: string
  description?: string
  secondaryDescription?: string
}) {
  return (
    <div className="assessment-report-profile-card rounded-[22px] border border-sky-100 bg-gradient-to-br from-white to-sky-50/60 p-5 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>
      <h4 className="mt-2 font-serif text-xl text-slate-950">{heading}</h4>
      {description ? <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p> : null}
      {secondaryDescription ? <p className="mt-1.5 text-sm leading-6 text-slate-500">{secondaryDescription}</p> : null}
    </div>
  )
}

function LayerProfileItemCard({
  item,
  showScore,
  showBand,
  showLowHighMeaning,
  behaviourMode,
}: {
  item: BlockRendererProps['data']['items'][number]
  showScore: boolean
  showBand: boolean
  showLowHighMeaning: boolean
  behaviourMode: 'current_only' | 'low_high_only' | 'all_three' | 'none'
}) {
  return (
    <section className={joinClasses(SECTION_CLASS, 'assessment-report-section-card-score-grid')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-[clamp(1.45rem,2vw,1.85rem)] leading-[1.08] text-slate-950">{item.label}</h3>
          {item.description ? <p className="mt-2 text-[15px] leading-7 text-slate-500">{item.description}</p> : null}
        </div>
        <div className="text-right">
          {showScore ? (
            <p className="text-xl font-semibold tabular-nums text-slate-900">
              {item.metricUnavailable ? '—' : (item.value ?? '—')}
            </p>
          ) : null}
          {showBand && item.band ? <p className="text-[11px] uppercase tracking-wide text-slate-400">{item.band}</p> : null}
        </div>
      </div>
      {behaviourMode !== 'none' ? (
        <div className="mt-4 space-y-2">
          {behaviourMode === 'all_three' ? (
            <>
              {item.behaviourLow ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">Low:</span> {item.behaviourLow}</p> : null}
              {item.behaviourMid ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">Mid:</span> {item.behaviourMid}</p> : null}
              {item.behaviourHigh ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">High:</span> {item.behaviourHigh}</p> : null}
            </>
          ) : behaviourMode === 'low_high_only' ? (
            <>
              {item.behaviourLow ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">Low:</span> {item.behaviourLow}</p> : null}
              {item.behaviourHigh ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">High:</span> {item.behaviourHigh}</p> : null}
            </>
          ) : item.currentBehaviour ? (
            <p className="text-sm leading-6 text-slate-500">{item.currentBehaviour}</p>
          ) : null}
        </div>
      ) : null}
      {showLowHighMeaning && (item.lowMeaning || item.highMeaning) ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          <div className="rounded-[16px] border border-slate-200 bg-white/80 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Low score</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{item.lowMeaning ?? ''}</p>
          </div>
          <div className="rounded-[16px] border border-slate-200 bg-white/80 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">High score</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{item.highMeaning ?? ''}</p>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function BipolarBar({
  label,
  value,
  lowMeaning,
  highMeaning,
  showScore = true,
  scoreMax = 100,
}: {
  label: string
  value: number
  lowMeaning?: string
  highMeaning?: string
  showScore?: boolean
  scoreMax?: number
}) {
  const pct = Math.max(0, Math.min(100, (value / scoreMax) * 100))

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        {showScore ? (
          <span className="text-sm font-semibold tabular-nums text-slate-900">{value}</span>
        ) : null}
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-slate-900 shadow"
          style={{ left: `calc(${pct}% - 2px)` }}
        />
      </div>
      {(lowMeaning || highMeaning) ? (
        <div className="flex items-start justify-between gap-4">
          <p className="max-w-[45%] text-[12px] leading-4 text-slate-400">{lowMeaning}</p>
          <p className="max-w-[45%] text-right text-[12px] leading-4 text-slate-400">{highMeaning}</p>
        </div>
      ) : null}
    </div>
  )
}

function SectionHeader({ block }: { block: BlockRendererProps['block'] }) {
  return (
    <>
      {block.content?.eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{block.content.eyebrow}</p>
      ) : null}
      {block.content?.title ? (
        <h3 className={joinClasses(
          block.content?.eyebrow ? 'mt-2.5' : '',
          'font-serif text-[clamp(1.55rem,2.3vw,2.05rem)] leading-[1.08] text-slate-950'
        )}>
          {block.content.title}
        </h3>
      ) : null}
      {block.content?.description ? <p className="mt-2 text-[15px] leading-7 text-slate-500">{block.content.description}</p> : null}
    </>
  )
}

const SECTION_CLASS = 'assessment-report-section-card rounded-[26px] border border-sky-100 bg-gradient-to-br from-sky-50/40 via-white to-slate-50 p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]'

function resolveNarrativeField(
  field: string | undefined,
  data: BlockRendererProps['data']
) {
  if (field === 'short_description') {
    return data.derivedOutcome?.description || data.classification?.description || ''
  }
  if (field === 'full_narrative') {
    return data.derivedOutcome?.narrative || data.classification?.description || ''
  }
  if (field === 'report_summary') {
    return data.derivedOutcome?.summary || data.classification?.description || ''
  }
  return data.derivedOutcome?.label || data.classification?.label || ''
}

export function ReportPreviewBlock({ block, data }: BlockRendererProps) {
  const showScore = block.score?.show_score !== false
  const columns = block.style?.columns

  if (block.source === 'layer_profile') {
    const showBand = block.data?.show_band !== false
    const showLowHighMeaning = block.data?.show_low_high_meaning === true
    const behaviourMode = block.data?.behaviour_snapshot_mode ?? (block.data?.show_behaviour_snapshot ? 'current_only' : 'none')
    const splitItemsIntoCards = block.data?.split_items_into_cards === true

    if (splitItemsIntoCards) {
      return (
        <div className="space-y-3">
          {(block.content?.eyebrow || block.content?.title || block.content?.description) ? (
            <section className={joinClasses(SECTION_CLASS, 'assessment-report-section-card-intro')}>
              <SectionHeader block={block} />
            </section>
          ) : null}
          {data.items.map((item) => {
            if (block.format === 'bar_chart' || block.format === 'bipolar_bar') {
              const scoreMax = block.data?.metric_scale_max ?? block.score?.score_max ?? 100
              const scaledValue =
                typeof item.value === 'number' && scoreMax > 0
                  ? Math.max(0, Math.min(100, (item.value / scoreMax) * 100))
                  : 0

              return (
                <section key={item.key} className={joinClasses(SECTION_CLASS, 'assessment-report-section-card-bars')}>
                  <div className="space-y-2">
                    <ScoreBar
                      label={item.label}
                      value={scaledValue}
                      band={showBand ? item.band : undefined}
                      showScore={showScore}
                      description={item.description}
                      lowMeaning={showLowHighMeaning ? item.lowMeaning : undefined}
                      highMeaning={showLowHighMeaning ? item.highMeaning : undefined}
                      scoreLabel={item.metricUnavailable ? '—' : (item.value ?? '—')}
                    />
                    {behaviourMode !== 'none' ? (
                      behaviourMode === 'all_three' ? (
                        <div className="grid gap-2 md:grid-cols-3">
                          {item.behaviourLow ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">Low:</span> {item.behaviourLow}</p> : null}
                          {item.behaviourMid ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">Mid:</span> {item.behaviourMid}</p> : null}
                          {item.behaviourHigh ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">High:</span> {item.behaviourHigh}</p> : null}
                        </div>
                      ) : behaviourMode === 'low_high_only' ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          {item.behaviourLow ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">Low:</span> {item.behaviourLow}</p> : null}
                          {item.behaviourHigh ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">High:</span> {item.behaviourHigh}</p> : null}
                        </div>
                      ) : item.currentBehaviour ? (
                        <p className="text-sm leading-6 text-slate-500">{item.currentBehaviour}</p>
                      ) : null
                    ) : null}
                  </div>
                </section>
              )
            }

            return (
              <LayerProfileItemCard
                key={item.key}
                item={item}
                showScore={showScore}
                showBand={showBand}
                showLowHighMeaning={showLowHighMeaning}
                behaviourMode={behaviourMode}
              />
            )
          })}
        </div>
      )
    }

    if (block.format === 'bar_chart' || block.format === 'bipolar_bar') {
      const scoreMax = block.data?.metric_scale_max ?? block.score?.score_max ?? 100
      return (
        <section className={joinClasses(SECTION_CLASS, 'assessment-report-section-card-bars')}>
          <SectionHeader block={block} />
          <div className="mt-5 space-y-5">
            {data.items.map((item) => {
              const scaledValue =
                typeof item.value === 'number' && scoreMax > 0
                  ? Math.max(0, Math.min(100, (item.value / scoreMax) * 100))
                  : 0
              return (
                <div key={item.key} className="space-y-2">
                  <ScoreBar
                    label={item.label}
                    value={scaledValue}
                    band={showBand ? item.band : undefined}
                    showScore={showScore}
                    description={item.description}
                    lowMeaning={showLowHighMeaning ? item.lowMeaning : undefined}
                    highMeaning={showLowHighMeaning ? item.highMeaning : undefined}
                    scoreLabel={item.metricUnavailable ? '—' : (item.value ?? '—')}
                  />
                  {behaviourMode !== 'none' ? (
                    behaviourMode === 'all_three' ? (
                      <div className="grid gap-2 md:grid-cols-3">
                        {item.behaviourLow ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">Low:</span> {item.behaviourLow}</p> : null}
                        {item.behaviourMid ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">Mid:</span> {item.behaviourMid}</p> : null}
                        {item.behaviourHigh ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">High:</span> {item.behaviourHigh}</p> : null}
                      </div>
                    ) : behaviourMode === 'low_high_only' ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        {item.behaviourLow ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">Low:</span> {item.behaviourLow}</p> : null}
                        {item.behaviourHigh ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">High:</span> {item.behaviourHigh}</p> : null}
                      </div>
                    ) : item.currentBehaviour ? (
                      <p className="text-sm leading-6 text-slate-500">{item.currentBehaviour}</p>
                    ) : null
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>
      )
    }

    if (block.format === 'score_table') {
      return (
        <section className={joinClasses(SECTION_CLASS, 'assessment-report-section-card-table')}>
          <SectionHeader block={block} />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="pb-2 pr-4">Label</th>
                  {showScore ? <th className="pb-2 pr-4">Score</th> : null}
                  {showBand ? <th className="pb-2 pr-4">Band</th> : null}
                  <th className="pb-2 pr-4">Definition</th>
                  {showLowHighMeaning ? <th className="pb-2">Low / high meaning</th> : null}
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={item.key} className={index % 2 === 1 ? 'bg-slate-50/50' : ''}>
                    <td className="py-2 pr-4 font-medium text-slate-900">{item.label}</td>
                    {showScore ? <td className="py-2 pr-4 tabular-nums text-slate-700">{item.value ?? '-'}</td> : null}
                    {showBand ? <td className="py-2 pr-4 text-slate-700">{item.band || '-'}</td> : null}
                    <td className="py-2 pr-4 text-slate-500">{item.description ?? item.summaryDefinition ?? ''}</td>
                    {showLowHighMeaning ? (
                      <td className="py-2 text-slate-500">
                        {[item.lowMeaning, item.highMeaning].filter(Boolean).join(' / ')}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )
    }

    return (
      <section className={joinClasses(SECTION_CLASS, 'assessment-report-section-card-score-grid')}>
        <SectionHeader block={block} />
        <div className={`mt-5 grid gap-3 ${gridColsClass(columns)}`}>
          {data.items.map((item) => (
            <div
              key={item.key}
              className="assessment-report-score-card rounded-[22px] border border-sky-100 bg-gradient-to-br from-white to-sky-50/60 p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  {item.description ? <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p> : null}
                </div>
                <div className="text-right">
                  {showScore ? (
                    <p className="text-xl font-semibold tabular-nums text-slate-900">
                      {item.metricUnavailable ? '—' : (item.value ?? '—')}
                    </p>
                  ) : null}
                  {showBand && item.band ? <p className="text-[11px] uppercase tracking-wide text-slate-400">{item.band}</p> : null}
                </div>
              </div>
              {behaviourMode !== 'none' ? (
                <div className="mt-3 space-y-2">
                  {behaviourMode === 'all_three' ? (
                    <>
                      {item.behaviourLow ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">Low:</span> {item.behaviourLow}</p> : null}
                      {item.behaviourMid ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">Mid:</span> {item.behaviourMid}</p> : null}
                      {item.behaviourHigh ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">High:</span> {item.behaviourHigh}</p> : null}
                    </>
                  ) : behaviourMode === 'low_high_only' ? (
                    <>
                      {item.behaviourLow ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">Low:</span> {item.behaviourLow}</p> : null}
                      {item.behaviourHigh ? <p className="text-sm leading-6 text-slate-500"><span className="font-semibold text-slate-700">High:</span> {item.behaviourHigh}</p> : null}
                    </>
                  ) : item.currentBehaviour ? (
                    <p className="text-sm leading-6 text-slate-500">{item.currentBehaviour}</p>
                  ) : null}
                </div>
              ) : null}
              {showLowHighMeaning && (item.lowMeaning || item.highMeaning) ? (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <div className="rounded-[16px] border border-slate-200 bg-white/80 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Low score</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.lowMeaning ?? ''}</p>
                  </div>
                  <div className="rounded-[16px] border border-slate-200 bg-white/80 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">High score</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.highMeaning ?? ''}</p>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    )
  }

  if ((block.source === 'overall_classification' || block.source === 'derived_outcome') && data.classification) {
    const heading = block.content?.title ?? resolveNarrativeField(block.data?.heading_field, data)
    const summary = block.content?.description ?? resolveNarrativeField(block.data?.summary_field ?? 'report_summary', data)
    const body = resolveNarrativeField(block.data?.body_field ?? 'full_narrative', data)
    const showInputEvidence = block.data?.show_input_evidence === true && data.items.length > 0

    return (
      <section className="assessment-report-section-card assessment-report-section-card-hero rounded-[28px] border border-sky-100 bg-gradient-to-br from-sky-50/60 via-white to-slate-50 p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
        {block.content?.eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{block.content.eyebrow}</p>
        ) : null}
        <h3 className="mt-2.5 font-serif text-[clamp(1.6rem,3.5vw,2.4rem)] leading-[1.05] text-slate-950">
          {heading}
        </h3>
        {summary ? (
          <p className="mt-3 max-w-2xl text-base text-slate-600">{summary}</p>
        ) : null}
        {body && body !== summary ? (
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{body}</p>
        ) : null}
        {showInputEvidence ? (
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {data.items.map((item) => (
              <div key={item.key} className="assessment-report-item-card rounded-[18px] border border-sky-100 bg-white/80 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
                <p className="mt-2 text-sm font-semibold text-slate-900">{item.band ?? item.label}</p>
                {item.description ? <p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>
    )
  }

  if (block.format === 'bipolar_bar') {
    const scoreMax = block.score?.score_max ?? 100
    return (
      <section className={joinClasses(SECTION_CLASS, 'assessment-report-section-card-bipolar')}>
        <SectionHeader block={block} />
        <div className="mt-5 space-y-5">
          {data.items.map((item) => (
            <BipolarBar
              key={item.key}
              label={item.label}
              value={item.value ?? 0}
              lowMeaning={item.lowMeaning}
              highMeaning={item.highMeaning}
              showScore={showScore}
              scoreMax={scoreMax}
            />
          ))}
        </div>
      </section>
    )
  }

  if (block.format === 'bar_chart') {
    return (
      <section className={joinClasses(SECTION_CLASS, 'assessment-report-section-card-bars')}>
        <SectionHeader block={block} />
        <div className="mt-5 space-y-4">
          {data.items.map((item) => (
            <ScoreBar
              key={item.key}
              label={item.label}
              value={item.value ?? 0}
              band={item.band}
              showScore={showScore}
              description={item.description}
            />
          ))}
        </div>
      </section>
    )
  }

  if (block.format === 'score_table') {
    const hasDescription = data.items.some((item) => item.description)
    return (
      <section className={joinClasses(SECTION_CLASS, 'assessment-report-section-card-table')}>
        <SectionHeader block={block} />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="pb-2 pr-4">Label</th>
                {showScore ? <th className="pb-2 pr-4">Score</th> : null}
                <th className="pb-2 pr-4">Band</th>
                {hasDescription ? <th className="pb-2">Description</th> : null}
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, index) => (
                <tr key={item.key} className={index % 2 === 1 ? 'bg-slate-50/50' : ''}>
                  <td className="py-2 pr-4 font-medium text-slate-900">{item.label}</td>
                  {showScore ? <td className="py-2 pr-4 tabular-nums text-slate-700">{item.value ?? '-'}</td> : null}
                  <td className="py-2 pr-4">
                    {item.band ? (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-sky-700">
                        {item.band}
                      </span>
                    ) : '-'}
                  </td>
                  {hasDescription ? <td className="py-2 text-slate-500">{item.description ?? ''}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  if (block.format === 'band_cards' && !showScore) {
    return (
      <section className={joinClasses(SECTION_CLASS, 'assessment-report-section-card-band-grid')}>
        <SectionHeader block={block} />
        <div className={`mt-5 grid gap-4 ${gridColsClass(columns ?? 3)}`}>
          {data.items.map((item) => (
            <ProfileCard
              key={item.key}
              eyebrow={item.label}
              heading={item.band ?? item.label}
              description={item.description}
              secondaryDescription={item.secondaryDescription}
            />
          ))}
        </div>
      </section>
    )
  }

  if (block.format === 'score_cards' || block.format === 'band_cards') {
    return (
      <section className={joinClasses(SECTION_CLASS, 'assessment-report-section-card-score-grid')}>
        <SectionHeader block={block} />
        <div className={`mt-5 grid gap-3 ${gridColsClass(columns)}`}>
          {data.items.map((item) => (
            <ScoreCard
              key={item.key}
              label={item.label}
              value={item.value}
              band={item.band}
              description={item.description}
              showScore={showScore}
            />
          ))}
        </div>
      </section>
    )
  }

  if (block.format === 'insight_list' || block.format === 'bullet_list') {
    return (
      <section className={joinClasses(SECTION_CLASS, 'assessment-report-section-card-insights')}>
        <SectionHeader block={block} />
        <div className="mt-5 space-y-3">
          {data.items.map((item) => (
            <div key={item.key} className="assessment-report-item-card rounded-[22px] border border-sky-100 bg-gradient-to-br from-white to-sky-50/50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">{item.label}</p>
              {item.description ? <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p> : null}
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (block.format === 'rich_text' || data.markdown) {
    return (
      <section className={joinClasses(SECTION_CLASS, 'assessment-report-section-card-rich-text')}>
        <SectionHeader block={block} />
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
          {data.markdown ?? block.content?.body_markdown ?? ''}
        </p>
      </section>
    )
  }

  return (
    <section className={joinClasses(SECTION_CLASS, 'assessment-report-section-card-default')}>
      <SectionHeader block={block} />
      <div className={`mt-4 grid gap-3 ${gridColsClass(columns)}`}>
        {data.items.map((item) => (
          <ScoreCard
            key={item.key}
            label={item.label}
            value={item.value}
            band={item.band}
            description={item.description}
            showScore={showScore}
          />
        ))}
      </div>
    </section>
  )
}

export function ReportHeaderBlock({ data }: BlockRendererProps) {
  const meta = data.reportHeader
  if (!meta) return null

  return (
    <AssessmentReportHero
      badgeLabel={data.reportHeader?.badgeLabel}
      title={meta.title}
      subtitle={meta.subtitle}
      participantName={meta.participantName}
      recipientEmail={meta.recipientEmail}
      completedAt={meta.completedAt}
      orgLogoUrl={meta.orgLogoUrl}
      orgName={meta.orgName}
      showLqAttribution={meta.showLqAttribution}
      showDate={meta.showDate}
      showParticipant={meta.showParticipant}
      showEmail={meta.showEmail}
    />
  )
}

export function ReportCtaBlock({ block, data }: BlockRendererProps) {
  const title = block.content?.title ?? 'Want to discuss your results?'
  const eyebrow = block.content?.eyebrow
  const description = block.content?.description
  const body = data.markdown || block.content?.body_markdown || ''
  const buttonLabel = block.link?.label?.trim() || 'Get in touch'
  const linkMode = block.link?.mode ?? 'internal'
  const internalKey = block.link?.internal_key ?? 'contact'
  const resolvedDestination = linkMode === 'internal'
    ? CTA_DESTINATIONS[internalKey]
    : null
  const customUrl = block.link?.custom_url?.trim() || ''
  const href = linkMode === 'custom'
    ? (isValidCtaUrl(customUrl) ? customUrl : '#')
    : (resolvedDestination?.href || '#')
  const newTab = block.link?.open_in_new_tab === true
  const showButton = href !== '#'

  return (
    <section className="assessment-report-section-card assessment-report-cta-card rounded-[26px] border border-sky-100 bg-gradient-to-br from-sky-50/40 via-white to-slate-50 p-8 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      {eyebrow ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>
      ) : null}
      <h2 className="mt-2.5 font-serif text-[clamp(1.7rem,2.5vw,2.3rem)] leading-[1.08] text-slate-950">{title}</h2>
      {description ? (
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-slate-500">{description}</p>
      ) : null}
      {body ? (
        <p className="mt-4 max-w-2xl whitespace-pre-wrap text-base leading-relaxed text-slate-600">{body}</p>
      ) : null}
      {showButton ? (
        <div className="mt-6">
          <a
            href={href}
            target={newTab ? '_blank' : undefined}
            rel={newTab ? 'noreferrer noopener' : undefined}
            className="font-cta inline-flex items-center justify-center rounded-[999px] bg-[var(--site-cta-bg)] px-6 py-3 text-sm font-semibold tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-cta-hover-bg)]"
          >
            {buttonLabel}
          </a>
        </div>
      ) : null}
    </section>
  )
}
