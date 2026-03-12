import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { CONTACT_EMAIL_LABEL, CONTACT_LOCATION, MAILTO_GENERAL } from '@/utils/brand/contact'
import { buildPublicMetadata } from '@/utils/site/public-metadata'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Privacy',
  description: 'How Leadership Quarter collects, uses, and handles personal information provided through this website.',
  path: '/privacy',
  noIndex: true,
})

export default function PrivacyPage() {
  return (
    <div className="text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto max-w-5xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">Privacy</p>
            <h1 className="site-heading-display max-w-4xl font-serif text-[clamp(2.6rem,6.5vw,5rem)] text-[var(--site-text-primary)]">
              How Leadership Quarter handles personal information.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-[var(--site-text-body)]">
              This website is intended to help organisations and individuals learn about Leadership Quarter and contact us about executive search, leadership assessment, succession, and AI readiness work.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-[var(--space-section-y)]">
        <div className="mx-auto max-w-5xl px-6 md:px-12">
          <div className="space-y-5">
            {[
              {
                title: 'What we collect',
                body: 'If you contact us through the inquiry form, we may collect your name, work email, organisation, role, topic of inquiry, and any details you choose to share in your message.',
              },
              {
                title: 'How we use it',
                body: 'We use this information to review your inquiry, respond to you, and manage follow-up conversations related to Leadership Quarter services.',
              },
              {
                title: 'How long we keep it',
                body: 'We retain inquiry information for as long as reasonably necessary to manage the relevant relationship, respond to requests, and maintain business records.',
              },
              {
                title: 'Third-party services',
                body: 'This site uses analytics and service providers that help us operate the website and manage inquiry workflows. Information may be processed by those providers to support these purposes.',
              },
              {
                title: 'Questions or requests',
                body: `If you would like to ask about your information or request an update, contact ${CONTACT_EMAIL_LABEL}.`,
              },
            ].map((section, index) => (
              <Reveal key={section.title} delay={index * 0.04}>
                <section className={index % 2 === 0 ? 'site-card-primary p-7' : 'site-card-tint p-7'}>
                  <h2 className="font-serif text-3xl leading-[1.08] text-[var(--site-text-primary)]">{section.title}</h2>
                  <p className="mt-4 leading-relaxed text-[var(--site-text-body)]">{section.body}</p>
                </section>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <div className="site-card-sub mt-6 p-6">
              <p className="font-eyebrow text-[11px] uppercase tracking-[0.08em] text-[var(--site-text-muted)]">Contact</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--site-text-body)]">
                Leadership Quarter
                <br />
                {CONTACT_LOCATION}
                <br />
                <a href={MAILTO_GENERAL} className="font-medium text-[var(--site-link)] underline decoration-[0.08em] underline-offset-4">
                  {CONTACT_EMAIL_LABEL}
                </a>
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
