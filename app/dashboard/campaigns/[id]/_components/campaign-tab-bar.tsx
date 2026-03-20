'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Overview', suffix: '' },
  { label: 'Settings', suffix: '/settings' },
  { label: 'Journey', suffix: '/journey' },
  { label: 'Responses', suffix: '/responses' },
]

export function CampaignTabBar({ campaignId }: { campaignId: string }) {
  const pathname = usePathname()
  const base = `/dashboard/campaigns/${campaignId}`

  return (
    <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Campaign sections">
      {tabs.map((tab) => {
        const href = base + tab.suffix
        const isActive = tab.suffix === ''
          ? pathname === base || pathname === base + '/'
          : pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={tab.label}
            href={href}
            className={isActive ? 'admin-toggle-pill admin-toggle-pill-active' : 'admin-toggle-pill'}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
