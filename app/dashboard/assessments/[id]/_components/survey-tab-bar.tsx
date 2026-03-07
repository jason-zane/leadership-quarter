'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Overview', suffix: '' },
  { label: 'Questions', suffix: '/questions' },
  { label: 'Scoring', suffix: '/scoring' },
  { label: 'Campaigns', suffix: '/campaigns' },
  { label: 'Responses', suffix: '/responses' },
]

export function SurveyTabBar({ surveyId }: { surveyId: string }) {
  const pathname = usePathname()
  const base = `/dashboard/assessments/${surveyId}`

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
