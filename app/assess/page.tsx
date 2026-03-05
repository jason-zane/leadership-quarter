import Link from 'next/link'

export default function AssessHomePage() {
  return (
    <section className="assess-card">
      <p className="assess-kicker">Assessments</p>
      <h1 className="assess-title">Unified assessment experience</h1>
      <p className="assess-subtitle">
        Use an assessment link from your invitation, campaign, or public framework page to begin.
      </p>
      <div className="mt-4">
        <Link href="/framework/lq-ai-readiness" className="assess-primary-btn inline-flex">
          Back to frameworks
        </Link>
      </div>
    </section>
  )
}
