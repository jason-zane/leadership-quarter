import type { ReactNode } from 'react'
import type { RunnerConfig } from '@/utils/assessments/experience-config'
import type {
  AssessmentExperienceBlock,
  AssessmentExperienceConfig,
  AssessmentExperienceEssentialItem,
  AssessmentExperienceExpectationItem,
} from '@/utils/assessments/assessment-experience-config'

function resolveEssentialValue(item: AssessmentExperienceEssentialItem, runnerConfig: RunnerConfig) {
  if (item.kind === 'time') {
    return `${runnerConfig.estimated_minutes} minute assessment`
  }

  if (item.kind === 'format' && !item.value) {
    return 'One prompt at a time with a simple five-point scale.'
  }

  if (item.kind === 'outcome' && !item.value) {
    return runnerConfig.data_collection_only
      ? 'A clean record of your responses for internal analysis.'
      : 'A clear profile and practical next steps after completion.'
  }

  return item.value
}

function ExperienceButton({
  label,
  disabled,
  onClick,
}: {
  label: string
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="assess-v2-primary-btn"
    >
      {label}
    </button>
  )
}

function ExpectationCard({ item, index }: { item: AssessmentExperienceExpectationItem; index: number }) {
  return (
    <article className="assess-v2-expectation-card site-card-sub">
      <p className="assess-v2-expectation-step">0{index + 1}</p>
      <h4>{item.title}</h4>
      <p>{item.body}</p>
    </article>
  )
}

function ExperienceBlockView({
  block,
  runnerConfig,
}: {
  block: AssessmentExperienceBlock
  runnerConfig: RunnerConfig
}) {
  if (block.type === 'essentials') {
    return (
      <div className="assess-v2-block-essentials site-card-strong">
        <p className="assess-v2-section-kicker">Essentials</p>
        <div className="assess-v2-essential-grid">
          {block.items.map((item) => (
            <article key={item.id} className="assess-v2-essential-card site-card-sub">
              <p className="assess-v2-essential-label">{item.label}</p>
              <p className="assess-v2-essential-value">{resolveEssentialValue(item, runnerConfig)}</p>
            </article>
          ))}
        </div>
      </div>
    )
  }

  if (block.type === 'expectation_flow') {
    return (
      <div className="assess-v2-block-expectations site-card-strong">
        <p className="assess-v2-section-kicker">What to expect</p>
        <div className="assess-v2-expectation-grid">
          {block.items.map((item, index) => (
            <ExpectationCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="assess-v2-trust-note">
      <p className="assess-v2-section-kicker">{block.eyebrow}</p>
      <h3>{block.title}</h3>
      <p>{block.body}</p>
      {runnerConfig.support_contact_email ? (
        <p className="assess-v2-support-note">Need help? {runnerConfig.support_contact_email}</p>
      ) : null}
    </div>
  )
}

export function AssessmentOpeningPanel({
  runnerConfig,
  experienceConfig,
  title,
  subtitle,
  intro,
  ctaLabel,
  onCtaClick,
}: {
  runnerConfig: RunnerConfig
  experienceConfig: AssessmentExperienceConfig
  title: string
  subtitle: string
  intro: string
  ctaLabel?: string
  onCtaClick?: () => void
}) {
  const hasBlocks = experienceConfig.openingBlocks.length > 0

  return (
    <section className="assess-v2-opening">
      <div className="assess-v2-hero">
        <div className="assess-v2-hero-top">
          {intro ? <p className="assess-v2-eyebrow">{intro}</p> : <span />}
          <span className="assess-v2-time-badge">~{runnerConfig.estimated_minutes} min</span>
        </div>
        <div className="assess-v2-hero-copy">
          <h1 className="assess-v2-title">{title}</h1>
          {subtitle ? <p className="assess-v2-subtitle">{subtitle}</p> : null}
        </div>
        {ctaLabel ? (
          <div className="assess-v2-hero-cta">
            <ExperienceButton label={ctaLabel} onClick={onCtaClick} />
          </div>
        ) : null}
      </div>

      {hasBlocks ? (
        <div className="assess-v2-opening-stack">
          {experienceConfig.openingBlocks.map((block) => (
            <ExperienceBlockView key={block.id} block={block} runnerConfig={runnerConfig} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export function AssessmentQuestionPanelHeader({
  experienceConfig,
}: {
  experienceConfig: AssessmentExperienceConfig
}) {
  const hasContent =
    experienceConfig.questionIntroEyebrow ||
    experienceConfig.questionIntroTitle ||
    experienceConfig.questionIntroBody

  if (!hasContent) return null

  return (
    <div className="assess-v2-question-intro">
      {experienceConfig.questionIntroEyebrow ? <p className="assess-v2-section-kicker">{experienceConfig.questionIntroEyebrow}</p> : null}
      <div>
        {experienceConfig.questionIntroTitle ? <h2>{experienceConfig.questionIntroTitle}</h2> : null}
        {experienceConfig.questionIntroBody ? <p>{experienceConfig.questionIntroBody}</p> : null}
      </div>
    </div>
  )
}

export function AssessmentFinalisingPanel({
  experienceConfig,
}: {
  experienceConfig: AssessmentExperienceConfig
}) {
  return (
    <section className="assess-v2-state-panel">
      {experienceConfig.finalisingKicker ? <p className="assess-v2-section-kicker">{experienceConfig.finalisingKicker}</p> : null}
      <h2 className="assess-v2-state-title">{experienceConfig.finalisingTitle}</h2>
      {experienceConfig.finalisingBody ? <p className="assess-v2-state-body">{experienceConfig.finalisingBody}</p> : null}
      <div className="assess-v2-status-line" aria-live="polite">
        <span className="assess-v2-status-pulse" aria-hidden="true" />
        <span>{experienceConfig.finalisingStatusLabel}</span>
      </div>
    </section>
  )
}

export function AssessmentCompletionPanel({
  title,
  body,
  cta,
  action,
}: {
  title: string
  body: string
  cta: string
  action: ReactNode
}) {
  return (
    <section className="assess-v2-state-panel assess-v2-completion-panel">
      <h2 className="assess-v2-state-title">{title}</h2>
      {body ? <p className="assess-v2-state-body">{body}</p> : null}
      <div className="assess-v2-completion-action" data-cta-label={cta}>
        {action}
      </div>
    </section>
  )
}

export function AssessmentPreviewAction({
  label,
  secondary,
}: {
  label: string
  secondary?: boolean
}) {
  return (
    <button
      type="button"
      className={secondary ? 'assess-v2-secondary-btn' : 'assess-v2-primary-btn'}
    >
      {label}
    </button>
  )
}
