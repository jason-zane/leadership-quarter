import Link from 'next/link'
import { LQMark } from '@/components/site/lq-mark'
import { createAdminClient } from '@/utils/supabase/admin'
import { resolveCampaignBranding } from '@/utils/assessments/campaign-branding'

export default async function CampaignLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string; campaignSlug: string }>
}) {
  const { campaignSlug } = await params

  const adminClient = createAdminClient()

  let config: unknown = null
  let org: { name: string; slug: string; branding_config: unknown } | null = null

  if (adminClient) {
    const { data } = await adminClient
      .from('campaigns')
      .select('config, organisations(name, slug, branding_config)')
      .eq('slug', campaignSlug)
      .maybeSingle()

    if (data) {
      config = data.config
      org = (data.organisations as unknown as { name: string; slug: string; branding_config: unknown } | null) ?? null
    }
  }

  const { mode, logoUrl, displayName, cssOverrides, showAttribution, isLQFallback } =
    resolveCampaignBranding({
      config,
      organisation: org,
    })

  if (mode === 'none') {
    return <main className="assess-stage">{children}</main>
  }

  if (mode === 'lq') {
    return (
      <>
        <header className="border-b border-[var(--site-border-soft)] bg-[rgba(255,255,255,0.72)] backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6">
            <div className="inline-flex items-center gap-2.5 text-[var(--site-text-primary)]">
              <LQMark className="shrink-0" />
              <span className="font-serif text-lg tracking-[-0.01em]">Leadership Quarter</span>
            </div>
          </div>
        </header>
        <main className="assess-stage">{children}</main>
      </>
    )
  }

  return (
    <>
      {cssOverrides && (
        <style dangerouslySetInnerHTML={{ __html: `.site-theme-v1 { ${cssOverrides} }` }} />
      )}
      <header className="border-b border-[var(--site-border-soft)] bg-[rgba(255,255,255,0.72)] backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 md:px-6">
          <div className="inline-flex items-center gap-2.5 text-[var(--site-text-primary)]">
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt={displayName}
                className="max-h-9 max-w-[180px] object-contain"
              />
            ) : (
              <>
                {isLQFallback && <LQMark className="shrink-0" />}
                <span className="font-serif text-lg tracking-[-0.01em]">{displayName}</span>
              </>
            )}
          </div>
          {showAttribution && (
            <Link
              href="/"
              className="text-[11px] text-[var(--site-text-muted)] hover:text-[var(--site-text-body)] transition-colors"
            >
              Powered by Leadership Quarter
            </Link>
          )}
        </div>
      </header>
      <main className="assess-stage">{children}</main>
    </>
  )
}
