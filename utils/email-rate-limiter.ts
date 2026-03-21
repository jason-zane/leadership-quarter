/**
 * In-memory sliding-window rate limiter for outbound emails.
 *
 * Default limits (configurable via Settings > Email Throttling):
 *   - Per email address: 3 sends per 10 minutes
 *   - Per campaign:     100 sends per hour
 *
 * This is a process-local limiter. In a multi-instance deployment it won't
 * share state across workers, but it still prevents runaway loops within a
 * single serverless invocation and provides reasonable burst protection on
 * single-process deployments.
 */

import { emailSettingFor } from '@/utils/services/platform-settings-runtime'

type SlidingWindow = {
  timestamps: number[]
  maxRequests: number
  windowMs: number
}

function createWindow(maxRequests: number, windowMs: number): SlidingWindow {
  return { timestamps: [], maxRequests, windowMs }
}

function isAllowed(window: SlidingWindow, now: number): boolean {
  // Evict expired entries
  const cutoff = now - window.windowMs
  window.timestamps = window.timestamps.filter((t) => t > cutoff)

  if (window.timestamps.length >= window.maxRequests) {
    return false
  }

  window.timestamps.push(now)
  return true
}

function perAddressMax() {
  return emailSettingFor('per_address_max') || 3
}
function perAddressWindowMs() {
  return (emailSettingFor('per_address_window_minutes') || 10) * 60 * 1000
}
function perCampaignMax() {
  return emailSettingFor('per_campaign_max') || 100
}
function perCampaignWindowMs() {
  return (emailSettingFor('per_campaign_window_minutes') || 60) * 60 * 1000
}

const addressWindows = new Map<string, SlidingWindow>()
const campaignWindows = new Map<string, SlidingWindow>()

// Periodic cleanup to prevent unbounded memory growth
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000
let lastCleanup = Date.now()

function maybeCleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now

  for (const [key, w] of addressWindows) {
    const cutoff = now - w.windowMs
    w.timestamps = w.timestamps.filter((t) => t > cutoff)
    if (w.timestamps.length === 0) addressWindows.delete(key)
  }
  for (const [key, w] of campaignWindows) {
    const cutoff = now - w.windowMs
    w.timestamps = w.timestamps.filter((t) => t > cutoff)
    if (w.timestamps.length === 0) campaignWindows.delete(key)
  }
}

export type EmailRateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: 'per_address_limit' | 'per_campaign_limit' }

export function checkEmailRateLimit(input: {
  emailAddress: string
  campaignId?: string | null
}): EmailRateLimitResult {
  const now = Date.now()
  maybeCleanup(now)

  // Check per-address limit
  const addrKey = input.emailAddress.toLowerCase()
  if (!addressWindows.has(addrKey)) {
    addressWindows.set(addrKey, createWindow(perAddressMax(), perAddressWindowMs()))
  }
  const addrWindow = addressWindows.get(addrKey)!
  // Update limits in case settings changed since window was created
  addrWindow.maxRequests = perAddressMax()
  addrWindow.windowMs = perAddressWindowMs()
  if (!isAllowed(addrWindow, now)) {
    console.warn(`[email-rate-limit] Per-address limit hit for ${addrKey}`)
    return { allowed: false, reason: 'per_address_limit' }
  }

  // Check per-campaign limit
  if (input.campaignId) {
    if (!campaignWindows.has(input.campaignId)) {
      campaignWindows.set(input.campaignId, createWindow(perCampaignMax(), perCampaignWindowMs()))
    }
    const campWindow = campaignWindows.get(input.campaignId)!
    campWindow.maxRequests = perCampaignMax()
    campWindow.windowMs = perCampaignWindowMs()
    if (!isAllowed(campWindow, now)) {
      console.warn(`[email-rate-limit] Per-campaign limit hit for campaign ${input.campaignId}`)
      return { allowed: false, reason: 'per_campaign_limit' }
    }
  }

  return { allowed: true }
}

/** Reset all windows — for testing only */
export function _resetEmailRateLimits() {
  addressWindows.clear()
  campaignWindows.clear()
}
