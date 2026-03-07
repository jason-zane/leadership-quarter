'use client'

import type { ReactNode } from 'react'

export function PortalHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string
  description?: string
  actions?: ReactNode
  eyebrow?: string
}) {
  return (
    <div className="portal-page-header">
      <div>
        {eyebrow ? <p className="portal-page-kicker">{eyebrow}</p> : null}
        <h1 className="portal-page-title">{title}</h1>
        {description ? <p className="portal-page-description">{description}</p> : null}
      </div>
      {actions ? <div className="portal-page-actions">{actions}</div> : null}
    </div>
  )
}
