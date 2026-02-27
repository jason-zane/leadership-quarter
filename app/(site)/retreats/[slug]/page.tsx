import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { RegistrationForm } from '@/components/site/registration-form'
import { ParallaxHero } from '@/components/site/parallax-hero'
import { Reveal } from '@/components/site/reveal'
import { CountUp } from '@/components/site/count-up'
import { StickyRetreatCta } from '@/components/site/sticky-retreat-cta'
import { VenueImageCarousel } from '@/components/site/venue-image-carousel'
import { getRetreat } from '@/lib/retreats'

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const retreat = getRetreat(slug)
  if (!retreat) return {}
  return {
    title: `${retreat.name} | Miles Between`,
    description: retreat.description,
  }
}

export default async function RetreatPage({ params }: Props) {
  const { slug } = await params
  const retreat = getRetreat(slug)
  if (!retreat) notFound()

  return (
    <div className="bg-[var(--site-bg)] text-[var(--site-text-primary)]">
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <ParallaxHero
        src={retreat.heroImage}
        alt={retreat.heroImageAlt}
        minHeight="min-h-[90vh]"
        imgClassName="object-[center_42%] md:object-center"
      >
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-12">
          <Reveal delay={0.1}>
            <p className="font-ui mb-4 text-xs font-medium uppercase tracking-[0.25em] text-[var(--site-on-dark-muted)]">
              {retreat.region} • {retreat.datesShort}
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <h1 className="mb-5 font-serif text-5xl font-bold leading-[1.05] text-white md:text-7xl">
              {retreat.name}
            </h1>
          </Reveal>
          <Reveal delay={0.3}>
            <p className="mb-8 text-lg text-[var(--site-on-dark-muted)] md:text-xl">{retreat.location}</p>
          </Reveal>
          <Reveal delay={0.4}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-ui rounded-full border border-white/30 px-4 py-2 text-sm text-white/80">
                Limited to {retreat.capacity} guests
              </span>
              <span className="font-ui rounded-full border border-white/30 px-4 py-2 text-sm text-white/80">
                {retreat.dates}
              </span>
            </div>
          </Reveal>
          <Reveal delay={0.5}>
            <div className="mt-10">
              <a
                href="#register"
                className="font-ui inline-block bg-[var(--site-cta-bg)] px-8 py-4 text-sm font-medium tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-cta-hover-bg)]"
              >
                Apply for This Retreat
              </a>
            </div>
          </Reveal>
        </div>
      </ParallaxHero>

      {/* ── KEY FACTS ─────────────────────────────────────────────────────── */}
      <section className="border-b border-[var(--site-border-soft)] bg-[var(--site-surface-elevated)]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-[var(--site-border-soft)] md:grid-cols-4">
          <div className="px-6 py-6 md:px-10 md:py-8">
            <p className="font-ui mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
              Duration
            </p>
            <p className="font-serif text-xl font-bold text-[var(--site-text-primary)] md:text-2xl">
              <CountUp target={3} suffix=" nights" />
            </p>
          </div>
          <div className="px-6 py-6 md:px-10 md:py-8">
            <p className="font-ui mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
              Guests
            </p>
            <p className="font-serif text-xl font-bold text-[var(--site-text-primary)] md:text-2xl">
              Max <CountUp target={retreat.capacity} />
            </p>
          </div>
          <div className="px-6 py-6 md:px-10 md:py-8">
            <p className="font-ui mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
              Group size
            </p>
            <p className="font-serif text-xl font-bold text-[var(--site-text-primary)] md:text-2xl">
              Intimate
            </p>
          </div>
          <div className="px-6 py-6 md:px-10 md:py-8">
            <p className="font-ui mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
              Setting
            </p>
            <p className="font-serif text-xl font-bold text-[var(--site-text-primary)] md:text-2xl">
              Estate-based
            </p>
          </div>
        </div>
      </section>

      {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
      <section className="bg-[var(--site-bg)] py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="font-ui mb-6 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                The Retreat
              </p>
              <p className="font-serif text-3xl font-bold leading-[1.2] text-[var(--site-text-primary)] md:text-4xl">
                {retreat.tagline}
              </p>
              <p className="mt-8 text-lg leading-relaxed text-[var(--site-text-body)]">{retreat.description}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── THE VENUE ─────────────────────────────────────────────────────── */}
      <section className="bg-[var(--site-surface-alt)] py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-24">
            <Reveal delay={0.1}>
              <div>
              <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                Where you'll stay
              </p>
                <h2 className="mb-8 font-serif text-4xl font-bold leading-[1.15] text-[var(--site-text-primary)] md:text-5xl">
                  {retreat.venueName}
                </h2>
                <p className="mb-10 text-lg leading-relaxed text-[var(--site-text-body)]">
                  {retreat.venueDescription}
                </p>
                <ul className="space-y-3">
                  {retreat.venueHighlights.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--site-cta-bg)]" />
                      <span className="text-[var(--site-text-body)]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={0.05} y={32}>
              <div className="relative">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm">
                  <VenueImageCarousel
                    images={
                      retreat.venueGallery && retreat.venueGallery.length > 0
                        ? retreat.venueGallery
                        : [
                            { src: retreat.venueImage, alt: retreat.venueImageAlt },
                            { src: retreat.heroImage, alt: retreat.heroImageAlt },
                          ]
                    }
                  />
                </div>
                <div className="absolute -bottom-5 -right-5 -z-10 h-32 w-32 rounded-sm bg-[var(--site-border-soft)]/40" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {retreat.mapEmbedUrl ? (
        <section className="bg-[var(--site-bg)] py-20 md:py-28">
          <div className="mx-auto max-w-7xl px-6 md:px-12">
            <Reveal>
              <div className="mb-8">
                <p className="font-ui mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                  Location
                </p>
                <h2 className="font-serif text-3xl font-bold text-[var(--site-text-primary)] md:text-4xl">
                  Where this retreat is based
                </h2>
                {retreat.mapLabel ? (
                  <p className="mt-3 text-sm text-[var(--site-text-body)]">{retreat.mapLabel}</p>
                ) : null}
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="overflow-hidden border border-[var(--site-border-soft)] bg-[var(--site-surface-elevated)]">
                <iframe
                  title={`${retreat.name} map`}
                  src={retreat.mapEmbedUrl}
                  className="h-[360px] w-full md:h-[460px]"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* ── RETREAT ATMOSPHERE ───────────────────────────────────────────── */}
      <section className="bg-[var(--site-accent-strong)] py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="mb-16">
              <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-secondary)]">
                Retreat atmosphere
              </p>
              <h2 className="font-serif text-4xl font-bold leading-[1.15] text-[var(--site-bg)] md:text-5xl">
                Built for clarity, connection, and proper downtime.
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {[
              {
                title: 'Mornings with purpose',
                body: 'Early starts and guided routes set the tone for the day, without pressure to race or perform.',
              },
              {
                title: 'Afternoons to recover',
                body: 'Long open windows for rest, pool time, walking, or simply doing nothing at all.',
              },
              {
                title: 'Evenings together',
                body: 'Shared meals, good conversation, and the kind of group energy that stays easy and genuine.',
              },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 0.1}>
                <div className="h-full border border-[var(--site-bg)]/10 bg-[var(--site-bg)]/5 p-8">
                  <p className="font-ui mb-3 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-secondary)]">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mb-4 font-serif text-2xl font-bold text-[var(--site-bg)]">{item.title}</h3>
                  <p className="text-sm leading-relaxed text-[var(--site-on-dark-muted)]">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── ITINERARY ─────────────────────────────────────────────────────── */}
      <section className="bg-[var(--site-bg)] py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="mb-16">
              <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                The Programme
              </p>
              <h2 className="font-serif text-4xl font-bold leading-[1.15] text-[var(--site-text-primary)] md:text-5xl">
                How the weekend <span className="italic">could unfold.</span>
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--site-text-body)]">
                Each retreat keeps the same rhythm while details vary by group, season, and route conditions.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                day: retreat.itinerary[0]?.day ?? 'Thursday',
                focus: 'Arrival and reset',
                bullets: ['Travel in and settle at the estate', 'Easy introductions and orientation', 'Shared welcome dinner'],
              },
              {
                day: retreat.itinerary[1]?.day ?? 'Friday',
                focus: 'First full retreat day',
                bullets: ['Guided morning route options', 'Recovery and practical sessions', 'Long afternoon reset window'],
              },
              {
                day: retreat.itinerary[2]?.day ?? 'Saturday',
                focus: 'Depth day',
                bullets: ['Longer or alternate morning routes', 'Flexible lunch and downtime', 'Casual evening together'],
              },
              {
                day: retreat.itinerary[3]?.day ?? 'Sunday',
                focus: 'Close well',
                bullets: ['Optional movement session', 'Farewell meal and closeout', 'Travel home grounded and clear'],
              },
            ].map((card, i) => (
              <Reveal key={card.day} delay={i * 0.08}>
                <div className="h-full border border-[var(--site-border-soft)] bg-[var(--site-surface-elevated)] p-6">
                  <p className="font-ui mb-2 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                    {card.day}
                  </p>
                  <h3 className="mb-4 font-serif text-2xl font-bold text-[var(--site-text-primary)]">{card.focus}</h3>
                  <ul className="space-y-2">
                    {card.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-sm leading-relaxed text-[var(--site-text-body)]">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--site-cta-bg)]" />
                      <span>{bullet}</span>
                    </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── INCLUDED ──────────────────────────────────────────────────────── */}
      <section className="bg-[var(--site-surface-elevated)] py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="mb-16">
              <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                Pricing
              </p>
              <h2 className="font-serif text-4xl font-bold leading-[1.15] text-[var(--site-text-primary)] md:text-5xl">
                What's included.
              </h2>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_340px] lg:gap-24">
            <Reveal delay={0.1}>
              <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
                <div>
                  <p className="font-ui mb-6 text-sm font-medium uppercase tracking-[0.15em] text-[var(--site-cta-bg)]">
                    Included
                  </p>
                  <ul className="space-y-3">
                    {retreat.included.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[var(--site-text-body)]">
                        <svg
                          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--site-cta-bg)]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="font-ui mb-6 text-sm font-medium uppercase tracking-[0.15em] text-[var(--site-text-muted)]">
                    Not included
                  </p>
                  <ul className="space-y-3">
                    {retreat.notIncluded.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-[var(--site-text-muted)]">
                        <span className="mt-2 h-1 w-4 shrink-0 bg-[var(--site-border)]" />
                        <span className="text-sm leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Reveal>

            {/* Price card */}
            <Reveal delay={0.2}>
              <div className="h-fit border border-[var(--site-border-soft)] bg-[var(--site-bg)] p-8">
                <p className="font-ui mb-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                  From
                </p>
                <p className="mb-2 font-serif text-5xl font-bold text-[var(--site-text-primary)]">
                  $<CountUp target={retreat.priceFrom} duration={1600} />
                </p>
                <p className="mb-8 text-sm text-[var(--site-text-muted)]">per person</p>
                <div className="mb-6 space-y-2 text-sm text-[var(--site-text-body)]">
                  <p>
                    <span className="font-medium">${retreat.deposit} deposit</span> to secure your
                    place.
                  </p>
                  <p>Full payment due 30 days before the retreat.</p>
                </div>
                <a
                  href="#register"
                  className="font-ui block w-full bg-[var(--site-cta-bg)] py-4 text-center text-sm font-medium tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-cta-hover-bg)]"
                >
                  Apply for This Retreat
                </a>
                <p className="mt-4 text-center text-xs text-[var(--site-text-muted)]">
                  Limited to {retreat.capacity} guests. No payment required to register interest.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── REGISTER INTEREST ─────────────────────────────────────────────── */}
      <section id="register" className="bg-[var(--site-surface-alt)] py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24">
            <Reveal delay={0.1}>
              <div>
                <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                  Apply
                </p>
                <h2 className="mb-6 font-serif text-4xl font-bold leading-[1.15] text-[var(--site-text-primary)] md:text-5xl">
                  Apply for your place.
                </h2>
                <p className="mb-8 text-lg leading-relaxed text-[var(--site-text-body)]">
                  Submit the short application below. We review for group fit, then send accepted
                  runners a follow-up with payment and logistics.
                </p>
                <div className="space-y-4 border-t border-[var(--site-border)] pt-8">
                  {[
                    'Register your interest below',
                    "We'll reach out to confirm your place",
                    `Secure your spot with a $${retreat.deposit} deposit`,
                  ].map((step, i) => (
                    <div key={step} className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--site-cta-bg)] text-sm font-bold text-white">
                        {i + 1}
                      </div>
                      <p className="text-[var(--site-text-body)]">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.2}>
              <div className="bg-[var(--site-surface-elevated)] p-8 md:p-10">
                <RegistrationForm
                  mode="retreat"
                  retreatSlug={retreat.slug}
                  retreatName={retreat.name}
                  source={`retreat:${retreat.slug}`}
                  submitCtaLabel="Apply for This Retreat"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── STICKY CTA ────────────────────────────────────────────────────── */}
      <StickyRetreatCta retreat={retreat} />
    </div>
  )
}
