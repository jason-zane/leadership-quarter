import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Reveal } from '@/components/site/reveal'
import { brandImagery } from '@/utils/brand/imagery'

export const metadata: Metadata = {
  title: 'About | Miles Between',
  description:
    'Miles Between is a running retreat for people who love the sport but want more from it than training data.',
}

const VALUES = [
  {
    title: 'Clarity over noise',
    body: 'A retreat should simplify your headspace, not overload it. We strip away anything that feels performative or unnecessary.',
  },
  {
    title: 'Recovery is non-negotiable',
    body: 'Rest is not a reward after effort. It is part of the design from the start, because that is how people actually feel better.',
  },
  {
    title: 'Community is the point',
    body: 'Connection is not a side effect. We keep groups small so the people around you become part of why the retreat works.',
  },
  {
    title: 'Place shapes everything',
    body: 'Terrain, accommodation, pacing, and flow all come from the location first. The programme follows the place, not the other way around.',
  },
]

export default function AboutPage() {
  return (
    <div className="bg-[var(--site-bg)] text-[var(--site-text-primary)]">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--site-accent-strong)] pt-40 pb-24 md:pt-52 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal delay={0.1}>
            <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.25em] text-[var(--site-text-secondary)]">
              About
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <h1 className="mb-8 font-serif text-5xl font-bold leading-[1.05] text-[var(--site-bg)] md:text-7xl">
              Why Miles Between
              <br />
              <span className="italic">exists.</span>
            </h1>
          </Reveal>
        </div>
      </section>

      {/* ── ORIGIN ────────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-28">
            <Reveal delay={0.1}>
              <div>
                <p className="font-ui mb-6 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                  The Start
                </p>
                <h2 className="font-serif text-4xl font-bold leading-[1.15] text-[var(--site-text-primary)] md:text-5xl">
                  We wanted this retreat and could not find it.
                </h2>
              </div>
            </Reveal>
            <div className="space-y-6 text-lg leading-relaxed text-[var(--site-text-body)]">
              {[
                'Most retreat options looked like training camps. Hard schedules, technical sessions, and performance language everywhere.',
                'That does not reflect how most people run. They run to think, reset, and feel better in their week.',
                'Miles Between is built for that runner: consistent, curious, and not interested in turning every run into a test.',
                'We focus on three things: route quality, recovery space, and a group you actually enjoy spending time with.',
              ].map((text, i) => (
                <Reveal key={i} delay={i * 0.1}>
                  <p>{text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT WE BELIEVE ───────────────────────────────────────────────── */}
      <section className="bg-[var(--site-surface-alt)] py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="mb-16">
              <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                What we believe
              </p>
              <h2 className="font-serif text-4xl font-bold leading-[1.15] text-[var(--site-text-primary)] md:text-5xl">
                The principles that guide every retreat decision.
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            {VALUES.map((value, i) => (
              <Reveal key={value.title} delay={i * 0.1}>
                <div className="border-t-2 border-[var(--site-accent-strong)] pt-8">
                  <p className="font-ui mb-3 text-xs font-medium tracking-[0.2em] text-[var(--site-text-muted)]">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mb-4 font-serif text-2xl font-bold text-[var(--site-text-primary)]">
                    {value.title}
                  </h3>
                  <p className="leading-relaxed text-[var(--site-text-body)]">{value.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO WE ARE ────────────────────────────────────────────────────── */}
      <section className="bg-[var(--site-bg)] py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-28">
            <Reveal delay={0.05} y={32}>
              <div className="relative aspect-square w-full overflow-hidden rounded-sm">
                <Image
                  src={brandImagery.about.team.src}
                  alt={brandImagery.about.team.alt}
                  fill
                  className="object-cover object-[center_35%] transition-transform duration-700 hover:scale-[1.03] md:object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </Reveal>
            <div>
              <Reveal delay={0.1}>
                <p className="font-ui mb-6 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                  Who we are
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <h2 className="mb-8 font-serif text-4xl font-bold leading-[1.15] text-[var(--site-text-primary)] md:text-5xl">
                  A small Sydney team building retreats we would book ourselves.
                </h2>
              </Reveal>
              <div className="space-y-5 text-lg leading-relaxed text-[var(--site-text-body)]">
                {[
                  'We are based in Sydney and run most mornings before work.',
                  'The Southern Highlands was our first choice because the trails are close, varied, and still feel quiet.',
                  'We keep groups small, take food seriously, and leave room in the schedule because that is what makes people want to come back.',
                ].map((text, i) => (
                  <Reveal key={i} delay={0.3 + i * 0.1}>
                    <p>{text}</p>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--site-surface-elevated)] py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="mb-6 font-serif text-4xl font-bold text-[var(--site-text-primary)]">
                Start with the current retreat.
              </h2>
              <p className="mb-10 text-lg leading-relaxed text-[var(--site-text-body)]">
                Our first retreat is in the Southern Highlands, September 2026. Limited to 12
                guests.
              </p>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link
                  href="/retreats/sydney-southern-highlands"
                  className="font-ui inline-block bg-[var(--site-cta-bg)] px-8 py-4 text-sm font-medium tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-cta-hover-bg)]"
                >
                  View the Retreat
                </Link>
                <Link
                  href="/experience"
                  className="font-ui inline-block border border-[var(--site-border)] px-8 py-4 text-sm font-medium tracking-[0.02em] text-[var(--site-text-body)] transition-colors hover:border-[var(--site-accent)]"
                >
                  What to Expect
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
