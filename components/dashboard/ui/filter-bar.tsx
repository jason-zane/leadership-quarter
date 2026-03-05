'use client'

import type { ReactNode } from 'react'
import { FoundationSurface } from '@/components/ui/foundation/surface'

export function DashboardFilterBar({ children }: { children: ReactNode }) {
  return (
    <FoundationSurface className="admin-filter-bar">
      {children}
    </FoundationSurface>
  )
}
