import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createPortalAdminBypassToken,
  verifyPortalAdminBypassToken,
} from '@/utils/portal-bypass-session'

const TEST_SECRET = 'test-bypass-secret-value-1234567890'
const TEST_USER_ID = 'user-aaa-111'
const TEST_ORG_ID = 'org-bbb-222'

function saveEnv() {
  return {
    PORTAL_ADMIN_BYPASS_SECRET: process.env.PORTAL_ADMIN_BYPASS_SECRET,
    AUTH_HANDOFF_SECRET: process.env.AUTH_HANDOFF_SECRET,
    REPORT_ACCESS_TOKEN_SECRET: process.env.REPORT_ACCESS_TOKEN_SECRET,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  }
}

function clearEnv() {
  delete process.env.PORTAL_ADMIN_BYPASS_SECRET
  delete process.env.AUTH_HANDOFF_SECRET
  delete process.env.REPORT_ACCESS_TOKEN_SECRET
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
}

describe('portal-bypass-session', () => {
  let savedEnv: ReturnType<typeof saveEnv>

  beforeEach(() => {
    savedEnv = saveEnv()
    clearEnv()
    process.env.NODE_ENV = 'test'
  })

  afterEach(() => {
    Object.entries(savedEnv).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    })
  })

  it('creates and verifies a valid token', () => {
    process.env.PORTAL_ADMIN_BYPASS_SECRET = TEST_SECRET

    const token = createPortalAdminBypassToken({
      userId: TEST_USER_ID,
      organisationId: TEST_ORG_ID,
    })
    expect(token).toBeTruthy()

    const payload = verifyPortalAdminBypassToken(token!, {
      userId: TEST_USER_ID,
    })
    expect(payload).not.toBeNull()
    expect(payload!.userId).toBe(TEST_USER_ID)
    expect(payload!.organisationId).toBe(TEST_ORG_ID)
  })

  it('rejects a token with tampered payload', () => {
    process.env.PORTAL_ADMIN_BYPASS_SECRET = TEST_SECRET

    const token = createPortalAdminBypassToken({
      userId: TEST_USER_ID,
      organisationId: TEST_ORG_ID,
    })!

    const [payloadBase64, signature] = token.split('.')
    const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'))
    decoded.userId = 'attacker-id'
    const tamperedPayload = Buffer.from(JSON.stringify(decoded), 'utf8').toString('base64url')
    const tamperedToken = `${tamperedPayload}.${signature}`

    const result = verifyPortalAdminBypassToken(tamperedToken, {
      userId: 'attacker-id',
    })
    expect(result).toBeNull()
  })

  it('rejects a token with tampered signature', () => {
    process.env.PORTAL_ADMIN_BYPASS_SECRET = TEST_SECRET

    const token = createPortalAdminBypassToken({
      userId: TEST_USER_ID,
      organisationId: TEST_ORG_ID,
    })!

    const [payloadBase64] = token.split('.')
    const tamperedToken = `${payloadBase64}.badsignature`

    const result = verifyPortalAdminBypassToken(tamperedToken, {
      userId: TEST_USER_ID,
    })
    expect(result).toBeNull()
  })

  it('rejects an expired token', () => {
    process.env.PORTAL_ADMIN_BYPASS_SECRET = TEST_SECRET

    const token = createPortalAdminBypassToken({
      userId: TEST_USER_ID,
      organisationId: TEST_ORG_ID,
      expiresInSeconds: -1,
    })!

    const result = verifyPortalAdminBypassToken(token, {
      userId: TEST_USER_ID,
    })
    expect(result).toBeNull()
  })

  it('rejects a token with wrong userId', () => {
    process.env.PORTAL_ADMIN_BYPASS_SECRET = TEST_SECRET

    const token = createPortalAdminBypassToken({
      userId: TEST_USER_ID,
      organisationId: TEST_ORG_ID,
    })!

    const result = verifyPortalAdminBypassToken(token, {
      userId: 'wrong-user-id',
    })
    expect(result).toBeNull()
  })

  it('rejects a token with wrong organisationId when specified', () => {
    process.env.PORTAL_ADMIN_BYPASS_SECRET = TEST_SECRET

    const token = createPortalAdminBypassToken({
      userId: TEST_USER_ID,
      organisationId: TEST_ORG_ID,
    })!

    const result = verifyPortalAdminBypassToken(token, {
      userId: TEST_USER_ID,
      organisationId: 'wrong-org-id',
    })
    expect(result).toBeNull()
  })

  it('throws in production when PORTAL_ADMIN_BYPASS_SECRET is not set', () => {
    process.env.NODE_ENV = 'production'

    expect(() =>
      createPortalAdminBypassToken({
        userId: TEST_USER_ID,
        organisationId: TEST_ORG_ID,
      })
    ).toThrow('PORTAL_ADMIN_BYPASS_SECRET must be set in production')
  })

  it('falls back to AUTH_HANDOFF_SECRET in dev', () => {
    process.env.AUTH_HANDOFF_SECRET = 'dev-handoff-secret'

    const token = createPortalAdminBypassToken({
      userId: TEST_USER_ID,
      organisationId: TEST_ORG_ID,
    })
    expect(token).toBeTruthy()

    const payload = verifyPortalAdminBypassToken(token!, {
      userId: TEST_USER_ID,
    })
    expect(payload).not.toBeNull()
  })

  it('does NOT fall back to SUPABASE_SERVICE_ROLE_KEY', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-value'

    const token = createPortalAdminBypassToken({
      userId: TEST_USER_ID,
      organisationId: TEST_ORG_ID,
    })
    expect(token).toBeNull()
  })
})
