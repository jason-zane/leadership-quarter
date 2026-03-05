'use client'

import type { ReactNode } from 'react'

export function FoundationTableFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={['foundation-table-frame', className].filter(Boolean).join(' ')}>{children}</div>
}
