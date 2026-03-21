import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { checkEmailRateLimit, _resetEmailRateLimits } from '@/utils/email-rate-limiter'

describe('checkEmailRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    _resetEmailRateLimits()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first email to an address', () => {
    const result = checkEmailRateLimit({ emailAddress: 'a@test.com' })
    expect(result.allowed).toBe(true)
  })

  it('allows up to 3 emails to the same address within 10 minutes', () => {
    for (let i = 0; i < 3; i++) {
      const result = checkEmailRateLimit({ emailAddress: 'a@test.com' })
      expect(result.allowed).toBe(true)
    }
  })

  it('blocks the 4th email to the same address within 10 minutes', () => {
    for (let i = 0; i < 3; i++) {
      checkEmailRateLimit({ emailAddress: 'a@test.com' })
    }
    const result = checkEmailRateLimit({ emailAddress: 'a@test.com' })
    expect(result).toEqual({ allowed: false, reason: 'per_address_limit' })
  })

  it('resets address limit after the 10-minute window expires', () => {
    for (let i = 0; i < 3; i++) {
      checkEmailRateLimit({ emailAddress: 'a@test.com' })
    }
    expect(checkEmailRateLimit({ emailAddress: 'a@test.com' }).allowed).toBe(false)

    vi.advanceTimersByTime(10 * 60 * 1000 + 1)

    const result = checkEmailRateLimit({ emailAddress: 'a@test.com' })
    expect(result.allowed).toBe(true)
  })

  it('allows up to 100 emails for the same campaign', () => {
    for (let i = 0; i < 100; i++) {
      const result = checkEmailRateLimit({
        emailAddress: `user${i}@test.com`,
        campaignId: 'campaign-1',
      })
      expect(result.allowed).toBe(true)
    }
  })

  it('blocks the 101st email for the same campaign within an hour', () => {
    for (let i = 0; i < 100; i++) {
      checkEmailRateLimit({
        emailAddress: `user${i}@test.com`,
        campaignId: 'campaign-1',
      })
    }
    const result = checkEmailRateLimit({
      emailAddress: 'user100@test.com',
      campaignId: 'campaign-1',
    })
    expect(result).toEqual({ allowed: false, reason: 'per_campaign_limit' })
  })

  it('tracks campaign limits independently', () => {
    for (let i = 0; i < 100; i++) {
      checkEmailRateLimit({
        emailAddress: `user${i}@test.com`,
        campaignId: 'campaign-1',
      })
    }
    expect(
      checkEmailRateLimit({ emailAddress: 'extra@test.com', campaignId: 'campaign-1' }).allowed
    ).toBe(false)

    const result = checkEmailRateLimit({
      emailAddress: 'extra@test.com',
      campaignId: 'campaign-2',
    })
    expect(result.allowed).toBe(true)
  })

  it('clears all limits after _resetEmailRateLimits()', () => {
    for (let i = 0; i < 3; i++) {
      checkEmailRateLimit({ emailAddress: 'a@test.com' })
    }
    expect(checkEmailRateLimit({ emailAddress: 'a@test.com' }).allowed).toBe(false)

    _resetEmailRateLimits()

    expect(checkEmailRateLimit({ emailAddress: 'a@test.com' }).allowed).toBe(true)
  })
})
