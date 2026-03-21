import { lq8Competencies, lq8Quadrants } from '@/utils/brand/lq8-content'

const quadrantLayout = [
  { id: 'inner-compass', left: '8%', top: '8%' },
  { id: 'thinking-in-motion', left: '52%', top: '8%' },
  { id: 'relating-to-others', left: '8%', top: '52%' },
  { id: 'progress-and-growth', left: '52%', top: '52%' },
] as const

export function Lq8SystemDiagram() {
  return (
    <section className="site-card-strong relative overflow-hidden p-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_16%,rgba(154,198,244,0.18),transparent_30%),radial-gradient(circle_at_84%_84%,rgba(217,180,109,0.12),transparent_28%)]" />
      <div className="relative">
        <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">LQ8 at a glance</p>
        <h3 className="mt-2 max-w-3xl font-serif text-[clamp(1.6rem,3vw,2.35rem)] leading-[1.06] text-[var(--site-text-primary)]">
          One leadership system built from four connected quadrants.
        </h3>

        <div className="relative mt-8 aspect-square w-full">
          <div className="absolute inset-[10%] rounded-[2rem] border border-[var(--site-border-soft)]" />
          <div className="absolute left-1/2 top-[10%] h-[80%] w-px -translate-x-1/2 bg-[linear-gradient(180deg,rgba(97,126,166,0.06),rgba(97,126,166,0.22),rgba(97,126,166,0.06))]" />
          <div className="absolute left-[10%] top-1/2 h-px w-[80%] -translate-y-1/2 bg-[linear-gradient(90deg,rgba(97,126,166,0.06),rgba(97,126,166,0.22),rgba(97,126,166,0.06))]" />

          <div className="absolute left-1/2 top-1/2 flex h-[18%] w-[18%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(255,255,255,0.8)] bg-[rgba(249,251,254,0.92)] shadow-[0_10px_30px_rgba(20,35,55,0.08)]">
            <div className="text-center">
              <p className="font-serif text-[1.85rem] leading-none text-[var(--site-text-primary)]">LQ8</p>
              <p className="font-eyebrow mt-1 text-[9px] uppercase tracking-[0.14em] text-[var(--site-text-muted)]">Leadership</p>
            </div>
          </div>

          {quadrantLayout.map((position, index) => {
            const quadrant = lq8Quadrants.find((item) => item.id === position.id)
            const competencies = lq8Competencies.filter((item) => item.quadrant === position.id)

            if (!quadrant) return null

            return (
              <article
                key={quadrant.id}
                className={index % 2 === 0 ? 'site-card-primary absolute h-[38%] w-[40%] p-4' : 'site-card-tint absolute h-[38%] w-[40%] p-4'}
                style={{ left: position.left, top: position.top }}
              >
                <p className="font-eyebrow text-[10px] uppercase tracking-[0.1em] text-[var(--site-text-muted)]">{quadrant.name}</p>
                <div className="mt-3 space-y-2">
                  {competencies.map((competency) => (
                    <div key={competency.id} className="rounded-[1rem] border border-[rgba(255,255,255,0.56)] bg-[rgba(255,255,255,0.64)] px-3 py-2">
                      <p className="font-serif text-[1rem] leading-[1.08] text-[var(--site-text-primary)]">{competency.name}</p>
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
