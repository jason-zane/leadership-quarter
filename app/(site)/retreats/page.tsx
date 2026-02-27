import Link from 'next/link'
import Image from 'next/image'
import { retreats } from '@/lib/retreats'
import { Reveal } from '@/components/site/reveal'
import { TransitionLink } from '@/components/site/transition-link'
import { brandImagery } from '@/utils/brand/imagery'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Retreats | Miles Between',
  description:
    'Explore current and upcoming Miles Between retreats built around trail running, recovery, and small groups.',
}

const STATUS_LABEL: Record<string, string> = {
  upcoming: 'Next Retreat',
  open: 'Registrations Open',
  'sold-out': 'Sold Out',
  interest: 'Coming Soon',
}

const STATUS_COLOR: Record<string, string> = {
  upcoming: 'bg-emerald-100 text-emerald-800',
  open: 'bg-[color:var(--site-cta-soft)] text-[var(--site-cta-bg)]',
  'sold-out': 'bg-[var(--site-border-soft)] text-[var(--site-text-body)]',
  interest: 'bg-amber-100 text-amber-900 border border-amber-200',
}

export default function RetreatsPage() {
  const interestCards = [
    {
      slug: 'interest-melbourne',
      name: 'Melbourne & Surrounds',
      region: 'Victoria',
      datesShort: 'Expression of interest',
      description:
        'Tell us where you run in Melbourne and the retreat experience you would actually book.',
      heroImage: brandImagery.home.story.src,
      heroImageAlt: brandImagery.home.story.alt,
      status: 'interest',
      href: '/?location=Melbourne,%20VIC#register',
    },
    {
      slug: 'interest-brisbane',
      name: 'Brisbane, Gold Coast & Sunshine Coast',
      region: 'Queensland',
      datesShort: 'Expression of interest',
      description:
        'Help us shape a coastal retreat around Brisbane, the Gold Coast or the Sunshine Coast.',
      heroImage: brandImagery.cards.environment.src,
      heroImageAlt: brandImagery.cards.environment.alt,
      status: 'interest',
      href: '/?location=Brisbane%20/%20Gold%20Coast%20/%20Sunshine%20Coast,%20QLD#register',
    },
  ]

  const retreatCards = [...retreats, ...interestCards]

  return (
    <div className="bg-[var(--site-bg)] text-[var(--site-text-primary)]">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--site-accent-strong)] pt-40 pb-24 md:pt-52 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal delay={0.1}>
            <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.25em] text-[var(--site-text-secondary)]">
              Retreats
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <h1 className="font-serif text-5xl font-bold leading-[1.05] text-[var(--site-bg)] md:text-7xl">
              Current retreats.
              <br />
              <span className="italic">Small groups only.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.35}>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[var(--site-on-dark-muted)]">
              Every retreat is capped, paced, and built around terrain we would choose ourselves.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── RETREATS LIST ─────────────────────────────────────────────────── */}
      <section className="py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {retreatCards.map((retreat, i) => (
              <Reveal key={retreat.slug} delay={i * 0.1}>
                <TransitionLink
                  href={'href' in retreat ? retreat.href : `/retreats/${retreat.slug}`}
                  className="group flex h-full flex-col overflow-hidden border border-[var(--site-border-soft)] bg-[var(--site-surface-elevated)] transition-shadow hover:shadow-lg"
                >
                  <div className="relative overflow-hidden">
                    <div className="relative aspect-[4/3] w-full overflow-hidden">
                      <Image
                        src={retreat.heroImage}
                        alt={retreat.heroImageAlt}
                        fill
                        className="object-cover object-[center_44%] transition-transform duration-700 ease-out group-hover:scale-[1.05] md:object-center"
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="absolute left-4 top-4">
                      <span
                        className={`font-ui rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOR[retreat.status] ?? ''}`}
                      >
                        {STATUS_LABEL[retreat.status] ?? 'Retreat'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <p className="font-ui mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                      {retreat.region} • {retreat.datesShort}
                    </p>
                    <h2 className="mb-3 min-h-[3.25rem] font-serif text-2xl font-bold text-[var(--site-text-primary)]">
                      {retreat.name}
                    </h2>
                    <p className="mb-6 min-h-[5.5rem] flex-1 text-sm leading-relaxed text-[var(--site-text-body)]">
                      {retreat.description}
                    </p>
                    {'priceFrom' in retreat ? (
                      <div className="flex min-h-[64px] items-center justify-between border-t border-[var(--site-border-soft)] pt-4">
                        <div>
                          <p className="font-ui text-xs text-[var(--site-text-muted)]">From</p>
                          <p className="font-serif text-xl font-bold text-[var(--site-text-primary)]">
                            ${retreat.priceFrom.toLocaleString()}
                            <span className="text-sm font-normal text-[var(--site-text-muted)]"> pp</span>
                          </p>
                        </div>
                        <span className="font-ui text-sm font-medium tracking-[0.02em] text-[var(--site-cta-bg)] group-hover:underline">
                          View retreat →
                        </span>
                      </div>
                    ) : (
                      <div className="flex min-h-[64px] items-center justify-between border-t border-[var(--site-border-soft)] pt-4">
                        <span className="font-ui text-sm font-medium tracking-[0.02em] text-[var(--site-cta-bg)] group-hover:underline">
                          Join interest list →
                        </span>
                      </div>
                    )}
                  </div>
                </TransitionLink>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── GENERAL INTEREST ──────────────────────────────────────────────── */}
      <section className="bg-[var(--site-accent-strong)] py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-secondary)]">
                Next locations
              </p>
              <h2 className="mb-6 font-serif text-4xl font-bold text-[var(--site-bg)]">
                Join the general list.
              </h2>
              <p className="mb-10 text-lg leading-relaxed text-[var(--site-on-dark-muted)]">
                Tell us where you are based and what type of retreat you would actually book.
              </p>
              <Link
                href="/#register"
                className="font-ui inline-block border border-[var(--site-bg)]/60 px-8 py-4 text-sm font-medium tracking-[0.02em] text-[var(--site-bg)] transition-colors hover:bg-[var(--site-bg)] hover:text-[var(--site-cta-bg)]"
              >
                Join General Retreat List
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
