'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Overview', suffix: '' },
  { label: 'Assessments', suffix: '/assessments' },
  { label: 'Responses', suffix: '/responses' },
]

export function CampaignTabBar({ campaignId }: { campaignId: string }) {
  const pathname = usePathname()
  const base = `/dashboard/campaigns/${campaignId}`

  return (
    <div className="backend-tab-bar">
      {tabs.map((tab) => {
        const href = base + tab.suffix
        const isActive = tab.suffix === ''
          ? pathname === base || pathname === base + '/'
          : pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={tab.label}
            href={href}
            className={[
              'backend-tab-link',
              isActive ? 'backend-tab-link-active' : '',
            ].join(' ')}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
