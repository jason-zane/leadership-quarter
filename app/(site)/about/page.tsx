import Image from 'next/image'
import type { Metadata } from 'next'
import { StructuredData } from '@/components/site/structured-data'
import { Reveal } from '@/components/site/reveal'
import { ImmersiveCtaBand } from '@/components/site/immersive-cta-band'
import { brandImagery } from '@/utils/brand/imagery'
import { buildPublicMetadata } from '@/utils/site/public-metadata'
import { getBreadcrumbSchema, getPersonSchema } from '@/utils/site/structured-data'

export const metadata: Metadata = buildPublicMetadata({
  title: 'About',
  description:
    'Leadership Quarter combines executive search discipline, assessment rigour, and operating perspective to help clients make better leadership decisions.',
  path: '/about',
})

const approachCards = [
  {
    title: 'Search expertise',
    body: 'Structured executive search design, leadership market mapping, and disciplined candidate qualification.',
  },
  {
    title: 'Operating perspective',
    body: 'A practical understanding of what leaders face inside scaling organisations and changing business environments.',
  },
  {
    title: 'Judgement and assessment',
    body: 'Evidence-led evaluation of capability, judgement, agility, and drive so decisions are stronger than CV fit alone.',
  },
]

export default function AboutPage() {
  return (
    <div className="text-[var(--site-text-primary)]">
      <StructuredData
        data={[
          getBreadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'About', path: '/about' },
          ]),
          getPersonSchema(),
        ]}
      />
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">About Leadership Quarter</p>
            <h1 className="site-heading-display max-w-4xl font-serif text-[clamp(2.9rem,7vw,5.6rem)] text-[var(--site-text-primary)]">
              A specialist partner for
              <span className="block text-[var(--site-accent-strong)]">executive search and leadership assessment.</span>
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-[var(--site-text-body)]">
              Leadership Quarter supports boards, CEOs, founders, and executive teams on pivotal appointments, assessment, and succession decisions where judgement, evidence, and context all matter.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-12">
          <Reveal delay={0.1}>
            <div className="site-image-frame relative">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={brandImagery.about.mission.src}
                  alt={brandImagery.about.mission.alt}
                  fill
                  priority
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div>
              <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Who we are</p>
              <h2 className="font-serif text-[clamp(2.2rem,4vw,3.5rem)] leading-[1.02] text-[var(--site-text-primary)]">
                Search discipline with a practical operating perspective.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-[var(--site-text-body)]">
                Leadership Quarter focuses on executive search, leadership assessment, and related talent decisions where the quality of judgement matters as much as speed.
              </p>
              <p className="mt-6 text-lg leading-relaxed text-[var(--site-text-body)]">
                The work is grounded in business context. Roles are considered against company stage, strategic priorities, and the leadership challenges ahead, so appointments are shaped around what the business actually needs next.
              </p>
              <p className="mt-6 text-lg leading-relaxed text-[var(--site-text-body)]">
                That combination of structured search discipline and practical operating perspective helps clients make clearer, lower-risk leadership decisions.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">What shapes the way we work</p>
            <h2 className="site-heading-section max-w-4xl font-serif text-[clamp(2rem,4.3vw,3.4rem)] text-[var(--site-text-primary)]">
              A more nuanced understanding of
              <span className="block text-[var(--site-accent-strong)]">leadership hiring in practice.</span>
            </h2>
            <p className="mt-5 max-w-3xl leading-relaxed text-[var(--site-text-body)]">
              Leadership Quarter combines search expertise with direct experience inside operating businesses. The result is a search process that balances rigour with commercial practicality and keeps leadership choices tied to execution reality.
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3 md:auto-rows-fr">
            {approachCards.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.06}>
                <div
                  className={`h-full rounded-[var(--radius-card)] p-7 ${
                    index === 1 ? 'site-card-tint' : 'site-card-primary'
                  }`}
                >
                  <h2 className="font-serif text-2xl leading-[1.12] tracking-[-0.006em] text-[var(--site-text-primary)]">{item.title}</h2>
                  <p className="mt-3 leading-relaxed text-[var(--site-text-body)]">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.18}>
            <p className="mt-6 max-w-3xl text-base leading-relaxed text-[var(--site-text-body)]">
              The aim is simple: to help organisations identify and hire leaders capable of delivering what comes next.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 md:grid-cols-[0.72fr_1.28fr] md:items-center md:px-12">
          <Reveal delay={0.04}>
            <div className="site-image-frame relative max-w-[20rem]">
              <div className="relative aspect-square w-full">
                <Image
                  src={brandImagery.about.partner.src}
                  alt={brandImagery.about.partner.alt}
                  fill
                  className="object-cover object-center"
                  sizes="(max-width: 768px) 65vw, 20rem"
                />
              </div>
            </div>
          </Reveal>

          <Reveal>
            <div className="site-card-sub p-7 md:p-8">
              <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Your LQ partner</p>
              <h2 className="font-serif text-[clamp(2rem,3.8vw,3rem)] leading-[1.04] text-[var(--site-text-primary)]">Jason Hunt</h2>
              <p className="mt-2 text-base font-medium text-[var(--site-text-secondary)]">Partner | Leadership Quarter</p>
              <p className="mt-5 leading-relaxed text-[var(--site-text-body)]">
                Jason has spent his career in executive search, leadership assessment, and senior talent selection, working both in-house and within leading search firms. He partners with CEOs, founders, and boards to identify and appoint leaders who drive meaningful business outcomes.
              </p>
              <p className="mt-5 leading-relaxed text-[var(--site-text-body)]">
                He holds a master&apos;s degree in organisational psychology. Outside of work, Jason is a former professional triathlete and now an elite marathon runner and world record holder, bringing the same discipline and performance mindset to his work.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <ImmersiveCtaBand
              eyebrow="Next step"
              title="Need a clearer view of leadership capability?"
              description="Share the role, transition, or capability gap you are solving and we will respond with a practical path forward."
              primaryHref="/work-with-us#inquiry-form"
              primaryLabel="Talk to Leadership Quarter"
            />
          </Reveal>
        </div>
      </section>
    </div>
  )
}
