/**
 * Red-Team Phase 3.3 — Token Security Tests
 *
 * Verifies that HMAC-signed tokens (report access, gate access, portal bypass)
 * are resilient against:
 * - Expired tokens
 * - Tampered payloads (modified submissionId, etc.)
 * - Cross-type token misuse (gate token used as report token)
 * - Missing secrets
 * - Malformed tokens
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'

// Mock platform settings before importing modules
vi.mock('@/utils/services/platform-settings-runtime', () => ({
  gateTokenTtlSeconds: vi.fn().mockReturnValue(1800),
  portalBypassTtlSeconds: vi.fn().mockReturnValue(3600),
}))

import {
  createReportAccessToken,
  verifyReportAccessToken,
  createGateAccessToken,
  verifyGateAccessToken,
} from '@/utils/security/report-access'

import {
  createPortalAdminBypassToken,
  verifyPortalAdminBypassToken,
} from '@/utils/portal-bypass-session'

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────

const REPORT_SECRET = 'test-report-secret-32chars-long!'
const GATE_SECRET = 'test-gate-secret-32chars-long!!'
const BYPASS_SECRET = 'test-bypass-secret-32chars-long!'

function setSecrets() {
  process.env.REPORT_ACCESS_TOKEN_SECRET = REPORT_SECRET
  process.env.ASSESSMENT_GATE_TOKEN_SECRET = GATE_SECRET
  process.env.PORTAL_ADMIN_BYPASS_SECRET = BYPASS_SECRET
}

function clearSecrets() {
  delete process.env.REPORT_ACCESS_TOKEN_SECRET
  delete process.env.ASSESSMENT_GATE_TOKEN_SECRET
  delete process.env.PORTAL_ADMIN_BYPASS_SECRET
  delete process.env.AUTH_HANDOFF_SECRET
  delete process.env.REPORT_ACCESS_TOKEN_SECRET
}

function tamperPayload(token: string, modify: (payload: Record<string, unknown>) => void): string {
  const [payloadBase64, signature] = token.split('.')
  const payload = JSON.parse(Buffer.from(payloadBase64!, 'base64url').toString('utf8'))
  modify(payload)
  const tamperedBase64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  // Re-attach the ORIGINAL signature (should now fail verification)
  return `${tamperedBase64}.${signature}`
}

function forgeWithWrongSecret(token: string, wrongSecret: string): string {
  const [payloadBase64] = token.split('.')
  const newSig = crypto.createHmac('sha256', wrongSecret).update(payloadBase64!).digest('base64url')
  return `${payloadBase64}.${newSig}`
}

beforeEach(() => {
  setSecrets()
  // Ensure non-production for bypass tests
  process.env.NODE_ENV = 'test'
})

// ──────────────────────────────────────────────────────────────
// Report Access Tokens
// ──────────────────────────────────────────────────────────────

describe('Report Access Token — tamper resistance', () => {
  it('valid token verifies successfully', () => {
    const token = createReportAccessToken({
      report: 'assessment',
      submissionId: 'sub-1',
      expiresInSeconds: 3600,
    })
    expect(token).toBeTruthy()
    const result = verifyReportAccessToken(token!, 'assessment')
    expect(result).not.toBeNull()
    expect(result!.submissionId).toBe('sub-1')
  })

  it('tampered submissionId is rejected (signature mismatch)', () => {
    const token = createReportAccessToken({
      report: 'assessment',
      submissionId: 'sub-1',
      expiresInSeconds: 3600,
    })
    const tampered = tamperPayload(token!, (p) => { p.submissionId = 'sub-STOLEN' })
    const result = verifyReportAccessToken(tampered, 'assessment')
    expect(result).toBeNull()
  })

  it('tampered expiry is rejected (signature mismatch)', () => {
    const token = createReportAccessToken({
      report: 'assessment',
      submissionId: 'sub-1',
      expiresInSeconds: 1, // expires in 1 second
    })
    const tampered = tamperPayload(token!, (p) => {
      p.exp = Math.floor(Date.now() / 1000) + 999999 // extend expiry
    })
    const result = verifyReportAccessToken(tampered, 'assessment')
    expect(result).toBeNull()
  })

  it('token signed with wrong secret is rejected', () => {
    const token = createReportAccessToken({
      report: 'assessment',
      submissionId: 'sub-1',
      expiresInSeconds: 3600,
    })
    const forged = forgeWithWrongSecret(token!, 'wrong-secret')
    const result = verifyReportAccessToken(forged, 'assessment')
    expect(result).toBeNull()
  })
})

describe('Report Access Token — expiry enforcement', () => {
  it('expired token is rejected', () => {
    const token = createReportAccessToken({
      report: 'assessment',
      submissionId: 'sub-1',
      expiresInSeconds: -10, // already expired
    })
    const result = verifyReportAccessToken(token!, 'assessment')
    expect(result).toBeNull()
  })
})

describe('Report Access Token — cross-type misuse', () => {
  it('ai_survey token cannot be used as assessment token', () => {
    const token = createReportAccessToken({
      report: 'ai_survey',
      submissionId: 'sub-1',
      expiresInSeconds: 3600,
    })
    const result = verifyReportAccessToken(token!, 'assessment')
    expect(result).toBeNull()
  })

  it('lq8 token cannot be used as ai token', () => {
    const token = createReportAccessToken({
      report: 'lq8',
      submissionId: 'sub-1',
      expiresInSeconds: 3600,
    })
    const result = verifyReportAccessToken(token!, 'ai')
    expect(result).toBeNull()
  })

  it('assessment_v2 token CAN be used as assessment token (backward compat)', () => {
    const token = createReportAccessToken({
      report: 'assessment_v2',
      submissionId: 'sub-1',
      expiresInSeconds: 3600,
    })
    const result = verifyReportAccessToken(token!, 'assessment')
    expect(result).not.toBeNull()
    expect(result!.submissionId).toBe('sub-1')
  })
})

describe('Report Access Token — malformed input', () => {
  it('empty string returns null', () => {
    expect(verifyReportAccessToken('', 'assessment')).toBeNull()
  })

  it('random garbage returns null', () => {
    expect(verifyReportAccessToken('not.a.valid.token', 'assessment')).toBeNull()
  })

  it('valid base64 but invalid JSON returns null', () => {
    const garbage = Buffer.from('not-json', 'utf8').toString('base64url')
    const sig = crypto.createHmac('sha256', REPORT_SECRET).update(garbage).digest('base64url')
    expect(verifyReportAccessToken(`${garbage}.${sig}`, 'assessment')).toBeNull()
  })

  it('no secret configured returns null', () => {
    delete process.env.REPORT_ACCESS_TOKEN_SECRET
    const result = verifyReportAccessToken('any.token', 'assessment')
    expect(result).toBeNull()
  })

  it('no secret configured prevents token creation', () => {
    delete process.env.REPORT_ACCESS_TOKEN_SECRET
    const token = createReportAccessToken({
      report: 'assessment',
      submissionId: 'sub-1',
    })
    expect(token).toBeNull()
  })
})

describe('Report Access Token — selectionMode validation', () => {
  it('latest_variant without reportVariantId is rejected', () => {
    const token = createReportAccessToken({
      report: 'assessment_v2',
      submissionId: 'sub-1',
      selectionMode: 'latest_variant',
      reportVariantId: null,
      expiresInSeconds: 3600,
    })
    const result = verifyReportAccessToken(token!, 'assessment')
    expect(result).toBeNull()
  })

  it('latest_variant with reportVariantId is accepted', () => {
    const token = createReportAccessToken({
      report: 'assessment_v2',
      submissionId: 'sub-1',
      selectionMode: 'latest_variant',
      reportVariantId: 'variant-1',
      expiresInSeconds: 3600,
    })
    const result = verifyReportAccessToken(token!, 'assessment')
    expect(result).not.toBeNull()
    expect(result!.selectionMode).toBe('latest_variant')
    expect(result!.reportVariantId).toBe('variant-1')
  })
})

// ──────────────────────────────────────────────────────────────
// Gate Access Tokens
// ──────────────────────────────────────────────────────────────

describe('Gate Access Token — tamper resistance', () => {
  it('valid token verifies successfully', () => {
    const token = createGateAccessToken({
      submissionId: 'sub-1',
      campaignId: 'camp-1',
      assessmentId: 'assess-1',
      expiresInSeconds: 3600,
    })
    expect(token).toBeTruthy()
    const result = verifyGateAccessToken(token!)
    expect(result).not.toBeNull()
    expect(result!.submissionId).toBe('sub-1')
    expect(result!.campaignId).toBe('camp-1')
  })

  it('tampered submissionId is rejected', () => {
    const token = createGateAccessToken({
      submissionId: 'sub-1',
      campaignId: 'camp-1',
      assessmentId: 'assess-1',
      expiresInSeconds: 3600,
    })
    const tampered = tamperPayload(token!, (p) => { p.submissionId = 'sub-STOLEN' })
    expect(verifyGateAccessToken(tampered)).toBeNull()
  })

  it('expired gate token is rejected', () => {
    const token = createGateAccessToken({
      submissionId: 'sub-1',
      campaignId: 'camp-1',
      assessmentId: 'assess-1',
      expiresInSeconds: -10,
    })
    expect(verifyGateAccessToken(token!)).toBeNull()
  })

  it('gate token signed with wrong secret is rejected', () => {
    const token = createGateAccessToken({
      submissionId: 'sub-1',
      campaignId: 'camp-1',
      assessmentId: 'assess-1',
      expiresInSeconds: 3600,
    })
    const forged = forgeWithWrongSecret(token!, 'wrong-secret')
    expect(verifyGateAccessToken(forged)).toBeNull()
  })
})

describe('Gate Access Token — cross-type misuse', () => {
  it('report token cannot be verified as gate token', () => {
    const reportToken = createReportAccessToken({
      report: 'assessment',
      submissionId: 'sub-1',
      expiresInSeconds: 3600,
    })
    // Different secret → signature mismatch
    expect(verifyGateAccessToken(reportToken!)).toBeNull()
  })

  it('gate token cannot be verified as report token', () => {
    const gateToken = createGateAccessToken({
      submissionId: 'sub-1',
      campaignId: 'camp-1',
      assessmentId: 'assess-1',
      expiresInSeconds: 3600,
    })
    // Different secret → signature mismatch
    expect(verifyReportAccessToken(gateToken!, 'assessment')).toBeNull()
  })
})

// ──────────────────────────────────────────────────────────────
// Portal Admin Bypass Tokens
// ──────────────────────────────────────────────────────────────

describe('Portal Bypass Token — tamper resistance', () => {
  it('valid token verifies successfully', () => {
    const token = createPortalAdminBypassToken({
      userId: 'admin-1',
      organisationId: 'org-1',
      expiresInSeconds: 3600,
    })
    expect(token).toBeTruthy()
    const result = verifyPortalAdminBypassToken(token!, { userId: 'admin-1' })
    expect(result).not.toBeNull()
    expect(result!.organisationId).toBe('org-1')
  })

  it('tampered organisationId is rejected', () => {
    const token = createPortalAdminBypassToken({
      userId: 'admin-1',
      organisationId: 'org-1',
      expiresInSeconds: 3600,
    })
    const tampered = tamperPayload(token!, (p) => { p.organisationId = 'org-STOLEN' })
    expect(verifyPortalAdminBypassToken(tampered, { userId: 'admin-1' })).toBeNull()
  })

  it('tampered userId is rejected (even if signature checked first)', () => {
    const token = createPortalAdminBypassToken({
      userId: 'admin-1',
      organisationId: 'org-1',
      expiresInSeconds: 3600,
    })
    // Token is valid but userId in verification input doesn't match payload
    const result = verifyPortalAdminBypassToken(token!, { userId: 'different-user' })
    expect(result).toBeNull()
  })

  it('expired bypass token is rejected', () => {
    const token = createPortalAdminBypassToken({
      userId: 'admin-1',
      organisationId: 'org-1',
      expiresInSeconds: -10,
    })
    const result = verifyPortalAdminBypassToken(token!, { userId: 'admin-1' })
    expect(result).toBeNull()
  })

  it('bypass token for org-1 cannot be used to access org-2', () => {
    const token = createPortalAdminBypassToken({
      userId: 'admin-1',
      organisationId: 'org-1',
      expiresInSeconds: 3600,
    })
    // Explicitly checking against a different org
    const result = verifyPortalAdminBypassToken(token!, {
      userId: 'admin-1',
      organisationId: 'org-2',
    })
    expect(result).toBeNull()
  })

  it('bypass token signed with wrong secret is rejected', () => {
    const token = createPortalAdminBypassToken({
      userId: 'admin-1',
      organisationId: 'org-1',
      expiresInSeconds: 3600,
    })
    const forged = forgeWithWrongSecret(token!, 'wrong-secret')
    expect(verifyPortalAdminBypassToken(forged, { userId: 'admin-1' })).toBeNull()
  })
})

describe('Portal Bypass Token — missing secrets', () => {
  it('no secret → token creation returns null', () => {
    clearSecrets()
    // In non-production, it will look for fallbacks
    const token = createPortalAdminBypassToken({
      userId: 'admin-1',
      organisationId: 'org-1',
    })
    expect(token).toBeNull()
  })

  it('no secret → token verification returns null', () => {
    clearSecrets()
    expect(verifyPortalAdminBypassToken('any.token', { userId: 'admin-1' })).toBeNull()
  })
})

describe('Portal Bypass Token — production secret enforcement', () => {
  it('production throws if PORTAL_ADMIN_BYPASS_SECRET is not set', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    delete process.env.PORTAL_ADMIN_BYPASS_SECRET

    expect(() => {
      createPortalAdminBypassToken({
        userId: 'admin-1',
        organisationId: 'org-1',
      })
    }).toThrow('PORTAL_ADMIN_BYPASS_SECRET must be set in production')

    process.env.NODE_ENV = originalEnv
  })
})
