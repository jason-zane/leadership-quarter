import Link from 'next/link'
import { LQMark } from '@/components/site/lq-mark'
import { normalizeCampaignConfig } from '@/utils/assessments/campaign-types'
import { createAdminClient } from '@/utils/supabase/admin'
import { resolveCampaignBranding } from '@/utils/assessments/campaign-branding'

async function resolveInvitationBranding(token: string) {
  const adminClient = createAdminClient()
  if (!adminClient) {
    return { mode: 'lq' as const, logoUrl: null, displayName: 'Leadership Quarter', cssOverrides: '', showAttribution: false, isLQFallback: true }
  }

  const { data } = await adminClient
    .from('assessment_invitations')
    .select('campaigns(config, organisations(id, name, branding_config))')
    .eq('token', token)
    .maybeSingle()

  const campaign = (data as {
    campaigns?: {
      config?: unknown
      organisations?: { id?: string; name?: string; branding_config?: unknown } | null
    } | null
  } | null)?.campaigns ?? null

  if (!campaign) {
    return { mode: 'lq' as const, logoUrl: null, displayName: 'Leadership Quarter', cssOverrides: '', showAttribution: false, isLQFallback: true }
  }

  let brandOrganisation = campaign.organisations ?? null
  const normalizedConfig = normalizeCampaignConfig(campaign.config ?? null)
  if (
    normalizedConfig.branding_source_organisation_id
    && normalizedConfig.branding_source_organisation_id !== brandOrganisation?.id
  ) {
    const { data: brandingSourceOrg } = await adminClient
      .from('organisations')
      .select('id, name, branding_config')
      .eq('id', normalizedConfig.branding_source_organisation_id)
      .maybeSingle()

    if (brandingSourceOrg) {
      brandOrganisation = brandingSourceOrg as { id?: string; name?: string; branding_config?: unknown }
    }
  }

  return resolveCampaignBranding({
    config: campaign.config ?? null,
    organisation: brandOrganisation,
  })
}

export default async function InvitationAssessLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const { mode, logoUrl, displayName, cssOverrides, showAttribution, isLQFallback } =
    await resolveInvitationBranding(token)

  if (mode === 'none') {
    return <main className="assess-stage">{children}</main>
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
