'use client'

import type { HTMLAttributes, ReactNode } from 'react'

type SurfaceTone = 'admin' | 'portal'

type FoundationSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  tone?: SurfaceTone
}

export function FoundationSurface({
  children,
  className,
  tone = 'admin',
  ...props
}: FoundationSurfaceProps) {
  return (
    <div
      {...props}
      className={[
        'foundation-surface',
        tone === 'portal' ? 'foundation-surface-portal' : 'foundation-surface-admin',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
