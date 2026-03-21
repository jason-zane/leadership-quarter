import { getAdminBaseUrl, getConfiguredHosts, getPortalBaseUrl, getPublicBaseUrl } from '@/utils/hosts'
import { SETTING_DEFINITIONS } from '@/utils/services/platform-settings'
import { SITE_CTA_SLOTS } from '@/utils/site/cta-bindings'
import { DashboardPageHeader } from '@/components/dashboard/ui/page-header'
import { DashboardPageShell } from '@/components/dashboard/ui/page-shell'
import { DashboardKpiStrip } from '@/components/dashboard/ui/kpi-strip'
import { SettingsWorkspace } from '@/components/dashboard/settings/settings-workspace'

export default function SettingsPage() {
  const { publicHost, adminHost, portalHost } = getConfiguredHosts()
  const diagnostics = {
    publicHost,
    adminHost,
    portalHost,
    publicBase: getPublicBaseUrl(),
    adminBase: getAdminBaseUrl(),
    portalBase: getPortalBaseUrl(),
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
  }

  const hostReady = Boolean(publicHost && adminHost && portalHost)

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        eyebrow="System"
        title="Settings"
        description="Operational controls, public CTA routing, and host diagnostics in one workspace. Use this page to tune platform behavior without hunting across utilities."
      />

      <DashboardKpiStrip
        items={[
          { label: 'Control groups', value: 4, hint: 'Rate limits, email, tokens, campaigns' },
          { label: 'Platform controls', value: SETTING_DEFINITIONS.length, hint: 'Database-backed runtime settings' },
          { label: 'Site CTA slots', value: SITE_CTA_SLOTS.length, hint: 'Homepage conversion placements' },
          { label: 'Host readiness', value: hostReady ? 'Ready' : 'Review', hint: hostReady ? 'All required hosts detected' : 'One or more host env vars missing' },
        ]}
      />

      <SettingsWorkspace diagnostics={diagnostics} />
    </DashboardPageShell>
  )
}
