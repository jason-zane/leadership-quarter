'use client'

import { useEffect, useState } from 'react'

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 0) return 'just now'

  const diffMins = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) {
    return (
      date.toLocaleDateString('en-GB', { weekday: 'short' }) +
      ' at ' +
      date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    )
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function RelativeTime({ date }: { date: string }) {
  const [label, setLabel] = useState(() => formatRelative(date))

  useEffect(() => {
    setLabel(formatRelative(date))
    const interval = setInterval(() => setLabel(formatRelative(date)), 60_000)
    return () => clearInterval(interval)
  }, [date])

  return (
    <time dateTime={date} title={new Date(date).toLocaleString()}>
      {label}
    </time>
  )
}
