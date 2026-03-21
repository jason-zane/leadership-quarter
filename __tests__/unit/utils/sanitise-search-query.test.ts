import { describe, it, expect } from 'vitest'
import { sanitiseSearchQuery } from '@/utils/sanitise-search-query'

describe('sanitiseSearchQuery', () => {
  describe('normal search strings pass through unchanged', () => {
    it('preserves plain text', () => {
      expect(sanitiseSearchQuery('john doe')).toBe('john doe')
    })

    it('preserves email-like strings without dots', () => {
      expect(sanitiseSearchQuery('test@example')).toBe('test@example')
    })

    it('preserves hyphens and underscores', () => {
      expect(sanitiseSearchQuery('first-name_last')).toBe('first-name_last')
    })
  })

  describe('PostgREST operators are stripped', () => {
    it('strips commas', () => {
      expect(sanitiseSearchQuery('a,b')).toBe('ab')
    })

    it('strips dots', () => {
      expect(sanitiseSearchQuery('email.eq.value')).toBe('emaileqvalue')
    })

    it('strips parentheses', () => {
      expect(sanitiseSearchQuery('(admin)')).toBe('admin')
    })

    it('strips percent signs', () => {
      expect(sanitiseSearchQuery('%admin%')).toBe('admin')
    })

    it('strips asterisks', () => {
      expect(sanitiseSearchQuery('*admin*')).toBe('admin')
    })

    it('strips backslashes', () => {
      expect(sanitiseSearchQuery('admin\\')).toBe('admin')
    })
  })

  describe('mixed injection attempts', () => {
    it('strips all operators from a compound injection string', () => {
      expect(sanitiseSearchQuery('john,email.eq.admin@evil.com')).toBe(
        'johnemaileqadmin@evilcom'
      )
    })

    it('strips operators from nested parentheses with wildcards', () => {
      expect(sanitiseSearchQuery('%(name.ilike.*admin*)%')).toBe(
        'nameilikeadmin'
      )
    })
  })

  describe('empty and whitespace-only input', () => {
    it('returns empty string for empty input', () => {
      expect(sanitiseSearchQuery('')).toBe('')
    })

    it('returns empty string for whitespace-only input', () => {
      expect(sanitiseSearchQuery('   ')).toBe('')
    })

    it('returns empty string when input is only operators', () => {
      expect(sanitiseSearchQuery('.,()%*\\')).toBe('')
    })
  })

  describe('unicode and non-operator special characters pass through', () => {
    it('preserves accented characters', () => {
      expect(sanitiseSearchQuery('Jose')).toBe('Jose')
    })

    it('preserves apostrophes', () => {
      expect(sanitiseSearchQuery("O'Brien")).toBe("O'Brien")
    })

    it('preserves umlauts and other diacritics', () => {
      expect(sanitiseSearchQuery('Muller')).toBe('Muller')
    })

    it('preserves CJK characters', () => {
      expect(sanitiseSearchQuery('search text')).toBe('search text')
    })

    it('preserves the at sign', () => {
      expect(sanitiseSearchQuery('user@domain')).toBe('user@domain')
    })

    it('preserves hash and plus signs', () => {
      expect(sanitiseSearchQuery('tag#1 c++')).toBe('tag#1 c++')
    })
  })
})
