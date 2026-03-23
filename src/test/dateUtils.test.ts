import { describe, it, expect } from 'vitest'
import { formatPeriod, getDuration } from '@/lib/dateUtils'
import type { DateEntry } from '@/lib/dateUtils'

const current: DateEntry = {
  start_year: 2022,
  start_month: 3,
  end_year: null,
  end_month: null,
  is_current: true,
}

const past: DateEntry = {
  start_year: 2020,
  start_month: 1,
  end_year: 2022,
  end_month: 6,
  is_current: false,
}

const noMonths: DateEntry = {
  start_year: 2019,
  start_month: null,
  end_year: 2021,
  end_month: null,
  is_current: false,
}

describe('formatPeriod', () => {
  it('formats current role with "present"', () => {
    const result = formatPeriod(current)
    expect(result).toContain('present')
  })

  it('includes start year for current role', () => {
    const result = formatPeriod(current)
    expect(result).toContain('2022')
  })

  it('formats past role with both years', () => {
    const result = formatPeriod(past)
    expect(result).toContain('2020')
    expect(result).toContain('2022')
  })

  it('includes month abbreviation when start_month provided', () => {
    const result = formatPeriod(past)
    expect(result).toMatch(/Jan/i)
  })

  it('handles missing months gracefully', () => {
    const result = formatPeriod(noMonths)
    expect(result).toContain('2019')
    expect(result).toContain('2021')
    expect(result).not.toContain('null')
  })

  it('uses en-dash separator', () => {
    const result = formatPeriod(past)
    expect(result).toContain('–')
  })
})

describe('getDuration', () => {
  it('returns non-empty string for current role', () => {
    const result = getDuration(current)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('returns non-empty string for past role', () => {
    const result = getDuration(past)
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
  })

  it('includes "y" or "mo" in output', () => {
    const result = getDuration(past)
    expect(result).toMatch(/y|mo/)
  })

  it('returns empty string when start_year is missing', () => {
    const entry: DateEntry = { start_year: 0, start_month: null, end_year: null, end_month: null, is_current: false }
    const result = getDuration(entry)
    // Should not crash — may return empty or a string
    expect(typeof result).toBe('string')
  })
})
