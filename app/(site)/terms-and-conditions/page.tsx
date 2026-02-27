import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms and Conditions | Miles Between',
  description: 'Terms and conditions for Miles Between retreat applications and bookings.',
}

export default function TermsAndConditionsPage() {
  return (
    <div className="bg-[var(--site-bg)] text-[var(--site-text-primary)]">
      <section className="bg-[var(--site-accent-strong)] pt-40 pb-24 md:pt-52 md:pb-32">
        <div className="mx-auto max-w-5xl px-6 md:px-12">
          <p className="font-ui mb-5 text-xs font-medium uppercase tracking-[0.25em] text-[var(--site-text-secondary)]">
            Legal
          </p>
          <h1 className="font-serif text-5xl font-bold leading-[1.05] text-[var(--site-bg)] md:text-7xl">
            Terms and Conditions
          </h1>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl space-y-10 px-6 md:px-12">
          <p className="text-sm text-[var(--site-text-muted)]">Version: February 2026 (v1)</p>

          <div>
            <h2 className="mb-3 font-serif text-2xl font-bold">1. Applications and acceptance</h2>
            <p className="leading-relaxed text-[var(--site-text-body)]">
              Submitting an application does not guarantee a place. Places are confirmed only after
              acceptance and deposit payment instructions are issued by Miles Between.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-2xl font-bold">2. Health and personal responsibility</h2>
            <p className="leading-relaxed text-[var(--site-text-body)]">
              You are responsible for ensuring you are fit to participate. You should seek medical
              advice where appropriate. You participate in all activities at your own risk.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-2xl font-bold">3. Payments and deposits</h2>
            <p className="leading-relaxed text-[var(--site-text-body)]">
              Deposit and final payment dates are provided in your booking confirmation. Your place
              is secured only when the required deposit is received.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-2xl font-bold">4. Cancellations and changes</h2>
            <p className="leading-relaxed text-[var(--site-text-body)]">
              Cancellation terms are supplied with each retreat booking. We may adjust itinerary
              details where required due to weather, safety, or operational reasons.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-2xl font-bold">5. Liability</h2>
            <p className="leading-relaxed text-[var(--site-text-body)]">
              To the maximum extent permitted by law, Miles Between is not liable for indirect or
              consequential loss. Nothing in these terms excludes rights that cannot be excluded
              under applicable law.
            </p>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-2xl font-bold">6. Privacy and communications</h2>
            <p className="leading-relaxed text-[var(--site-text-body)]">
              We collect and use personal information to manage applications, bookings, and retreat
              operations. Marketing communications are optional and can be opted out at any time.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
