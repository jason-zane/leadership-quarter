'use client'

import type { ReactNode } from 'react'
import { FoundationSurface } from '@/components/ui/foundation/surface'

export function PortalStatusPanel({
  title,
  children,
  tone = 'default',
}: {
  title: string
  children: ReactNode
  tone?: 'default' | 'danger'
}) {
  return (
    <FoundationSurface tone="portal" className={['portal-status-panel', tone === 'danger' ? 'portal-status-panel-danger' : ''].filter(Boolean).join(' ')}>
      <p className="portal-status-title">{title}</p>
      <div className="portal-status-body">{children}</div>
    </FoundationSurface>
  )
}
