'use client'

import { FoundationSurface } from '@/components/ui/foundation/surface'
import type { BlockRendererProps } from '@/utils/reports/assessment-report-block-registry'

export function PlaceholderBlock({ block, data }: BlockRendererProps) {
  return (
    <FoundationSurface className="border-dashed p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="rounded-full bg-[var(--admin-surface-alt)] px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--admin-text-muted)]">
          {block.source}
        </span>
        <span className="rounded-full bg-[var(--admin-surface-alt)] px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--admin-text-muted)]">
          {block.format}
        </span>
        {!block.enabled && (
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-700">
            disabled
          </span>
        )}
      </div>

      {block.content?.title && (
        <p className="text-sm font-semibold text-[var(--admin-text-primary)]">
          {block.content.title}
        </p>
      )}
      {block.content?.description && (
        <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">
          {block.content.description}
        </p>
      )}

      {data.classification && (
        <div className="mt-3 rounded-[18px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-3 text-xs">
          <span className="font-medium text-[var(--admin-text-primary)]">{data.classification.label}</span>
          <span className="ml-1 text-[var(--admin-text-muted)]">{data.classification.description}</span>
        </div>
      )}

      {data.derivedOutcome?.narrative && (
        <div className="mt-3 rounded-[18px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-3 text-xs text-[var(--admin-text-muted)]">
          {data.derivedOutcome.narrative}
        </div>
      )}

      {data.items.length > 0 && (
        <div className="mt-3 space-y-2">
          {data.items.map((item: BlockRendererProps['data']['items'][number]) => (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-[18px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-3 py-2 text-xs"
            >
              <span className="text-[var(--admin-text-primary)]">{item.label}</span>
              <span className="flex items-center gap-2">
                {item.value !== undefined && (
                  <span className="font-mono font-medium text-[var(--admin-text-primary)]">
                    {item.value}
                  </span>
                )}
                {item.band && (
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-[var(--admin-text-muted)]">
                    {item.band}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {data.markdown && (
        <div className="mt-3 rounded-[18px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-3 text-xs text-[var(--admin-text-muted)]">
          {data.markdown}
        </div>
      )}

      <p className="mt-3 text-[10px] uppercase tracking-wide text-[var(--admin-text-soft)]">
        Block ID: {block.id}
      </p>
    </FoundationSurface>
  )
}
