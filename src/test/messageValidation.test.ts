import { describe, it, expect } from 'vitest'
import { validateMessageBody, MESSAGE_MAX_LENGTH } from '@/lib/messageValidation'

describe('validateMessageBody', () => {
  it('returns error for empty string', () => {
    expect(validateMessageBody('')).toBe('body required')
  })

  it('returns error for whitespace-only string', () => {
    expect(validateMessageBody('   ')).toBe('body required')
  })

  it('returns null for a valid message', () => {
    expect(validateMessageBody('Hello!')).toBeNull()
  })

  it('returns null at exactly the max length', () => {
    expect(validateMessageBody('a'.repeat(MESSAGE_MAX_LENGTH))).toBeNull()
  })

  it('returns error for message one character over the limit', () => {
    // Regression: ensure the 2000-char API guard fires correctly
    expect(validateMessageBody('a'.repeat(MESSAGE_MAX_LENGTH + 1))).toMatch(/too long/)
  })

  it('trims before length check — leading/trailing whitespace does not affect limit', () => {
    const padded = '  ' + 'a'.repeat(MESSAGE_MAX_LENGTH) + '  '
    expect(validateMessageBody(padded)).toBeNull()
  })

  it('returns error for non-string values', () => {
    expect(validateMessageBody(null)).toBe('body required')
    expect(validateMessageBody(undefined)).toBe('body required')
    expect(validateMessageBody(42)).toBe('body required')
  })
})
