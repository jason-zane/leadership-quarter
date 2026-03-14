'use client'

import type { V2BlockRendererProps } from '@/utils/reports/v2-block-renderer-registry'

function ScoreBar({ label, value, band }: { label: string; value: number; band?: string }) {
  const safeValue = Math.max(0, Math.min(100, value))

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums text-slate-900">{safeValue}</span>
          {band ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
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
    </div>
  )
}

function ScoreCard({
  label,
  value,
  band,
  description,
}: {
  label: string
  value?: number
  band?: string
  description?: string
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-[0_8px_20px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
        </div>
        {typeof value === 'number' ? (
          <div className="text-right">
            <p className="text-xl font-semibold tabular-nums text-slate-900">{value}</p>
            {band ? <p className="text-[11px] uppercase tracking-wide text-slate-400">{band}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function ReportPreviewBlock({ block, data }: V2BlockRendererProps) {
  if ((block.source === 'overall_classification' || block.source === 'derived_outcome') && data.classification) {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50 p-6 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
        {block.content?.eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">{block.content.eyebrow}</p>
        ) : null}
        <h3 className="mt-2 text-2xl font-semibold text-slate-950">
          {block.content?.title ?? data.classification.label}
        </h3>
        <p className="mt-3 max-w-2xl text-base text-slate-600">
          {data.derivedOutcome?.summary || data.classification.description}
        </p>
        {data.derivedOutcome?.narrative ? (
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">{data.derivedOutcome.narrative}</p>
        ) : null}
      </section>
    )
  }

  if (block.format === 'bar_chart') {
    return (
      <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        {block.content?.title ? <h3 className="text-lg font-semibold text-slate-950">{block.content.title}</h3> : null}
        {block.content?.description ? <p className="mt-1 text-sm text-slate-500">{block.content.description}</p> : null}
        <div className="mt-5 space-y-4">
          {data.items.map((item) => (
            <ScoreBar key={item.key} label={item.label} value={item.value ?? 0} band={item.band} />
          ))}
        </div>
      </section>
    )
  }

  if (block.format === 'score_cards' || block.format === 'band_cards') {
    return (
      <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        {block.content?.title ? <h3 className="text-lg font-semibold text-slate-950">{block.content.title}</h3> : null}
        {block.content?.description ? <p className="mt-1 text-sm text-slate-500">{block.content.description}</p> : null}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {data.items.map((item) => (
            <ScoreCard
              key={item.key}
              label={item.label}
              value={item.value}
              band={item.band}
              description={item.description}
            />
          ))}
        </div>
      </section>
    )
  }

  if (block.format === 'insight_list' || block.format === 'bullet_list') {
    return (
      <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        {block.content?.title ? <h3 className="text-lg font-semibold text-slate-950">{block.content.title}</h3> : null}
        {block.content?.description ? <p className="mt-1 text-sm text-slate-500">{block.content.description}</p> : null}
        <div className="mt-5 space-y-3">
          {data.items.map((item) => (
            <div key={item.key} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
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
      <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
        {block.content?.title ? <h3 className="text-lg font-semibold text-slate-950">{block.content.title}</h3> : null}
        {block.content?.description ? <p className="mt-1 text-sm text-slate-500">{block.content.description}</p> : null}
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
          {data.markdown ?? block.content?.body_markdown ?? ''}
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
      {block.content?.title ? <h3 className="text-lg font-semibold text-slate-950">{block.content.title}</h3> : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {data.items.map((item) => (
          <ScoreCard
            key={item.key}
            label={item.label}
            value={item.value}
            band={item.band}
            description={item.description}
          />
        ))}
      </div>
    </section>
  )
}
