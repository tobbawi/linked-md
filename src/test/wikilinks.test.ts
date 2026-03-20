import { describe, it, expect } from 'vitest'
import { slugifyWikilink, parseWikilinks, renderWikilinks } from '@/lib/wikilinks'

describe('slugifyWikilink', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyWikilink('Sarah Chen')).toBe('sarah-chen')
  })

  it('strips non-alphanumeric characters', () => {
    expect(slugifyWikilink('Anthropic, Inc.')).toBe('anthropic-inc')
  })

  it('handles already-slugified input', () => {
    expect(slugifyWikilink('wim')).toBe('wim')
  })

  it('collapses multiple spaces to single hyphen', () => {
    expect(slugifyWikilink('John   Doe')).toBe('john-doe')
  })
})

describe('parseWikilinks', () => {
  it('extracts wikilinks from content', () => {
    const content = 'Hello [[Sarah Chen]] and [[Anthropic]]'
    expect(parseWikilinks(content)).toEqual(['Sarah Chen', 'Anthropic'])
  })

  it('deduplicates wikilinks', () => {
    const content = '[[Wim]] met [[Wim]] yesterday'
    expect(parseWikilinks(content)).toEqual(['Wim'])
  })

  it('returns empty array when no wikilinks', () => {
    expect(parseWikilinks('plain text')).toEqual([])
  })

  it('ignores malformed wikilinks: empty [[]]', () => {
    const links = parseWikilinks('[[]] is empty')
    expect(links).toEqual([])
  })

  it('handles nested brackets gracefully', () => {
    // [[a [[b]]]] — outer closes at first ]] giving "a [[b"
    const links = parseWikilinks('[[a [[b]]]]')
    expect(links.length).toBeGreaterThanOrEqual(0) // no crash
  })
})

describe('renderWikilinks', () => {
  it('renders resolved wikilink as anchor', () => {
    const resolved = new Set(['sarah-chen'])
    const output = renderWikilinks('Hello [[Sarah Chen]]', resolved)
    expect(output).toContain('href="/profile/sarah-chen"')
    expect(output).toContain('class="wikilink-resolved"')
    expect(output).toContain('>Sarah Chen<')
  })

  it('renders unresolved wikilink as plain span with tooltip', () => {
    const resolved = new Set<string>()
    const output = renderWikilinks('Hello [[Unknown Person]]', resolved)
    expect(output).toContain('class="wikilink-unresolved"')
    expect(output).toContain('[[Unknown Person]]')
    expect(output).toContain('title="Search for Unknown Person"')
    expect(output).not.toContain('<a ')
  })

  it('handles content with no wikilinks unchanged', () => {
    const resolved = new Set<string>()
    const content = 'plain text, no links'
    expect(renderWikilinks(content, resolved)).toBe(content)
  })
})
