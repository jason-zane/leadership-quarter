'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CogIcon,
  DocumentIcon,
  EnvelopeIcon,
  GlobeIcon,
  HomeIcon,
  InboxIcon,
  KeyIcon,
  UsersIcon,
} from '@/components/icons'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const groups: NavGroup[] = [
  {
    label: 'Assessments',
    items: [
      { href: '/dashboard/assessments', label: 'Assessments', icon: DocumentIcon },
      { href: '/dashboard/campaigns', label: 'Campaigns', icon: GlobeIcon },
      { href: '/dashboard/organisations', label: 'Organisations', icon: UsersIcon },
    ],
  },
  {
    label: 'CRM',
    items: [
      { href: '/dashboard/submissions', label: 'Submissions', icon: InboxIcon },
      { href: '/dashboard/contacts', label: 'Contacts', icon: UsersIcon },
    ],
  },
  {
    label: 'Communications',
    items: [
      { href: '/dashboard/emails', label: 'Emails', icon: EnvelopeIcon },
      { href: '/dashboard/reports', label: 'Reports', icon: DocumentIcon },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/dashboard', label: 'Overview', icon: HomeIcon, exact: true },
      { href: '/dashboard/users', label: 'Users', icon: KeyIcon },
      { href: '/dashboard/settings', label: 'Settings', icon: CogIcon },
    ],
  },
]

export function DashboardNav({ role = 'admin' }: { role?: 'admin' | 'staff' }) {
  const pathname = usePathname()
  const visibleGroups = groups.map((group) => ({
    ...group,
    items:
      role === 'admin'
        ? group.items
        : group.items.filter((item) => item.href !== '/dashboard/users'),
  }))

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="space-y-5">
      {visibleGroups.map((group) => (
        <div key={group.label}>
          <p className="admin-nav-group-label">{group.label}</p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={['admin-nav-link', active ? 'admin-nav-link-active' : ''].filter(Boolean).join(' ')}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}
