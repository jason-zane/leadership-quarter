'use client'

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>
  }
}

export function trackSiteEvent(event: string, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({
    event,
    ...payload,
    at: new Date().toISOString(),
  })
}
