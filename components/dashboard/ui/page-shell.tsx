'use client'

import type { ReactNode } from 'react'

export function DashboardPageShell({ children }: { children: ReactNode }) {
  return <section className="admin-page-shell">{children}</section>
}
