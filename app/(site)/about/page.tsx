import Image from 'next/image'
import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { ImmersiveCtaBand } from '@/components/site/immersive-cta-band'
import { brandImagery } from '@/utils/brand/imagery'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn how Leadership Quarter helps organisations make better leadership decisions through executive search, leadership assessment, succession strategy, and AI readiness.',
}

export default function AboutPage() {
  return (
    <div className="text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">About Leadership Quarter</p>
            <h1 className="site-heading-display max-w-4xl font-serif text-[clamp(2.9rem,7vw,5.6rem)] text-[var(--site-text-primary)]">
              We back leadership decisions
              <span className="block text-[var(--site-accent-strong)]">with capability evidence.</span>
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-12">
          <Reveal>
            <div>
              <p className="font-eyebrow mb-4 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Who we are</p>
              <p className="text-lg leading-relaxed text-[var(--site-text-body)]">
                Leadership Quarter is a specialist consulting partner for boards and executive teams making high-stakes leadership decisions.
              </p>
              <p className="mt-6 text-lg leading-relaxed text-[var(--site-text-body)]">
                Our work is industry and role agnostic. We value experience, but we prioritise core capability, agility, and drive in leaders.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="site-image-frame relative">
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={brandImagery.about.mission.src}
                  alt={brandImagery.about.mission.alt}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 768px) 100vw, 40vw"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-[var(--space-section-y)]">
        <div className="mx-auto max-w-7xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-8 text-xs uppercase tracking-[0.08em] text-[var(--site-text-muted)]">How we support outcomes</p>
          </Reveal>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3 md:auto-rows-fr">
            {[
              {
                title: 'Define what good looks like',
                body: 'We set clear capability criteria for the role, the team, and the stage of business.',
              },
              {
                title: 'Assess for real delivery',
                body: 'We evaluate leaders for judgement, adaptability, and the drive to execute through uncertainty.',
              },
              {
                title: 'Decide with confidence',
                body: 'We align search, succession, and readiness priorities so leadership decisions stay practical, fast, and evidence-led.',
              },
            ].map((item, index) => (
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
