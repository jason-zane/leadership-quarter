'use client'

import type { ReactNode } from 'react'

export function PortalShell({ children }: { children: ReactNode }) {
  return <section className="portal-page-shell">{children}</section>
}
