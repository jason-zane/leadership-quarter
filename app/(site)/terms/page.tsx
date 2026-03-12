import type { Metadata } from 'next'
import { Reveal } from '@/components/site/reveal'
import { CONTACT_EMAIL_LABEL, MAILTO_GENERAL } from '@/utils/brand/contact'
import { buildPublicMetadata } from '@/utils/site/public-metadata'

export const metadata: Metadata = buildPublicMetadata({
  title: 'Terms',
  description: 'Terms governing the use of the Leadership Quarter public website.',
  path: '/terms',
  noIndex: true,
})

export default function TermsPage() {
  return (
    <div className="text-[var(--site-text-primary)]">
      <section className="relative overflow-hidden pb-20 pt-40 md:pb-24 md:pt-52">
        <div className="relative mx-auto max-w-5xl px-6 md:px-12">
          <Reveal>
            <p className="font-eyebrow mb-5 text-xs uppercase tracking-[0.12em] text-[var(--site-text-secondary)]">Terms</p>
            <h1 className="site-heading-display max-w-4xl font-serif text-[clamp(2.6rem,6.5vw,5rem)] text-[var(--site-text-primary)]">
              Terms for using the Leadership Quarter website.
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-relaxed text-[var(--site-text-body)]">
              These terms apply to your use of the public Leadership Quarter website and its contact and information pages.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-[var(--space-section-y)]">
        <div className="mx-auto max-w-5xl px-6 md:px-12">
          <div className="space-y-5">
            {[
              {
                title: 'Website use',
                body: 'You may use this website to learn about Leadership Quarter and make legitimate business inquiries. You must not misuse the site, interfere with its operation, or attempt to access areas that are not intended for you.',
              },
              {
                title: 'Information and materials',
                body: 'The information on this site is provided for general information only. While we aim for accuracy, we do not guarantee that every page, statement, or resource is complete, current, or suitable for every situation.',
              },
              {
                title: 'No advice or engagement',
                body: 'Nothing on this site creates a consulting, search, assessment, employment, or advisory engagement unless explicitly agreed in writing.',
              },
              {
                title: 'Intellectual property',
                body: 'Unless otherwise stated, Leadership Quarter owns or controls the content, design, and branding on this site. You may not reproduce or republish site materials in a misleading or commercial way without permission.',
              },
              {
                title: 'Contact',
                body: `For questions about these terms, contact ${CONTACT_EMAIL_LABEL}.`,
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
            <p className="mt-6 text-sm leading-relaxed text-[var(--site-text-body)]">
              Questions can be sent to{' '}
              <a href={MAILTO_GENERAL} className="font-medium text-[var(--site-link)] underline decoration-[0.08em] underline-offset-4">
                {CONTACT_EMAIL_LABEL}
              </a>
              .
            </p>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
