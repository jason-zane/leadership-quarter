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
    <div className="flex gap-0 border-b border-zinc-200 dark:border-zinc-800">
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
              'px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors',
              isActive
                ? 'border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
            ].join(' ')}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
