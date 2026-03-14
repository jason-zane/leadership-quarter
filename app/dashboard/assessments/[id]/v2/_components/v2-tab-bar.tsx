'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Overview', suffix: '' },
  { label: 'Questions', suffix: '/questions' },
  { label: 'Scoring', suffix: '/scoring' },
  { label: 'Psychometrics', suffix: '/psychometrics' },
  { label: 'Reports', suffix: '/reports' },
  { label: 'Assessment Experience', suffix: '/experience' },
  { label: 'Campaigns', suffix: '/campaigns' },
  { label: 'Responses', suffix: '/responses' },
]

export function V2TabBar({ assessmentId }: { assessmentId: string }) {
  const pathname = usePathname()
  const base = `/dashboard/assessments/${assessmentId}/v2`

  return (
    <div className="backend-tab-bar">
      {tabs.map((tab) => {
        const href = base + tab.suffix
        const isActive = tab.suffix === ''
          ? pathname === base || pathname === `${base}/`
          : pathname === href || pathname.startsWith(`${href}/`)

        return (
          <Link
            key={tab.label}
            href={href}
            className={['backend-tab-link', isActive ? 'backend-tab-link-active' : ''].join(' ')}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
