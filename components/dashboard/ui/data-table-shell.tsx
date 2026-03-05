'use client'

import type { ReactNode } from 'react'
import { FoundationTableFrame } from '@/components/ui/foundation/table-frame'

export function DashboardDataTableShell({ children }: { children: ReactNode }) {
  return <FoundationTableFrame>{children}</FoundationTableFrame>
}
