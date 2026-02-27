import Image from 'next/image'
import Link from 'next/link'
import { HomeHero } from '@/components/site/home/home-hero'
import { Reveal } from '@/components/site/reveal'
import { Marquee } from '@/components/site/marquee'
import { RegistrationForm } from '@/components/site/registration-form'
import { brandImagery } from '@/utils/brand/imagery'

export default function Home() {
  return (
    <div className="bg-[var(--site-bg)] text-[var(--site-text-primary)]">
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <HomeHero />

      {/* ── MARQUEE ───────────────────────────────────────────────────────── */}
      <Marquee />

      {/* ── WHAT IS MILES BETWEEN ─────────────────────────────────────────── */}
      <section className="bg-[var(--site-bg)] py-28 md:py-40">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-28">
            <div>
              <Reveal delay={0.05}>
                <p className="font-ui mb-6 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                  What we are
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <h2 className="mb-10 font-serif text-4xl font-bold leading-[1.15] text-[var(--site-text-primary)] md:text-5xl">
                  Running helps you
                  <br />
                  think clearly.{' '}
                  <span className="italic text-[var(--site-text-body)]">That is enough.</span>
                </h2>
              </Reveal>
              <div className="space-y-6 text-lg leading-relaxed text-[var(--site-text-body)]">
                {[
                  'Miles Between is for runners who keep the sport in their week, not at the center of their identity.',
                  'You arrive, run in small guided groups, eat well, and take a full afternoon to recover without guilt.',
                  'The group is capped at 12 so conversation stays easy and the weekend never feels crowded.',
                ].map((text, i) => (
                  <Reveal key={i} delay={0.25 + i * 0.1}>
                    <p>{text}</p>
                  </Reveal>
                ))}
              </div>
            </div>

            <Reveal delay={0.1} y={32}>
              <div className="relative">
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sm">
                  <Image
                    src={brandImagery.home.story.src}
                    alt={brandImagery.home.story.alt}
                    fill
                    className="object-cover object-[center_42%] transition-transform duration-700 hover:scale-[1.03] md:object-center"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                <div className="absolute -bottom-5 -left-5 -z-10 h-36 w-36 rounded-sm bg-[var(--site-border-soft)]" />
                <div className="absolute -right-5 -top-5 -z-10 h-24 w-24 rounded-sm bg-[var(--site-surface-alt)]" />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── THE EXPERIENCE ────────────────────────────────────────────────── */}
      <section className="bg-[var(--site-accent-strong)] py-28 md:py-40">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="mb-20">
            <Reveal delay={0.05}>
              <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-secondary)]">
                The Experience
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <h2 className="font-serif max-w-lg text-4xl font-bold leading-[1.15] text-[var(--site-bg)] md:text-5xl">
                The terrain, the group,
                <br />
                <span className="italic">the time to recover.</span>
              </h2>
            </Reveal>
          </div>

          <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
            {[
              {
                num: '01',
                title: 'Landscape First',
                body: "We start with terrain, not accommodation. Each route is selected because you'd want to run it again.",
                img: brandImagery.cards.environment.src,
                alt: brandImagery.cards.environment.alt,
              },
              {
                num: '02',
                title: 'Good Company',
                body: 'You run with people at a similar effort level, then sit down together for long meals and better conversation.',
                img: brandImagery.cards.running.src,
                alt: brandImagery.cards.running.alt,
              },
              {
                num: '03',
                title: 'Space To Recover',
                body: 'Afternoons are open by design. Pool, spa, a walk, a nap, or nothing at all.',
                img: brandImagery.cards.texture.src,
                alt: brandImagery.cards.texture.alt,
              },
            ].map((card, i) => (
              <Reveal key={card.num} delay={i * 0.12}>
                <div className="group flex flex-col">
                  <div className="mb-6 overflow-hidden rounded-sm">
                    <div className="relative aspect-[3/4] w-full">
                      <Image
                        src={card.img}
                        alt={card.alt}
                        fill
                        className="object-cover transition-all duration-700 ease-out grayscale group-hover:scale-[1.03] group-hover:grayscale-0"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                  </div>
                  <p className="font-ui mb-3 text-xs font-medium tracking-[0.2em] text-[var(--site-text-secondary)]">
                    {card.num}
                  </p>
                  <h3 className="mb-4 font-serif text-2xl font-bold text-[var(--site-bg)]">
                    {card.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--site-on-dark-muted)]">{card.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO IT'S FOR ──────────────────────────────────────────────────── */}
      <section className="bg-[var(--site-surface-alt)] py-28 md:py-40">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-28">
            <Reveal delay={0.05} y={32} className="order-2 lg:order-1">
              <div className="relative aspect-square w-full overflow-hidden rounded-sm">
                <Image
                  src={brandImagery.home.connection.src}
                  alt={brandImagery.home.connection.alt}
                  fill
                  className="object-cover object-[center_40%] transition-transform duration-700 hover:scale-[1.03] md:object-center"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </Reveal>

            <div className="order-1 lg:order-2">
              <Reveal delay={0.1}>
                <p className="font-ui mb-6 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                  Who This Fits
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <h2 className="mb-12 font-serif text-4xl font-bold leading-[1.15] text-[var(--site-text-primary)] md:text-5xl">
                  You run most weeks.
                  <br />
                  <span className="italic">You also have a full life.</span>
                </h2>
              </Reveal>
              <ul className="space-y-7">
                {[
                  'You are comfortable running 10 to 15 km at conversational effort.',
                  'You prefer small groups over big event energy.',
                  'You care about food, place, and people as much as pace.',
                  'You want to come home clearer, not depleted.',
                ].map((item, i) => (
                  <Reveal key={i} delay={0.3 + i * 0.1}>
                    <li className="flex items-start gap-5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--site-cta-bg)]" />
                      <p className="text-lg leading-relaxed text-[var(--site-text-body)]">{item}</p>
                    </li>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FIRST RETREAT SPOTLIGHT ───────────────────────────────────────── */}
      <section className="bg-[var(--site-bg)] py-28 md:py-40">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-24">
            <div>
              <Reveal delay={0.05}>
                <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                  First Retreat
                </p>
              </Reveal>
              <Reveal delay={0.15}>
                <h2 className="mb-4 font-serif text-4xl font-bold leading-[1.15] text-[var(--site-text-primary)] md:text-5xl">
                  The Southern Highlands
                </h2>
              </Reveal>
              <Reveal delay={0.25}>
                <p className="mb-8 text-sm font-medium tracking-wide text-[var(--site-cta-bg)]">
                  Bargo, NSW • 24–27 September 2026
                </p>
              </Reveal>
              <Reveal delay={0.35}>
                <p className="mb-10 text-lg leading-relaxed text-[var(--site-text-body)]">
                  Three nights in Bargo, NSW. Guided runs through Nattai National Park. Limited to
                  12 guests.
                </p>
              </Reveal>
              <Reveal delay={0.4}>
                <Link
                  href="/retreats/sydney-southern-highlands"
                  className="font-ui inline-block bg-[var(--site-cta-bg)] px-8 py-4 text-sm font-medium tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-cta-hover-bg)]"
                >
                  See Full Retreat Details
                </Link>
              </Reveal>
            </div>

            <Reveal delay={0.1} y={32}>
              <div className="relative overflow-hidden">
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-sm">
                  <Image
                    src={brandImagery.home.spotlight.src}
                    alt={brandImagery.home.spotlight.alt}
                    fill
                    className="object-cover object-[center_46%] transition-transform duration-700 hover:scale-[1.03] md:object-center"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
                <div className="absolute bottom-6 left-6 border border-white/30 bg-[var(--site-overlay-strong)] px-5 py-3 backdrop-blur-sm">
                  <p className="text-sm font-medium text-[var(--site-overlay-text)]">Limited to 12 guests</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── REGISTER INTEREST ─────────────────────────────────────────────── */}
      <section id="register" className="bg-[var(--site-surface-elevated)] py-28 md:py-40">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="mx-auto mb-16 max-w-xl text-center">
              <p className="font-ui mb-6 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                Stay in the loop
              </p>
              <h2 className="mb-6 font-serif text-4xl font-bold leading-[1.15] text-[var(--site-text-primary)] md:text-5xl">
                Tell us where to go next.
              </h2>
              <p className="text-lg leading-relaxed text-[var(--site-text-body)]">
                Join the general list and share your location. We will email when a retreat opens
                near you.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mx-auto max-w-xl bg-[var(--site-surface-elevated)] p-8 md:p-10">
              <RegistrationForm
                mode="general"
                source="site:homepage_register"
                submitCtaLabel="Join The Retreat List"
              />
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
