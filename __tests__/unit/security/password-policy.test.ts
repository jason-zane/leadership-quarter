import { describe, expect, it } from 'vitest'
import { MIN_PASSWORD_LENGTH, validateNewPassword } from '@/utils/security/password-policy'

describe('validateNewPassword', () => {
  it('rejects passwords shorter than the minimum length', () => {
    expect(validateNewPassword('short')).toBe(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    )
  })

  it('rejects mismatched confirmation passwords', () => {
    expect(validateNewPassword('long-enough-password', 'different-password')).toBe(
      'Passwords do not match.'
    )
  })

  it('accepts passwords that meet the minimum length and match confirmation', () => {
    expect(validateNewPassword('long-enough-password', 'long-enough-password')).toBeNull()
  })
})
