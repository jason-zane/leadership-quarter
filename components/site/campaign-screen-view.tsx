import { CampaignContentBlocks } from '@/components/site/campaign-content-blocks'
import type { CampaignScreenContentBlock } from '@/utils/assessments/campaign-types'

type Props = {
  eyebrow?: string
  title: string
  description?: string
  blocks?: CampaignScreenContentBlock[]
  action?: React.ReactNode
  variant?: 'standard' | 'transition' | 'minimal' | 'completion'
}

export function CampaignScreenView({
  eyebrow = '',
  title,
  description = '',
  blocks = [],
  action,
  variant = 'standard',
}: Props) {
  return (
    <section
      className={[
        variant === 'minimal'
          ? 'rounded-[2rem] border border-[var(--site-border-soft)] bg-white/90 p-6 md:p-8'
          : 'site-card-strong overflow-hidden p-6 md:p-8',
        variant === 'transition'
          ? 'bg-[var(--site-panel-transition-bg)]'
          : '',
        variant === 'completion'
          ? 'assess-v2-completion-panel'
          : '',
      ].join(' ')}
    >
      {eyebrow ? (
        <p className="assess-v2-eyebrow">{eyebrow}</p>
      ) : null}
      <h2 className="mt-3 font-serif text-[clamp(1.8rem,3.7vw,3rem)] leading-[1.06] text-[var(--site-text-primary)]">
        {title}
      </h2>
      {description ? (
        <p className="mt-4 whitespace-pre-line leading-relaxed text-[var(--site-text-body)]">
          {description}
        </p>
      ) : null}

      <CampaignContentBlocks blocks={blocks} />

      {action ? (
        <div className={variant === 'completion' ? 'mt-8' : 'mt-7'}>
          {action}
        </div>
      ) : null}
    </section>
  )
}
