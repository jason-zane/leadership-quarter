import type { ReactNode } from 'react'
import Link from 'next/link'
import { LQMark } from '@/components/site/lq-mark'
import type { ResolvedCampaignBranding } from '@/utils/assessments/campaign-branding'

type Props = {
  branding: ResolvedCampaignBranding
  children: ReactNode
  contentElement?: 'main' | 'div'
}

function CampaignBrandingHeader({ branding }: { branding: ResolvedCampaignBranding }) {
  if (branding.mode === 'none') return null

  if (branding.mode === 'lq') {
    return (
      <header className="border-b border-[var(--site-header-border)] bg-[var(--site-header-bg)] backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6">
          <div className="inline-flex items-center gap-2.5 text-[var(--site-header-text)]">
            <LQMark className="shrink-0" />
            <span className="font-serif text-lg tracking-[-0.01em]">Leadership Quarter</span>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="border-b border-[var(--site-header-border)] bg-[var(--site-header-bg)] backdrop-blur-md">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6">
        <div className="inline-flex items-center gap-2.5 text-[var(--site-header-text)]">
          {branding.logoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={branding.logoUrl}
              alt={branding.displayName}
              className="max-h-9 max-w-[180px] object-contain"
            />
          ) : (
            <>
              {branding.isLQFallback ? <LQMark className="shrink-0" /> : null}
              <span className="font-serif text-lg tracking-[-0.01em]">{branding.displayName}</span>
            </>
          )}
        </div>
        {branding.showAttribution ? (
          <Link
            href="/"
            className="text-[11px] text-[var(--site-text-muted)] transition-colors hover:text-[var(--site-text-body)]"
          >
            Powered by Leadership Quarter
          </Link>
        ) : null}
      </div>
    </header>
  )
}

export function CampaignBrandingShell({ branding, children, contentElement = 'main' }: Props) {
  const ContentTag = contentElement
  const content = (
    <>
      <CampaignBrandingHeader branding={branding} />
      <ContentTag className="assess-stage">{children}</ContentTag>
    </>
  )

  if (branding.cssOverrides) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: `.site-theme-v1 { ${branding.cssOverrides} }` }} />
        {content}
      </>
    )
  }

  return content
}
