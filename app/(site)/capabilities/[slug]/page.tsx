import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Reveal } from '@/components/site/reveal'
import { TransitionLink } from '@/components/site/transition-link'
import { brandImagery } from '@/utils/brand/imagery'
import { servicesBySlug, servicesContent, type ServiceContent } from '@/utils/brand/services-content'

export function generateStaticParams() {
  return servicesContent.map((service) => ({ slug: service.slug }))
}

type Params = {
  slug: ServiceContent['slug']
}

type Props = {
  params: Promise<Params>
}

const capabilityImages = {
  'executive-search': brandImagery.services.executiveSearch,
  'talent-consulting': brandImagery.services.talentConsulting,
  'executive-assessment': brandImagery.services.executiveAssessment,
  'succession-planning': brandImagery.services.successionPlanning,
  'talent-strategy': brandImagery.services.talentStrategy,
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const capability = servicesBySlug[slug]
  if (!capability) return { title: 'Capability' }

  return {
    title: capability.name,
    description: capability.summary,
  }
}

export default async function CapabilityDetailPage({ params }: Props) {
  const { slug } = await params
  const capability = servicesBySlug[slug]

  if (!capability) notFound()

  const image = capabilityImages[slug]
  const mailtoHref = `mailto:hello@leadershipquarter.com?subject=${encodeURIComponent(capability.contactSubject)}`

  return (
    <div className="bg-[var(--site-bg)] text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-24 pt-40 md:pb-30 md:pt-52" style={{ background: 'var(--site-gradient-stage)' }}>
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-[1.05fr_0.95fr] md:items-end md:px-12">
          <div>
            <Reveal>
              <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.28em] text-[var(--site-text-secondary)]">Capability</p>
              <h1 className="max-w-3xl font-serif text-[clamp(2.8rem,6vw,5.6rem)] leading-[0.93] text-[var(--site-text-primary)]">
                {capability.name}
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-relaxed text-[var(--site-text-body)]">{capability.summary}</p>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="relative overflow-hidden rounded-[var(--radius-panel)] shadow-[var(--shadow-lifted)]">
              <div className="relative aspect-[4/5] w-full">
                <Image src={image.src} alt={image.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 38vw" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[1.15fr_0.85fr] md:px-12">
          <Reveal>
            <div>
              <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.2em] text-[var(--site-text-muted)]">What this solves</p>
              <p className="text-lg leading-relaxed text-[var(--site-text-body)]">{capability.description}</p>

              <p className="font-eyebrow mb-4 mt-10 text-xs uppercase tracking-[0.2em] text-[var(--site-text-muted)]">Best suited to</p>
              <ul className="space-y-3 text-base leading-relaxed text-[var(--site-text-body)]">
                {capability.audience.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <blockquote className="rounded-[var(--radius-card)] border border-[var(--site-border-soft)] bg-[var(--site-blueprint-tint)] p-7 shadow-[var(--shadow-soft)]">
              <p className="font-serif text-2xl leading-[1.15] text-[var(--site-text-primary)]">
                &ldquo;Experience matters, but capability, agility, and drive are what sustain leadership performance.&rdquo;
              </p>
              <p className="font-eyebrow mt-4 text-xs uppercase tracking-[0.2em] text-[var(--site-text-muted)]">Leadership Quarter approach</p>
            </blockquote>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-6 text-xs uppercase tracking-[0.2em] text-[var(--site-text-muted)]">How delivery works</p>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {capability.includes.map((item, index) => (
              <Reveal key={item} delay={index * 0.04}>
                <div className="relative rounded-[var(--radius-card)] border border-[var(--site-border-soft)] bg-[var(--site-surface-elevated)] p-6 shadow-[var(--shadow-lifted)]">
                  <span className="font-eyebrow absolute right-4 top-4 text-[11px] uppercase tracking-[0.2em] text-[var(--site-text-muted)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <p className="max-w-[88%] leading-relaxed text-[var(--site-text-body)]">{item}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <div className="rounded-[var(--radius-panel)] border border-[var(--site-border-soft)] bg-[var(--site-surface-elevated)] p-8 shadow-[var(--shadow-lifted)] md:p-12">
              <p className="font-eyebrow text-xs uppercase tracking-[0.2em] text-[var(--site-text-muted)]">Case study</p>
              <h2 className="mt-4 font-serif text-3xl text-[var(--site-text-primary)] md:text-4xl">{capability.caseStudy.client}</h2>

              <div className="mt-8 grid grid-cols-1 gap-7 md:grid-cols-3">
                <div>
                  <p className="font-eyebrow mb-2 text-xs uppercase tracking-[0.2em] text-[var(--site-text-muted)]">Challenge</p>
                  <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{capability.caseStudy.challenge}</p>
                </div>
                <div>
                  <p className="font-eyebrow mb-2 text-xs uppercase tracking-[0.2em] text-[var(--site-text-muted)]">Approach</p>
                  <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{capability.caseStudy.approach}</p>
                </div>
                <div>
                  <p className="font-eyebrow mb-2 text-xs uppercase tracking-[0.2em] text-[var(--site-text-muted)]">Impact</p>
                  <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{capability.caseStudy.impact}</p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-10 flex flex-wrap gap-4">
              <TransitionLink
                href="/contact"
                className="font-cta inline-block rounded-[var(--radius-pill)] bg-[var(--site-primary)] px-7 py-3 text-sm font-semibold tracking-[0.03em] text-[var(--site-cta-text)] transition-colors hover:bg-[var(--site-primary-hover)]"
              >
                {capability.primaryActionLabel}
              </TransitionLink>
              <a
                href={mailtoHref}
                className="font-cta inline-block rounded-[var(--radius-pill)] border border-[var(--site-border)] px-7 py-3 text-sm font-semibold tracking-[0.03em] text-[var(--site-text-primary)] transition-colors hover:bg-[var(--site-surface-elevated)]"
              >
                Speak with a capability lead
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
