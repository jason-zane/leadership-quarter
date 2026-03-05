import { getAdminBaseUrl, getConfiguredHosts, getPortalBaseUrl, getPublicBaseUrl } from '@/utils/hosts'
import { SiteCtaBindingsEditor } from '@/components/dashboard/settings/site-cta-bindings-editor'

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={[
        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
        ok
          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      ].join(' ')}
    >
      {label}
    </span>
  )
}

export default function SettingsPage() {
  const { publicHost, adminHost, portalHost } = getConfiguredHosts()
  const publicBase = getPublicBaseUrl()
  const adminBase = getAdminBaseUrl()
  const portalBase = getPortalBaseUrl()
  const hostReady = Boolean(publicHost && adminHost && portalHost)

  return (
    <section className="space-y-5">
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Settings</h1>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        Host and environment diagnostics for admin/portal separation.
      </p>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Cutover readiness</p>
          <StatusPill ok={hostReady} label={hostReady ? 'Ready' : 'Missing host env'} />
        </div>

        <div className="grid gap-3 text-sm md:grid-cols-2">
          <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">PUBLIC_HOST</p>
            <p className="mt-1 font-mono text-zinc-800 dark:text-zinc-100">{publicHost ?? 'Not set'}</p>
          </div>
          <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">ADMIN_HOST</p>
            <p className="mt-1 font-mono text-zinc-800 dark:text-zinc-100">{adminHost ?? 'Not set'}</p>
          </div>
          <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">PORTAL_HOST</p>
            <p className="mt-1 font-mono text-zinc-800 dark:text-zinc-100">{portalHost ?? 'Not set'}</p>
          </div>
          <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">NODE_ENV</p>
            <p className="mt-1 font-mono text-zinc-800 dark:text-zinc-100">{process.env.NODE_ENV ?? 'unknown'}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Resolved Base URLs</p>
        <div className="space-y-2 text-sm">
          <p className="font-mono text-zinc-700 dark:text-zinc-200">Public: {publicBase}</p>
          <p className="font-mono text-zinc-700 dark:text-zinc-200">Admin: {adminBase}</p>
          <p className="font-mono text-zinc-700 dark:text-zinc-200">Portal: {portalBase}</p>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Expected Production Routing</p>
        <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
          <li>`leadershipquarter.com` → public site routes</li>
          <li>`admin.leadershipquarter.com` → `/dashboard` + `/api/admin/*`</li>
          <li>`portal.leadershipquarter.com` → `/portal` + `/api/portal/*` + client invite flows</li>
        </ul>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Supabase Redirect URL Checklist</p>
        <ul className="space-y-1 text-sm font-mono text-zinc-700 dark:text-zinc-200">
          <li>{`${adminBase}/set-password`}</li>
          <li>{`${adminBase}/reset-password`}</li>
          <li>{`${portalBase}/set-password`}</li>
          <li>{`${portalBase}/reset-password`}</li>
        </ul>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Website CTA Campaign Mapping</p>
        <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
          Assign site assessment CTA buttons to active campaign links. If unset, the CTA falls back to the public assessment path.
        </p>
        <SiteCtaBindingsEditor />
      </div>
    </section>
  )
}
