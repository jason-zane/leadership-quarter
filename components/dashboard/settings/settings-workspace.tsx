'use client'

import type { ComponentType } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { CogIcon, GlobeIcon, KeyIcon } from '@/components/icons'
import { FoundationSurface } from '@/components/ui/foundation/surface'
import { PlatformSettingsEditor } from '@/components/dashboard/settings/platform-settings-editor'
import { SiteCtaBindingsEditor } from '@/components/dashboard/settings/site-cta-bindings-editor'

type SettingsWorkspaceTab = 'platform' | 'website' | 'diagnostics'

type DiagnosticsValue = {
  publicHost: string | null
  adminHost: string | null
  portalHost: string | null
  publicBase: string
  adminBase: string
  portalBase: string
  nodeEnv: string
}

const tabs: Array<{
  key: SettingsWorkspaceTab
  label: string
  description: string
  icon: ComponentType<{ className?: string }>
}> = [
  {
    key: 'platform',
    label: 'Platform',
    description: 'Rate limits, email, tokens, and defaults.',
    icon: CogIcon,
  },
  {
    key: 'website',
    label: 'Website CTAs',
    description: 'Public-site campaign routing.',
    icon: GlobeIcon,
  },
  {
    key: 'diagnostics',
    label: 'Diagnostics',
    description: 'Host and auth environment checks.',
    icon: KeyIcon,
  },
]

export function SettingsWorkspace({ diagnostics }: { diagnostics: DiagnosticsValue }) {
  const [activeTab, setActiveTab] = useState<SettingsWorkspaceTab>('platform')

  return (
    <div className="space-y-4">
      <FoundationSurface className="p-4">
        <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Settings sections">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.key)}
                className={isActive ? 'admin-toggle-chip admin-toggle-chip-active' : 'admin-toggle-chip'}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </FoundationSurface>

      <FoundationSurface className="p-5">
        <Link
          href="/dashboard/settings/brand"
          className="flex items-center justify-between gap-4 rounded-[1.2rem] border border-[rgba(103,127,159,0.14)] bg-[rgba(247,249,252,0.82)] p-4 transition-colors hover:bg-[rgba(237,242,250,0.9)]"
        >
          <div>
            <p className="text-sm font-semibold text-[var(--admin-text-primary)]">Platform Brand</p>
            <p className="mt-1 text-xs text-[var(--admin-text-muted)]">
              Define the default LQ brand seeds, preview candidate surfaces, and persist changes without a deploy.
            </p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-[var(--admin-text-muted)]">Open</span>
        </Link>
      </FoundationSurface>

      {activeTab === 'platform' ? <PlatformSettingsEditor /> : null}
      {activeTab === 'website' ? <SiteCtaBindingsEditor /> : null}
      {activeTab === 'diagnostics' ? <DiagnosticsPanel diagnostics={diagnostics} /> : null}
    </div>
  )
}

function DiagnosticsPanel({ diagnostics }: { diagnostics: DiagnosticsValue }) {
  const hostReady = Boolean(diagnostics.publicHost && diagnostics.adminHost && diagnostics.portalHost)
  const hostCards = [
    { label: 'PUBLIC_HOST', value: diagnostics.publicHost ?? 'Not set' },
    { label: 'ADMIN_HOST', value: diagnostics.adminHost ?? 'Not set' },
    { label: 'PORTAL_HOST', value: diagnostics.portalHost ?? 'Not set' },
    { label: 'NODE_ENV', value: diagnostics.nodeEnv || 'unknown' },
  ]

  const baseUrls = [
    { label: 'Public', value: diagnostics.publicBase },
    { label: 'Admin', value: diagnostics.adminBase },
    { label: 'Portal', value: diagnostics.portalBase },
  ]

  return (
    <div className="space-y-4">
      <FoundationSurface className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Host readiness</h2>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              Verify the host and auth environment before changing production routing behavior.
            </p>
          </div>
          <span
            className={[
              'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]',
              hostReady ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
            ].join(' ')}
          >
            {hostReady ? 'Ready' : 'Review env'}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {hostCards.map((card) => (
            <div key={card.label} className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-soft)]">{card.label}</p>
              <p className="mt-2 break-all font-mono text-sm text-[var(--admin-text-primary)]">{card.value}</p>
            </div>
          ))}
        </div>
      </FoundationSurface>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <FoundationSurface className="space-y-4 p-6">
          <div>
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Resolved base URLs</h2>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              These are the canonical surfaces used by login, handoff, and participant-facing flows.
            </p>
          </div>
          <div className="space-y-3">
            {baseUrls.map((row) => (
              <div key={row.label} className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-soft)]">{row.label}</p>
                <p className="mt-1 break-all font-mono text-sm text-[var(--admin-text-primary)]">{row.value}</p>
              </div>
            ))}
          </div>
        </FoundationSurface>

        <FoundationSurface className="space-y-4 p-6">
          <div>
            <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Supabase redirects</h2>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              Required redirect URLs for password reset and set-password flows.
            </p>
          </div>
          <ul className="space-y-2 text-sm font-mono text-[var(--admin-text-primary)]">
            <li className="rounded-[18px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-3 py-2">{`${diagnostics.publicBase}/set-password`}</li>
            <li className="rounded-[18px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] px-3 py-2">{`${diagnostics.publicBase}/reset-password`}</li>
          </ul>
        </FoundationSurface>
      </div>

      <FoundationSurface className="space-y-4 p-6">
        <div>
          <h2 className="text-base font-semibold text-[var(--admin-text-primary)]">Production routing model</h2>
          <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
            Reference view of how the public, admin, and portal surfaces divide responsibilities.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-soft)]">Public</p>
            <p className="mt-2 text-sm leading-6 text-[var(--admin-text-primary)]">`leadershipquarter.com` owns public site routes and the canonical client login entry.</p>
          </div>
          <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-soft)]">Admin</p>
            <p className="mt-2 text-sm leading-6 text-[var(--admin-text-primary)]">`admin.leadershipquarter.com` owns `/dashboard` and `/api/admin/*` after auth handoff.</p>
          </div>
          <div className="rounded-[20px] border border-[var(--admin-border)] bg-[var(--admin-surface-alt)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--admin-text-soft)]">Portal</p>
            <p className="mt-2 text-sm leading-6 text-[var(--admin-text-primary)]">`portal.leadershipquarter.com` owns `/portal`, `/api/portal/*`, and invite-driven client flows.</p>
          </div>
        </div>
      </FoundationSurface>
    </div>
  )
}
