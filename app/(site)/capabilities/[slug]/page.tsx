import Image from 'next/image'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Reveal } from '@/components/site/reveal'
import { ImmersiveCtaBand } from '@/components/site/immersive-cta-band'
import { brandImagery } from '@/utils/brand/imagery'
import { servicesBySlug, servicesContent, type ServiceContent } from '@/utils/brand/services-content'

export function generateStaticParams() {
  return servicesContent.map((service) => ({ slug: service.slug }))
}

type Params = {
  slug: string
}

type Props = {
  params: Promise<Params>
}

const capabilityImages = {
  'executive-search': brandImagery.services.executiveSearch,
  'leadership-assessment': brandImagery.services.executiveAssessment,
  'succession-strategy': brandImagery.services.successionPlanning,
  'ai-readiness': brandImagery.services.talentStrategy,
}

const legacyCapabilityRedirects: Record<string, ServiceContent['slug']> = {
  'executive-assessment': 'leadership-assessment',
  'talent-consulting': 'leadership-assessment',
  'talent-strategy': 'leadership-assessment',
  'succession-planning': 'succession-strategy',
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const canonicalSlug = legacyCapabilityRedirects[slug] ?? slug
  const capability = servicesBySlug[canonicalSlug as ServiceContent['slug']]
  if (!capability) return { title: 'Capability' }

  return {
    title: capability.name,
    description: capability.summary,
  }
}

const canonicalSlugs = new Set(['executive-search', 'leadership-assessment', 'succession-strategy', 'ai-readiness'])

export default async function CapabilityDetailPage({ params }: Props) {
  const { slug } = await params
  const legacyRedirectTarget = legacyCapabilityRedirects[slug]
  if (legacyRedirectTarget) {
    redirect(`/capabilities/${legacyRedirectTarget}`)
  }

  if (canonicalSlugs.has(slug)) {
    redirect(`/capabilities/${slug}`)
  }

  const capability = servicesBySlug[slug as ServiceContent['slug']]

  if (!capability) notFound()

  const image = capabilityImages[slug as ServiceContent['slug']]

  return (
    <div className="text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-[1.05fr_0.95fr] md:items-end md:px-12">
          <div>
            <Reveal>
              <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">Capability</p>
              <h1 className="site-heading-display max-w-3xl font-serif text-[clamp(2.8rem,6vw,5.3rem)] text-[var(--site-text-primary)]">
                {capability.name}
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-relaxed text-[var(--site-text-body)]">{capability.summary}</p>
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div className="site-image-frame relative">
              <div className="relative aspect-[4/5] w-full">
                <Image src={image.src} alt={image.alt} fill className="object-cover object-top" sizes="(max-width: 768px) 100vw, 38vw" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[1.15fr_0.85fr] md:px-12">
          <Reveal>
            <div>
              <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">What this solves</p>
              <p className="text-lg leading-relaxed text-[var(--site-text-body)]">{capability.description}</p>

              <p className="font-eyebrow mb-4 mt-10 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Best suited to</p>
              <ul className="space-y-3 text-base leading-relaxed text-[var(--site-text-body)]">
                {capability.audience.map((item) => (
                  <li key={item} className="flex items-baseline gap-1.5">
                    <span className="shrink-0 text-[var(--site-text-muted)]">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <blockquote className="site-card-tint p-7">
              <p className="font-serif text-2xl leading-[1.15] text-[var(--site-text-primary)]">
                &ldquo;Experience matters, but capability, agility, and drive are what sustain leadership performance.&rdquo;
              </p>
              <p className="font-eyebrow mt-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Leadership Quarter approach</p>
            </blockquote>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-6 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">How delivery works</p>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {capability.includes.map((item, index) => (
              <Reveal key={item} delay={index * 0.04}>
                <div className="site-card-primary relative p-6">
                  <span className="font-eyebrow absolute right-4 top-4 text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">
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
            <div className="space-y-8">
              <ImmersiveCtaBand
                eyebrow="Case study"
                title={capability.caseStudy.client}
                description="A representative example of how this capability is delivered in live operating environments."
                primaryHref="/work-with-us#inquiry-form"
                primaryLabel={capability.primaryActionLabel}
              />

              <div className="site-card-strong p-8 md:p-10">
                <div className="grid grid-cols-1 gap-7 md:grid-cols-3">
                <div>
                  <p className="font-eyebrow mb-2 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Challenge</p>
                  <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{capability.caseStudy.challenge}</p>
                </div>
                <div>
                  <p className="font-eyebrow mb-2 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Approach</p>
                  <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{capability.caseStudy.approach}</p>
                </div>
                <div>
                  <p className="font-eyebrow mb-2 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Impact</p>
                  <p className="text-sm leading-relaxed text-[var(--site-text-body)]">{capability.caseStudy.impact}</p>
                </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
