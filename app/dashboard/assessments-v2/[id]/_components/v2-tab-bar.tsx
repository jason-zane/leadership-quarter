'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { label: 'Overview', suffix: '' },
  { label: 'Questions', suffix: '/questions' },
  { label: 'Scoring', suffix: '/scoring' },
  { label: 'Psychometrics', suffix: '/psychometrics' },
  { label: 'Reports', suffix: '/reports' },
  { label: 'Campaigns', suffix: '/campaigns' },
  { label: 'Responses', suffix: '/responses' },
]

export function V2TabBar({ assessmentId }: { assessmentId: string }) {
  const pathname = usePathname()
  const base = `/dashboard/assessments/${assessmentId}`

  return (
    <div className="admin-toggle-group overflow-x-auto" role="tablist" aria-label="Assessment workspace sections">
      {tabs.map((tab) => {
        const href = base + tab.suffix
        const isActive = tab.suffix === ''
          ? pathname === base || pathname === `${base}/`
          : pathname === href || pathname.startsWith(`${href}/`)

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
