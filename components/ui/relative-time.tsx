'use client'

import { useEffect, useState } from 'react'

const DISPLAY_LOCALE = 'en-AU'
const DISPLAY_TIME_ZONE = 'Australia/Sydney'

const shortDateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  day: 'numeric',
  month: 'short',
  timeZone: DISPLAY_TIME_ZONE,
})

const dateFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: DISPLAY_TIME_ZONE,
})

const weekdayFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  weekday: 'short',
  timeZone: DISPLAY_TIME_ZONE,
})

const timeFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: DISPLAY_TIME_ZONE,
})

const dateTimeFormatter = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: DISPLAY_TIME_ZONE,
})

function parseDate(dateStr: string) {
  const date = new Date(dateStr)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatStableLabel(dateStr: string): string {
  const date = parseDate(dateStr)
  if (!date) return dateStr
  return `${shortDateFormatter.format(date)} at ${timeFormatter.format(date)}`
}

function formatTitle(dateStr: string): string {
  const date = parseDate(dateStr)
  if (!date) return dateStr
  return dateTimeFormatter.format(date)
}

function formatRelative(dateStr: string): string {
  const date = parseDate(dateStr)
  if (!date) return dateStr

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
    return `${weekdayFormatter.format(date)} at ${timeFormatter.format(date)}`
  }
  return dateFormatter.format(date)
}

export function RelativeTime({ date }: { date: string }) {
  const [label, setLabel] = useState(() => formatStableLabel(date))

  useEffect(() => {
    setLabel(formatRelative(date))
  }, [date])

  return (
    <time dateTime={date} title={formatTitle(date)}>
      {label}
    </time>
  )
}
