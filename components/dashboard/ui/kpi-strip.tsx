'use client'

import type { ReactNode } from 'react'
import { FoundationSurface } from '@/components/ui/foundation/surface'

export function DashboardKpiStrip({
  items,
}: {
  items: Array<{ label: string; value: string | number; hint?: ReactNode }>
}) {
  return (
    <div className="admin-kpi-strip">
      {items.map((item) => (
        <FoundationSurface key={item.label} className="admin-kpi-card">
          <span className="admin-kpi-value">{item.value}</span>
          <span className="admin-kpi-label">{item.label}</span>
          {item.hint ? <div className="admin-kpi-hint">{item.hint}</div> : null}
        </FoundationSurface>
      ))}
    </div>
  )
}
