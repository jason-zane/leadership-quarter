import { CampaignBrandingShell } from '@/components/site/campaign-branding-shell'
import { normalizeCampaignConfig } from '@/utils/assessments/campaign-types'
import { createAdminClient } from '@/utils/supabase/admin'
import { resolveCampaignBranding } from '@/utils/assessments/campaign-branding'
import { getPlatformBrandConfig } from '@/utils/brand/platform-brand'

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
  let org: { id?: string; name: string; slug: string; branding_config: unknown } | null = null

  if (adminClient) {
    const { data } = await adminClient
      .from('campaigns')
      .select('config, organisations(id, name, slug, branding_config)')
      .eq('slug', campaignSlug)
      .maybeSingle()

    if (data) {
      config = data.config
      org = (data.organisations as unknown as { id?: string; name: string; slug: string; branding_config: unknown } | null) ?? null

      const normalizedConfig = normalizeCampaignConfig(config)
      if (
        normalizedConfig.branding_source_organisation_id
        && normalizedConfig.branding_source_organisation_id !== org?.id
      ) {
        const { data: brandingSourceOrg } = await adminClient
          .from('organisations')
          .select('id, name, slug, branding_config')
          .eq('id', normalizedConfig.branding_source_organisation_id)
          .maybeSingle()

        if (brandingSourceOrg) {
          org = brandingSourceOrg as { id?: string; name: string; slug: string; branding_config: unknown }
        }
      }
    }
  }

  const platformBrand = adminClient ? await getPlatformBrandConfig(adminClient) : null

  const { mode, logoUrl, displayName, cssOverrides, showAttribution, isLQFallback } =
    resolveCampaignBranding({
      config,
      organisation: org,
      platformBrand,
    })

  return (
    <CampaignBrandingShell
      branding={{ mode, logoUrl, displayName, cssOverrides, showAttribution, isLQFallback }}
    >
      {children}
    </CampaignBrandingShell>
  )
}
