'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/portal', label: 'Overview', exact: true },
  { href: '/portal/campaigns', label: 'Campaigns' },
  { href: '/portal/participants', label: 'Participants' },
]

export function PortalNavLinks() {
  const pathname = usePathname()

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={[
            'portal-nav-link',
            isActive(item.href, item.exact) ? 'portal-nav-link-active' : '',
          ].filter(Boolean).join(' ')}
        >
          {item.label}
        </Link>
      ))}
    </>
  )
}
