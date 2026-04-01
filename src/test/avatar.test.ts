import { describe, it, expect } from 'vitest'
import { getInitials, getAvatarColor, validateAvatarFile } from '@/lib/avatar'

const MB = 1024 * 1024

describe('getInitials', () => {
  it('returns two initials for first + last name', () => {
    expect(getInitials('Wim Buskens')).toBe('WB')
  })

  it('returns single initial for single-word name', () => {
    expect(getInitials('sarah')).toBe('S')
  })

  it('uses first + last word for multi-word names', () => {
    expect(getInitials('John Michael Smith')).toBe('JS')
  })

  it('returns ? for empty string', () => {
    expect(getInitials('')).toBe('?')
  })

  it('returns ? for null', () => {
    expect(getInitials(null)).toBe('?')
  })

  it('returns ? for undefined', () => {
    expect(getInitials(undefined)).toBe('?')
  })

  it('returns ? for whitespace-only', () => {
    expect(getInitials('   ')).toBe('?')
  })

  it('uppercases the initials', () => {
    expect(getInitials('alice bob')).toBe('AB')
  })
})

describe('getAvatarColor', () => {
  it('returns one of the 6 brand colors', () => {
    const BRAND_COLORS = ['#0D9373', '#7C3AED', '#D97706', '#2563EB', '#E11D48', '#76766E']
    const color = getAvatarColor('Wim Buskens')
    expect(BRAND_COLORS).toContain(color)
  })

  it('is deterministic — same name always returns same color', () => {
    expect(getAvatarColor('Alice')).toBe(getAvatarColor('Alice'))
    expect(getAvatarColor('Bob Smith')).toBe(getAvatarColor('Bob Smith'))
  })

  it('all 6 colors are reachable (tests each modulo bucket)', () => {
    const BRAND_COLORS = ['#0D9373', '#7C3AED', '#D97706', '#2563EB', '#E11D48', '#76766E']
    // Find a name that produces each color by brute force over short names
    const seen = new Set<string>()
    for (let a = 65; a < 90; a++) {
      for (let b = 65; b < 90; b++) {
        const name = String.fromCharCode(a) + String.fromCharCode(b)
        seen.add(getAvatarColor(name))
        if (seen.size === 6) break
      }
      if (seen.size === 6) break
    }
    expect(seen.size).toBe(6)
    for (const color of BRAND_COLORS) expect(seen).toContain(color)
  })

  it('returns a color for null/undefined', () => {
    const BRAND_COLORS = ['#0D9373', '#7C3AED', '#D97706', '#2563EB', '#E11D48', '#76766E']
    expect(BRAND_COLORS).toContain(getAvatarColor(null))
    expect(BRAND_COLORS).toContain(getAvatarColor(undefined))
  })
})

describe('validateAvatarFile', () => {
  it('accepts image/jpeg under 2MB', () => {
    expect(validateAvatarFile({ type: 'image/jpeg', size: MB })).toEqual({ valid: true })
  })

  it('accepts image/png under 2MB', () => {
    expect(validateAvatarFile({ type: 'image/png', size: MB })).toEqual({ valid: true })
  })

  it('accepts image/webp under 2MB', () => {
    expect(validateAvatarFile({ type: 'image/webp', size: MB })).toEqual({ valid: true })
  })

  it('accepts file exactly at 2MB boundary', () => {
    expect(validateAvatarFile({ type: 'image/jpeg', size: 2 * MB })).toEqual({ valid: true })
  })

  it('rejects image/gif', () => {
    const result = validateAvatarFile({ type: 'image/gif', size: MB })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/invalid type/i)
  })

  it('rejects application/pdf', () => {
    const result = validateAvatarFile({ type: 'application/pdf', size: MB })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/invalid type/i)
  })

  it('rejects files over 2MB', () => {
    const result = validateAvatarFile({ type: 'image/jpeg', size: 3 * MB })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/too large/i)
  })

  it('rejects empty file (0 bytes)', () => {
    const result = validateAvatarFile({ type: 'image/jpeg', size: 0 })
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/empty/i)
  })
})
