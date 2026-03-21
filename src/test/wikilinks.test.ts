import { describe, it, expect } from 'vitest'
import {
  extractWikilinks,
  toSlug,
  renderWikilinks,
  parseWikilinkSegments,
} from '@/lib/wikilinks'

describe('toSlug', () => {
  it('lowercases and hyphenates', () => {
    expect(toSlug('Jane Doe')).toBe('jane-doe')
  })

  it('handles multiple spaces', () => {
    expect(toSlug('Ada  Lovelace')).toBe('ada-lovelace')
  })

  it('strips leading/trailing hyphens', () => {
    expect(toSlug('  Jane  ')).toBe('jane')
  })

  it('handles special characters', () => {
    expect(toSlug('O\'Brien & Co')).toBe('o-brien-co')
  })

  it('handles single word', () => {
    expect(toSlug('alice')).toBe('alice')
  })

  it('handles empty string', () => {
    expect(toSlug('')).toBe('')
  })
})

describe('extractWikilinks', () => {
  it('extracts a single wikilink', () => {
    expect(extractWikilinks('Hello [[Jane Doe]]!')).toEqual(['Jane Doe'])
  })

  it('extracts multiple wikilinks', () => {
    expect(extractWikilinks('[[Alice]] and [[Bob]] met [[Carol]]')).toEqual([
      'Alice',
      'Bob',
      'Carol',
    ])
  })

  it('returns empty array for no wikilinks', () => {
    expect(extractWikilinks('No links here.')).toEqual([])
  })

  it('handles wikilinks at start and end', () => {
    expect(extractWikilinks('[[Start]] middle [[End]]')).toEqual(['Start', 'End'])
  })

  it('ignores partial brackets', () => {
    expect(extractWikilinks('[Not a link] and [[Valid]]')).toEqual(['Valid'])
  })
})

describe('renderWikilinks', () => {
  it('renders resolved wikilinks as anchors', () => {
    const resolved = new Set(['jane-doe'])
    const html = renderWikilinks('Hello [[Jane Doe]]!', resolved)
    expect(html).toContain('<a href="/profile/jane-doe"')
    expect(html).toContain('class="wikilink-resolved"')
    expect(html).toContain('>Jane Doe</a>')
  })

  it('renders unresolved wikilinks as spans', () => {
    const resolved = new Set<string>()
    const html = renderWikilinks('Hello [[Unknown Person]]!', resolved)
    expect(html).toContain('<span class="wikilink-unresolved"')
    expect(html).toContain('[[Unknown Person]]')
  })

  it('handles mixed resolved and unresolved', () => {
    const resolved = new Set(['alice'])
    const html = renderWikilinks('[[Alice]] and [[Bob]]', resolved)
    expect(html).toContain('href="/profile/alice"')
    expect(html).toContain('wikilink-unresolved')
    expect(html).toContain('[[Bob]]')
  })

  it('returns content unchanged when no wikilinks', () => {
    const resolved = new Set<string>()
    const text = 'No wikilinks here.'
    expect(renderWikilinks(text, resolved)).toBe(text)
  })

  it('handles consecutive wikilinks', () => {
    const resolved = new Set(['alice', 'bob'])
    const html = renderWikilinks('[[Alice]][[Bob]]', resolved)
    expect(html).toContain('href="/profile/alice"')
    expect(html).toContain('href="/profile/bob"')
  })
})

describe('parseWikilinkSegments', () => {
  it('returns a single text segment for no wikilinks', () => {
    const segments = parseWikilinkSegments('Hello world', new Set())
    expect(segments).toEqual([{ type: 'text', content: 'Hello world' }])
  })

  it('returns profile segment for known slug', () => {
    const segments = parseWikilinkSegments('[[Alice]]', new Set(['alice']))
    expect(segments).toEqual([{ type: 'profile', name: 'Alice', display: 'Alice', slug: 'alice' }])
  })

  it('returns unresolved segment for unknown slug', () => {
    const segments = parseWikilinkSegments('[[Ghost]]', new Set())
    expect(segments).toEqual([{ type: 'unresolved', name: 'Ghost', display: 'Ghost' }])
  })

  it('interleaves text and link segments', () => {
    const segments = parseWikilinkSegments('Hello [[Jane Doe]] today', new Set(['jane-doe']))
    expect(segments).toEqual([
      { type: 'text', content: 'Hello ' },
      { type: 'profile', name: 'Jane Doe', display: 'Jane Doe', slug: 'jane-doe' },
      { type: 'text', content: ' today' },
    ])
  })

  it('handles text after last wikilink', () => {
    const segments = parseWikilinkSegments('[[Alice]] and more', new Set(['alice']))
    expect(segments[segments.length - 1]).toEqual({ type: 'text', content: ' and more' })
  })
})
