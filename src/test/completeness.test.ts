import { describe, it, expect } from 'vitest'
import { computeCompleteness } from '@/lib/completeness'
import type { CompletenessInput } from '@/lib/completeness'

const empty: CompletenessInput = {
  has_avatar: false,
  has_bio: false,
  has_experience: false,
  has_education: false,
  has_skills: false,
  has_2plus_posts: false,
  has_website: false,
}

const full: CompletenessInput = {
  has_avatar: true,
  has_bio: true,
  has_experience: true,
  has_education: true,
  has_skills: true,
  has_2plus_posts: true,
  has_website: true,
}

describe('computeCompleteness', () => {
  it('returns 0 score for completely empty profile', () => {
    const { score } = computeCompleteness(empty)
    expect(score).toBe(0)
  })

  it('returns 100 score for fully complete profile', () => {
    const { score } = computeCompleteness(full)
    expect(score).toBe(100)
  })

  it('returns no hints for fully complete profile', () => {
    const { hints } = computeCompleteness(full)
    expect(hints).toHaveLength(0)
  })

  it('returns 7 hints for empty profile', () => {
    const { hints } = computeCompleteness(empty)
    expect(hints).toHaveLength(7)
  })

  it('awards 20 pts for avatar', () => {
    const { score } = computeCompleteness({ ...empty, has_avatar: true })
    expect(score).toBe(20)
  })

  it('awards 15 pts for bio', () => {
    const { score } = computeCompleteness({ ...empty, has_bio: true })
    expect(score).toBe(15)
  })

  it('awards 15 pts for experience', () => {
    const { score } = computeCompleteness({ ...empty, has_experience: true })
    expect(score).toBe(15)
  })

  it('awards 15 pts for education', () => {
    const { score } = computeCompleteness({ ...empty, has_education: true })
    expect(score).toBe(15)
  })

  it('awards 15 pts for skills', () => {
    const { score } = computeCompleteness({ ...empty, has_skills: true })
    expect(score).toBe(15)
  })

  it('awards 10 pts for 2+ posts', () => {
    const { score } = computeCompleteness({ ...empty, has_2plus_posts: true })
    expect(score).toBe(10)
  })

  it('awards 10 pts for website', () => {
    const { score } = computeCompleteness({ ...empty, has_website: true })
    expect(score).toBe(10)
  })

  it('accumulates points correctly', () => {
    const { score } = computeCompleteness({ ...empty, has_bio: true, has_experience: true, has_skills: true })
    expect(score).toBe(45) // 15 + 15 + 15
  })

  it('hint labels describe what is missing', () => {
    const { hints } = computeCompleteness({ ...empty, has_bio: true })
    const labels = hints.map(h => h.label)
    expect(labels).not.toContain('Add a bio')
    expect(labels).toContain('Add a photo')
    expect(labels).toContain('Add experience')
  })

  it('hint pts sum equals missing score', () => {
    const { score, hints } = computeCompleteness({ ...empty, has_bio: true })
    const hintSum = hints.reduce((acc, h) => acc + h.pts, 0)
    expect(score + hintSum).toBe(100)
  })
})
