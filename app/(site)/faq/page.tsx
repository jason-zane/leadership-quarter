'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Reveal } from '@/components/site/reveal'
import { MAILTO_FAQ } from '@/utils/brand/contact'

const FAQS = [
  {
    category: 'The Running',
    questions: [
      {
        q: 'What fitness level do I need?',
        a: "You should be comfortable running 10–15 km at a conversational pace. We have two paced groups on every guided run, so you can always choose the shorter option. You don't need to be training for anything. You just need to enjoy running.",
      },
      {
        q: 'Do I need trail running experience?',
        a: "Not specifically. Our routes include single trail and fire roads, nothing highly technical. If you've run on grass, gravel or dirt paths before, you'll be fine. We brief you on the terrain before every run.",
      },
      {
        q: 'What if I need to skip a run?',
        a: "Every session is optional. The estate has a heated pool, a spa, gardens, and a tennis court. There is plenty to do if you'd rather rest. Nobody will make you feel guilty about choosing the spa over a 15 km trail.",
      },
      {
        q: 'How fast are the groups?',
        a: "We split into two groups by comfortable pace, not by speed. The focus is always on the experience of the run, not the time. If you can hold a conversation while running, you're at the right pace.",
      },
    ],
  },
  {
    category: 'The Retreat',
    questions: [
      {
        q: "What's included in the price?",
        a: "Everything except getting there and alcohol. Accommodation, all meals (from Thursday dinner to Sunday lunch), guided runs, pool and spa access, a recovery session, pre-run coffee, ground transport to trailheads, and all activities on the programme.",
      },
      {
        q: "What's not included?",
        a: "Transport to and from the estate (we offer a shared coach from Sydney CBD for $65 return), wine and alcoholic beverages, travel insurance, and personal running gear.",
      },
      {
        q: 'How do I get to the estate?',
        a: "We offer a shared coach departing Sydney CBD on Thursday morning and returning Sunday afternoon. It is $65 return per person. Alternatively, you're welcome to drive. The estate is in Bargo, NSW, approximately 90 minutes from the city.",
      },
      {
        q: 'How many people will be there?',
        a: 'Every retreat is capped at 12 guests. This is intentional. At 12 people, you actually get to know everyone. It also means the estate feels like yours, not like a conference.',
      },
      {
        q: 'What does a typical day look like?',
        a: 'Early coffee and a run (guided, paced groups), then breakfast. The late morning usually has a session, such as a talk, a tasting, or a guest. Lunch. A long, unstructured afternoon at the estate. A good dinner. No pressure on any of it.',
      },
    ],
  },
  {
    category: 'Attending',
    questions: [
      {
        q: 'Can I come on my own?',
        a: "Most guests do. The small group format means you quickly feel at home, and the people you meet on a Miles Between retreat tend to become people you stay in touch with.",
      },
      {
        q: 'Can I come with a friend or partner?',
        a: "Absolutely. Just note that we try to ensure a good mix in the group, so we may place you in different run groups if your paces differ. You'll still have all meals and evenings together.",
      },
      {
        q: "What's the age range?",
        a: "We don't have age restrictions. In practice, guests tend to be in their 30s to 50s, active people with full lives who want to do something genuinely restorative. That said, if running is your thing, you're welcome.",
      },
      {
        q: 'Do you cater for dietary requirements?',
        a: "Yes. All meals are prepared by a dedicated cook and we cater for any dietary requirements. Just let us know when you register your interest and we'll confirm the details before the retreat.",
      },
      {
        q: 'What should I bring?',
        a: "Running kit for 3 days (trail runners are a bonus but not essential), casual clothes for evenings, a water bottle, sunscreen, and anything you'd bring on a comfortable weekend away. We'll send a full packing list when your place is confirmed.",
      },
    ],
  },
  {
    category: 'Booking',
    questions: [
      {
        q: 'How do I book a place?',
        a: "Register your interest on the retreat page. We'll reach out to confirm your place and answer any questions. A $500 deposit then secures your spot, with the remaining balance due 30 days before the retreat.",
      },
      {
        q: 'Is there a waitlist?',
        a: "Yes. If the retreat is full when you register, we'll add you to the waitlist and reach out if a place opens up. We recommend registering early. These retreats fill quickly.",
      },
      {
        q: "What's the cancellation policy?",
        a: "Cancellations more than 60 days before the retreat receive a full refund of the deposit. Between 30–60 days, 50% of the deposit is refunded. Within 30 days, the deposit is non-refundable. We recommend travel insurance for the balance. The full terms are in the retreat terms page and your booking confirmation.",
      },
      {
        q: 'Can I transfer my place to someone else?',
        a: "Yes, with notice. If you need to cancel, let us know as early as possible. We may be able to transfer your place to a waitlisted guest or, with your consent, a person of your choosing.",
      },
    ],
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-[var(--site-border-soft)]">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-6 py-5 text-left"
      >
        <span className="font-medium text-[var(--site-text-primary)]">{q}</span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ duration: 0.22, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mt-0.5 shrink-0 text-[var(--site-accent-strong)]"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="overflow-hidden"
          >
            <p className="pb-6 leading-relaxed text-[var(--site-text-body)]">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FaqPage() {
  return (
    <div className="bg-[var(--site-bg)] text-[var(--site-text-primary)]">
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <section className="bg-[var(--site-accent-strong)] pt-40 pb-24 md:pt-52 md:pb-32">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal delay={0.1}>
            <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.25em] text-[var(--site-text-secondary)]">
              FAQ
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <h1 className="mb-8 font-serif text-5xl font-bold leading-[1.05] text-[var(--site-bg)] md:text-7xl">
              Useful answers
              <br />
              <span className="italic">before you apply.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.35}>
            <p className="max-w-xl text-lg leading-relaxed text-[var(--site-on-dark-muted)]">
              The essentials on running level, schedule, logistics, and booking.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── FAQ SECTIONS ──────────────────────────────────────────────────── */}
      <section className="py-24 md:py-36">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[240px_1fr] lg:gap-24">
            {/* Sticky category nav */}
            <nav className="hidden lg:block">
              <ul className="sticky top-28 space-y-2">
                {FAQS.map((section) => (
                  <li key={section.category}>
                    <a
                      href={`#${section.category.toLowerCase().replace(/\s+/g, '-')}`}
                      className="font-ui block py-1 text-sm text-[var(--site-text-muted)] transition-colors hover:text-[var(--site-cta-bg)]"
                    >
                      {section.category}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-16">
              {FAQS.map((section, si) => (
                <Reveal key={section.category} delay={si * 0.05}>
                  <div id={section.category.toLowerCase().replace(/\s+/g, '-')}>
                    <h2 className="mb-8 font-serif text-2xl font-bold text-[var(--site-text-primary)]">
                      {section.category}
                    </h2>
                    <div>
                      {section.questions.map((item) => (
                        <FaqItem key={item.q} q={item.q} a={item.a} />
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STILL HAVE QUESTIONS ──────────────────────────────────────────── */}
      <section className="bg-[var(--site-surface-alt)] py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
              <div>
                <h2 className="mb-2 font-serif text-3xl font-bold text-[var(--site-text-primary)]">Still need details.</h2>
                <p className="text-lg text-[var(--site-text-body)]">
                  If you need specifics about pace, rooms, or travel, email us directly.
                </p>
                <p className="mt-2 text-sm text-[var(--site-text-muted)]">
                  Retreat terms are available{' '}
                  <Link href="/terms-and-conditions" className="underline hover:no-underline">
                    here
                  </Link>
                  .
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={MAILTO_FAQ}
                  className="font-ui inline-block border border-[var(--site-text-primary)] px-7 py-3.5 text-sm font-medium tracking-[0.02em] text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-cta-bg)] hover:text-[var(--site-cta-text)]"
                >
                  Email Us
                </a>
                <Link
                  href="/retreats/sydney-southern-highlands#register"
                  className="font-ui inline-block bg-[var(--site-cta-bg)] px-7 py-3.5 text-sm font-medium tracking-[0.02em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-cta-hover-bg)]"
                >
                  Apply for This Retreat
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
