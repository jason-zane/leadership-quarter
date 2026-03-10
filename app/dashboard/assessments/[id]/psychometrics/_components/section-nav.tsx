'use client'

import Link from 'next/link'

type SectionNavProps = {
  assessmentId: string
  currentSection: string
}

const SECTIONS = [
  { key: 'setup', label: 'Setup' },
  { key: 'groups', label: 'Reference groups' },
  { key: 'analysis', label: 'Item analysis' },
  { key: 'certification', label: 'Certification' },
] as const

export function SectionNav({ assessmentId, currentSection }: SectionNavProps) {
  return (
    <nav className="flex gap-1 border-b border-[var(--admin-border)]">
      {SECTIONS.map((section) => {
        const isActive = currentSection === section.key
        return (
          <Link
            key={section.key}
            href={`/dashboard/assessments/${assessmentId}/psychometrics?section=${section.key}`}
            className={[
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              isActive
                ? 'border-[var(--admin-accent)] text-[var(--admin-accent)]'
                : 'border-transparent text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]',
            ].join(' ')}
          >
            {section.label}
          </Link>
        )
      })}
    </nav>
  )
}
