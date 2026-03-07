import Link from 'next/link'

export default function AssessHomePage() {
  return (
    <div className="assess-container">
      <section className="assess-card">
        <p className="assess-kicker">Assessments</p>
        <h1 className="assess-title">Unified assessment experience</h1>
        <p className="assess-subtitle">
          Use an assessment link from your invitation, campaign, or public framework page to begin.
        </p>
        <div className="assess-intro-grid">
          <article className="assess-intro-item">
            <p className="assess-intro-label">Start point</p>
            <p className="assess-intro-copy">Open your invitation or campaign link to launch the assessment flow.</p>
          </article>
          <article className="assess-intro-item">
            <p className="assess-intro-label">Completion</p>
            <p className="assess-intro-copy">When you finish, use the final action to move directly to your results.</p>
          </article>
        </div>
        <div className="assess-intro-cta">
          <Link href="/framework/lq-ai-readiness" className="assess-primary-btn inline-flex">
            Explore frameworks
          </Link>
        </div>
      </section>
    </div>
  )
}
