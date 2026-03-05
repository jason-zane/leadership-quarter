'use client'

import { FoundationSurface } from '@/components/ui/foundation/surface'

export function PortalMetricCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <FoundationSurface tone="portal" className="portal-metric-card">
      <p className="portal-metric-label">{label}</p>
      <p className="portal-metric-value">{value}</p>
    </FoundationSurface>
  )
}
