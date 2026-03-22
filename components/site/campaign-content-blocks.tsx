import type { CampaignScreenCardStyle, CampaignScreenContentBlock } from '@/utils/assessments/campaign-types'

const CARD_GRID_CLASS: Record<1 | 2 | 3, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
}

const CARD_STYLE_CLASS: Record<CampaignScreenCardStyle, string> = {
  default: 'rounded-[1.35rem] border border-[var(--site-panel-card-border)] bg-[var(--site-panel-card-bg)] p-4',
  outlined: 'rounded-[1.35rem] border border-[var(--site-panel-card-border)] bg-transparent p-4',
  filled: 'rounded-[1.35rem] bg-[var(--site-surface)] p-4',
  glass: 'rounded-[1.35rem] border border-[var(--site-glass-border)] bg-[var(--site-glass-bg)] backdrop-blur-sm p-4',
}

export function CampaignContentBlocks({ blocks }: { blocks: CampaignScreenContentBlock[] }) {
  if (blocks.length === 0) return null

  return (
    <div className="mt-8 space-y-4">
      {blocks.map((block) => {
        if (block.type === 'callout') {
          return (
            <article
              key={block.id}
              className={[
                'rounded-[1.6rem] border p-5 md:p-6',
                block.tone === 'emphasis'
                  ? 'border-[var(--site-panel-callout-border)] bg-[var(--site-panel-callout-bg)]'
                  : 'border-[var(--site-border)] bg-[var(--site-surface-elevated)]',
              ].join(' ')}
            >
              {block.eyebrow ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--site-text-muted)]">
                  {block.eyebrow}
                </p>
              ) : null}
              <h3 className="mt-2 text-lg font-semibold text-[var(--site-text-primary)]">{block.title}</h3>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-[var(--site-text-body)]">{block.body}</p>
            </article>
          )
        }

        if (block.type === 'card_grid') {
          const cardClass = CARD_STYLE_CLASS[block.card_style] ?? CARD_STYLE_CLASS.default
          return (
            <article
              key={block.id}
              className="rounded-[1.6rem] border border-[var(--site-panel-card-border)] bg-[var(--site-panel-card-bg)] p-5 md:p-6"
            >
              {block.eyebrow ? (
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--site-text-muted)]">
                  {block.eyebrow}
                </p>
              ) : null}
              <h3 className="mt-2 text-lg font-semibold text-[var(--site-text-primary)]">{block.title}</h3>
              {block.body ? (
                <p className="mt-3 whitespace-pre-line leading-relaxed text-[var(--site-text-body)]">{block.body}</p>
              ) : null}
              <div className={['mt-5 grid gap-3', CARD_GRID_CLASS[block.columns]].join(' ')}>
                {block.cards.map((card) => (
                  <div
                    key={card.id}
                    className={cardClass}
                  >
                    <h4 className="text-sm font-semibold text-[var(--site-text-primary)]">{card.title}</h4>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--site-text-body)]">
                      {card.body}
                    </p>
                  </div>
                ))}
              </div>
            </article>
          )
        }

        if (block.layout === 'inline') {
          return (
            <article
              key={block.id}
              className="rounded-[1.6rem] border border-[var(--site-panel-card-border)] bg-[var(--site-panel-card-bg)] p-5 md:p-6 grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-6"
            >
              <div>
                {block.eyebrow ? (
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--site-text-muted)]">
                    {block.eyebrow}
                  </p>
                ) : null}
                <h3 className="mt-2 text-lg font-semibold text-[var(--site-text-primary)]">{block.title}</h3>
              </div>
              <div>
                <p className="whitespace-pre-line leading-relaxed text-[var(--site-text-body)]">{block.body}</p>
              </div>
            </article>
          )
        }

        return (
          <article
            key={block.id}
            className="rounded-[1.6rem] border border-[var(--site-panel-card-border)] bg-[var(--site-panel-card-bg)] p-5 md:p-6"
          >
            {block.eyebrow ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--site-text-muted)]">
                {block.eyebrow}
              </p>
            ) : null}
            <h3 className="mt-2 text-lg font-semibold text-[var(--site-text-primary)]">{block.title}</h3>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-[var(--site-text-body)]">{block.body}</p>
          </article>
        )
      })}
    </div>
  )
}
