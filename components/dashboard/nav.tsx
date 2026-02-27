'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, InboxIcon, UsersIcon, EnvelopeIcon, KeyIcon, CogIcon } from '@/components/icons'

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
    return exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav className="space-y-5">
      {visibleGroups.map((group) => (
        <div key={group.label}>
          <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-200',
                  ].join(' ')}
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
