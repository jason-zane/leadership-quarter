import type { ReactNode } from 'react'

export function FoundationPageContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={['foundation-page-container', className].filter(Boolean).join(' ')}>{children}</div>
}
