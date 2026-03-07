'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { EnvelopeIcon, GlobeIcon, HomeIcon, UsersIcon } from '@/components/icons'

const items = [
  { href: '/portal', label: 'Overview', exact: true, icon: HomeIcon },
  { href: '/portal/campaigns', label: 'Campaigns', icon: GlobeIcon },
  { href: '/portal/participants', label: 'Participants', icon: UsersIcon },
  { href: '/portal/help', label: 'Help', icon: EnvelopeIcon },
]

export function PortalNavLinks({ mode = 'desktop' }: { mode?: 'desktop' | 'mobile' }) {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  }

  const linkClassName = (active: boolean) =>
    [
      mode === 'mobile' ? 'portal-mobile-nav-link' : 'portal-nav-link',
      active ? (mode === 'mobile' ? 'portal-mobile-nav-link-active' : 'portal-nav-link-active') : '',
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <nav className={mode === 'mobile' ? 'portal-mobile-nav' : 'space-y-1'} aria-label="Portal sections">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={linkClassName(isActive(item.href, item.exact))}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
