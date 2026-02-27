import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Reveal } from '@/components/site/reveal'
import { brandImagery } from '@/utils/brand/imagery'

export const metadata: Metadata = {
  title: 'Experience | Miles Between',
  description:
    'What a Miles Between retreat actually feels like. The running, the food, the people, the rest.',
}

const PILLARS = [
  {
    num: '01',
    title: 'Reset',
    body: 'Mornings have movement. Afternoons have space. Pool, walk, nap, or nothing at all, without needing to justify it.',
    img: brandImagery.experience.rest.src,
    alt: brandImagery.experience.rest.alt,
  },
  {
    num: '02',
    title: 'Community',
    body: 'Small groups change everything. You remember names quickly, settle in fast, and leave with people you would run with again.',
    img: brandImagery.experience.company.src,
    alt: brandImagery.experience.company.alt,
  },
  {
    num: '03',
    title: 'The Table',
    body: 'Meals are a real part of the retreat: good food, enough time, and long conversations that are never rushed.',
    img: brandImagery.experience.table.src,
    alt: brandImagery.experience.table.alt,
  },
  {
    num: '04',
    title: 'The Running',
    body: 'Guided routes are paced by conversational effort. You choose your distance window. No race-day atmosphere.',
    img: brandImagery.experience.running.src,
    alt: brandImagery.experience.running.alt,
  },
]

const PROGRAMME = [
  {
    day: 'Thursday',
    events: [
      { time: 'Morning', label: 'Travel and arrival window' },
      { time: 'Afternoon', label: 'Settle in, meet the group, orient to the retreat flow' },
      { time: 'Evening', label: 'Shared welcome meal and easy start' },
    ],
  },
  {
    day: 'Friday',
    events: [
      { time: 'Morning', label: 'Guided route options with conversational pacing' },
      { time: 'Midday', label: 'Brunch or lunch and a practical group touchpoint' },
      { time: 'Afternoon', label: 'Open recovery: pool, walk, nap, or quiet time' },
      { time: 'Evening', label: 'Dinner and social time' },
    ],
  },
  {
    day: 'Saturday',
    events: [
      { time: 'Morning', label: 'Longer route options or alternative movement session' },
      { time: 'Midday', label: 'Late meal and unhurried reset' },
      { time: 'Afternoon', label: 'Flexible downtime tailored to your energy' },
      { time: 'Evening', label: 'Casual final-night dinner' },
    ],
  },
  {
    day: 'Sunday',
    events: [
      { time: 'Morning', label: 'Optional movement, breakfast, and closeout' },
      { time: 'Midday', label: 'Departure and return travel' },
      { time: 'Afternoon', label: 'Land home with clear next steps for your running week' },
    ],
  },
]

export default function ExperiencePage() {
  return (
    <div className="bg-[var(--site-bg)] text-[var(--site-text-primary)]">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--site-accent-strong)] pt-40 pb-24 md:pt-52 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal delay={0.1}>
            <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.25em] text-[var(--site-text-secondary)]">
              The Experience
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <h1 className="mb-8 font-serif text-5xl font-bold leading-[1.05] text-[var(--site-bg)] md:text-7xl">
              What a retreat
              <br />
              <span className="italic">looks like, hour by hour.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.35}>
            <p className="max-w-xl text-lg leading-relaxed text-[var(--site-on-dark-muted)]">
              Three nights. Three guided runs. Long meals. Open afternoons. A small group where you
              can switch off quickly.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── FOUR PILLARS ──────────────────────────────────────────────────── */}
      <section className="py-20 md:py-30">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="mb-14">
              <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                What makes it work
              </p>
              <h2 className="font-serif text-4xl font-bold leading-[1.15] text-[var(--site-text-primary)] md:text-5xl">
                Four parts that make the weekend work.
              </h2>
            </div>
          </Reveal>

          <div className="space-y-16 md:space-y-20">
            {PILLARS.map((pillar, i) => (
              <Reveal key={pillar.num} delay={0.1}>
                <div
                  className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14`}
                >
                  <div className={i % 2 === 1 ? 'order-1 lg:order-2' : ''}>
                    <p className="font-ui mb-3 text-xs font-medium tracking-[0.25em] text-[var(--site-text-muted)]">
                      {pillar.num}
                    </p>
                    <h2 className="mb-4 font-serif text-3xl font-bold text-[var(--site-text-primary)] md:text-4xl">
                      {pillar.title}
                    </h2>
                    <p className="text-base leading-relaxed text-[var(--site-text-body)] md:text-lg">{pillar.body}</p>
                  </div>
                  <div className={i % 2 === 1 ? 'order-2 lg:order-1' : ''}>
                    <div className="relative aspect-[16/10] w-full overflow-hidden rounded-sm">
                      <Image
                        src={pillar.img}
                        alt={pillar.alt}
                        fill
                        className={`object-cover transition-transform duration-700 hover:scale-[1.03] ${
                          pillar.num === '02'
                            ? 'object-[center_58%] md:object-center'
                            : pillar.num === '04'
                              ? 'object-[center_62%] md:object-center'
                              : 'object-center'
                        }`}
                        sizes="(max-width: 1024px) 100vw, 50vw"
                      />
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE PROGRAMME ─────────────────────────────────────────────────── */}
      <section className="bg-[var(--site-surface-alt)] py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="mb-16">
              <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                The Programme
              </p>
              <h2 className="font-serif text-4xl font-bold leading-[1.15] text-[var(--site-text-primary)] md:text-5xl">
                Thursday to Sunday.
                <br />
                <span className="italic">A rhythm that stays flexible.</span>
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--site-text-body)]">
                Think of this as a guide to the flow of each day, not a rigid schedule. Exact details
                shift with location, weather, and group energy.
              </p>
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:auto-rows-fr">
            {PROGRAMME.map((day, i) => (
              <Reveal key={day.day} delay={i * 0.1}>
                <div className={`h-full p-8 ${i % 2 === 0 ? 'bg-[var(--site-surface-soft)]' : 'bg-[color:var(--site-cta-soft)]'}`}>
                  <h3 className="mb-6 font-serif text-2xl font-bold text-[var(--site-text-primary)]">{day.day}</h3>
                  <div className="flex h-[calc(100%-3.5rem)] flex-col justify-start space-y-4">
                    {day.events.map((event) => (
                      <div key={event.label} className="flex gap-4">
                        <span className="font-ui w-20 shrink-0 pt-0.5 text-xs font-medium text-[var(--site-text-muted)]">
                          {event.time}
                        </span>
                        <span className="text-sm leading-relaxed text-[var(--site-text-body)]">
                          {event.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <p className="mt-6 text-sm text-[var(--site-text-muted)]">
              Programme is indicative and may vary by retreat and location.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── NOT A TRAINING CAMP ───────────────────────────────────────────── */}
      <section className="bg-[var(--site-accent-strong)] py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:gap-24">
            <Reveal>
              <div>
                <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.2em] text-[var(--site-text-secondary)]">
                  Worth knowing
                </p>
                <h2 className="mb-8 font-serif text-4xl font-bold leading-[1.15] text-[var(--site-bg)] md:text-5xl">
                  This is not a training camp.
                </h2>
                <p className="text-lg leading-relaxed text-[var(--site-on-dark-muted)]">
                  We do not track your splits or run drill blocks at dawn. We focus on route
                  quality, pacing, and recovery so the weekend feels strong without becoming rigid.
                </p>
                <p className="mt-6 text-lg leading-relaxed text-[var(--site-on-dark-muted)]">
                  You should be comfortable running 10–15 km. Beyond that, we'd love to have you.
                </p>
              </div>
            </Reveal>
            <div className="space-y-6">
              {[
                {
                  q: 'What fitness level do I need?',
                  a: 'You should be comfortable running 10–15 km at a conversational pace. We have two paced groups on every run, so the exact distance and speed is always flexible.',
                },
                {
                  q: 'How are pace groups handled?',
                  a: 'We group by conversational effort, not by speed targets. Route options are designed so each group stays comfortable and included.',
                },
                {
                  q: 'What if I need to skip a run?',
                  a: 'No problem. The estate has plenty to enjoy without the runs. Every session is optional, and nobody will make you feel guilty for choosing the spa.',
                },
              ].map((item, i) => (
                <Reveal key={item.q} delay={i * 0.1}>
                  <div className="border-t border-[var(--site-bg)]/10 pt-6">
                    <p className="mb-2 font-medium text-[var(--site-bg)]">{item.q}</p>
                    <p className="text-sm leading-relaxed text-[var(--site-on-dark-muted)]">{item.a}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--site-bg)] py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="mb-6 font-serif text-4xl font-bold text-[var(--site-text-primary)]">
                The Southern Highlands retreat.
              </h2>
              <p className="mb-10 text-lg leading-relaxed text-[var(--site-text-body)]">
                Our first retreat is in the Southern Highlands, September 2026. Twelve places.
              </p>
              <Link
                href="/retreats"
                className="font-ui inline-block bg-[var(--site-cta-bg)] px-8 py-4 text-sm font-medium tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-cta-hover-bg)]"
              >
                Apply for the Southern Highlands Retreat
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
