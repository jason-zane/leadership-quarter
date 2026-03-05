'use client'

import type { ReactNode } from 'react'

export function PortalHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="portal-page-header">
      <div>
        <h1 className="portal-page-title">{title}</h1>
        {description ? <p className="portal-page-description">{description}</p> : null}
      </div>
      {actions ? <div className="portal-page-actions">{actions}</div> : null}
    </div>
  )
}
