type ProcessItem = {
  step: string
  title: string
  description: string
  outcome?: string
}

type SiteProcessDiagramProps = {
  eyebrow?: string
  title?: string
  items: readonly ProcessItem[]
}

export function SiteProcessDiagram({ eyebrow, title, items }: SiteProcessDiagramProps) {
  return (
    <section className="site-card-strong relative overflow-hidden p-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(154,198,244,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(217,180,109,0.12),transparent_32%)]" />
      <div className="relative">
        {eyebrow ? (
          <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">{eyebrow}</p>
        ) : null}
        {title ? (
          <h3 className="mt-2 max-w-3xl font-serif text-[clamp(1.6rem,3vw,2.35rem)] leading-[1.06] text-[var(--site-text-primary)]">
            {title}
          </h3>
        ) : null}

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-4">
          {items.map((item, index) => (
            <div key={item.step} className="relative">
              {index < items.length - 1 ? (
                <span className="pointer-events-none absolute left-[calc(100%-0.5rem)] top-7 hidden h-px w-8 bg-[linear-gradient(90deg,rgba(97,126,166,0.24),rgba(97,126,166,0))] lg:block" />
              ) : null}
              <article className="site-card-sub h-full p-5">
                <p className="font-eyebrow text-[10px] uppercase tracking-[0.12em] text-[var(--site-text-muted)]">{item.step}</p>
                <h4 className="mt-3 font-serif text-[1.45rem] leading-[1.08] text-[var(--site-text-primary)]">{item.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">{item.description}</p>
                {item.outcome ? (
                  <p className="mt-4 text-[13px] font-semibold leading-relaxed text-[var(--site-text-primary)]">{item.outcome}</p>
                ) : null}
              </article>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
