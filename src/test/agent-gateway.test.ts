/**
 * Tests for M6 — AI Agent Gateway endpoints
 *
 * Covers: robots.txt, /llms.txt, paginated profile/company index,
 * LLM-format search, graph.json scale fix.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Supabase mock ────────────────────────────────────────────────────────────

function mockChain(resolved: { data?: unknown; error?: unknown }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: Record<string, any> = {
    then: (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
      Promise.resolve(resolved).then(onFulfilled, onRejected),
  }
  ;['select', 'eq', 'neq', 'gt', 'in', 'or', 'contains', 'order', 'limit'].forEach(m => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  ;['single', 'maybeSingle'].forEach(m => {
    chain[m] = vi.fn().mockResolvedValue(resolved)
  })
  return chain
}

const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createServerClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'https://linked.md')
})

// ── robots.txt ───────────────────────────────────────────────────────────────

describe('GET /robots.txt', () => {
  it('returns AI-friendly directives with X-Llms-Txt header', async () => {
    const { GET } = await import('@/app/robots.txt/route')
    const res = await GET()
    const text = await res.text()

    expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('X-Llms-Txt')).toBe('/llms.txt')
    expect(text).toContain('User-agent: *')
    expect(text).toContain('Allow: /')
    expect(text).toContain('GPTBot')
    expect(text).toContain('ClaudeBot')
    expect(text).toContain('PerplexityBot')
  })
})

// ── /llms.txt ────────────────────────────────────────────────────────────────

describe('GET /llms.txt', () => {
  it('returns platform overview in markdown', async () => {
    const { GET } = await import('@/app/llms.txt/route')
    const res = await GET()
    const text = await res.text()

    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8')
    expect(text).toContain('# linked.md')
    expect(text).toContain('/profile/{slug}/llm.txt')
    expect(text).toContain('/network/profiles/llm.txt')
    expect(text).toContain('/network/companies/llm.txt')
    expect(text).toContain('format=llm')
  })
})

// ── Paginated profile index ──────────────────────────────────────────────────

describe('GET /network/profiles/llm.txt', () => {
  it('returns first page of profiles in markdown', async () => {
    const profiles = [
      { slug: 'alice', display_name: 'Alice Smith', title: 'Engineer', location: 'Amsterdam' },
      { slug: 'bob', display_name: 'Bob Jones', title: 'Designer', location: null },
    ]
    mockFrom.mockReturnValue(mockChain({ data: profiles }))

    const { GET } = await import('@/app/network/profiles/llm.txt/route')
    const req = new NextRequest('https://linked.md/network/profiles/llm.txt')
    const res = await GET(req)
    const text = await res.text()

    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8')
    expect(text).toContain('# linked.md — Profile Directory')
    expect(text).toContain('**Alice Smith** — Engineer, Amsterdam')
    expect(text).toContain('**Bob Jones** — Designer')
    expect(text).toContain('/profile/alice/llm.txt')
    // No next link when less than PAGE_SIZE+1 results
    expect(res.headers.get('Link')).toBeNull()
  })

  it('includes Link header when more pages exist', async () => {
    // 101 profiles = has next page
    const profiles = Array.from({ length: 101 }, (_, i) => ({
      slug: `user-${String(i).padStart(3, '0')}`,
      display_name: `User ${i}`,
      title: null,
      location: null,
    }))
    mockFrom.mockReturnValue(mockChain({ data: profiles }))

    const { GET } = await import('@/app/network/profiles/llm.txt/route')
    const req = new NextRequest('https://linked.md/network/profiles/llm.txt')
    const res = await GET(req)
    const text = await res.text()

    expect(res.headers.get('Link')).toContain('rel="next"')
    expect(res.headers.get('Link')).toContain('cursor=user-099')
    expect(text).toContain('Next:')
    // Should only have 100 entries, not 101
    expect(text).not.toContain('user-100')
  })

  it('passes cursor to query when provided', async () => {
    mockFrom.mockReturnValue(mockChain({ data: [] }))

    const { GET } = await import('@/app/network/profiles/llm.txt/route')
    const req = new NextRequest('https://linked.md/network/profiles/llm.txt?cursor=jane')
    const res = await GET(req)
    const text = await res.text()

    expect(text).toContain('Page cursor: jane')
  })
})

// ── Paginated company index ──────────────────────────────────────────────────

describe('GET /network/companies/llm.txt', () => {
  it('returns companies in markdown', async () => {
    const companies = [
      { slug: 'acme', name: 'Acme Corp', tagline: 'Building the future' },
      { slug: 'globex', name: 'Globex', tagline: null },
    ]
    mockFrom.mockReturnValue(mockChain({ data: companies }))

    const { GET } = await import('@/app/network/companies/llm.txt/route')
    const req = new NextRequest('https://linked.md/network/companies/llm.txt')
    const res = await GET(req)
    const text = await res.text()

    expect(text).toContain('# linked.md — Company Directory')
    expect(text).toContain('**Acme Corp** — Building the future')
    expect(text).toContain('**Globex**')
    expect(text).toContain('/company/acme/llm.txt')
  })
})

// ── LLM-format search ────────────────────────────────────────────────────────

describe('GET /api/search?format=llm', () => {
  it('returns empty query help text', async () => {
    const { GET } = await import('@/app/api/search/route')
    const req = new NextRequest('https://linked.md/api/search?format=llm')
    const res = await GET(req)
    const text = await res.text()

    expect(res.headers.get('Content-Type')).toBe('text/markdown; charset=utf-8')
    expect(text).toContain('No query provided')
  })

  it('returns markdown search results', async () => {
    const profiles = [{ slug: 'alice', display_name: 'Alice', title: 'ML Engineer' }]
    const companies = [{ slug: 'deeptech', name: 'DeepTech', tagline: 'AI consultancy' }]
    const posts = [{ slug: 'ml-post', title: 'ML Guide', profile: { slug: 'bob', display_name: 'Bob' } }]

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return mockChain({ data: profiles })
      if (table === 'companies') return mockChain({ data: companies })
      if (table === 'posts') return mockChain({ data: posts })
      return mockChain({ data: [] })
    })

    const { GET } = await import('@/app/api/search/route')
    const req = new NextRequest('https://linked.md/api/search?q=ML&format=llm')
    const res = await GET(req)
    const text = await res.text()

    expect(text).toContain('Search results for "ML"')
    expect(text).toContain('**Alice** — ML Engineer')
    expect(text).toContain('/profile/alice/llm.txt')
    expect(text).toContain('**DeepTech** — AI consultancy')
    expect(text).toContain('**ML Guide** by Bob')
  })
})

// ── graph.json scale fix ─────────────────────────────────────────────────────

describe('GET /api/graph/[slug]', () => {
  it('returns 404 for unknown profile', async () => {
    mockFrom.mockReturnValue(mockChain({ data: null }))

    const { GET } = await import('@/app/api/graph/[slug]/route')
    const req = new NextRequest('https://linked.md/api/graph/unknown')
    const res = await GET(req, { params: { slug: 'unknown' } })

    expect(res.status).toBe(404)
  })

  it('returns graph using outbound_links arrays (no O(n) scan)', async () => {
    const profile = {
      id: 'p1',
      slug: 'alice',
      display_name: 'Alice',
      outbound_links: ['bob', 'carol'],
    }
    const posts = [{ outbound_links: ['dave'] }]
    const resolvedProfiles = [{ slug: 'bob' }, { slug: 'carol' }]
    const inboundProfiles = [{ slug: 'eve', display_name: 'Eve' }]

    let callCount = 0
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        callCount++
        if (callCount === 1) return mockChain({ data: profile }) // get profile
        if (callCount === 2) return mockChain({ data: resolvedProfiles }) // resolve outbound
        if (callCount === 3) return mockChain({ data: inboundProfiles }) // inbound
      }
      if (table === 'posts') return mockChain({ data: posts })
      return mockChain({ data: [] })
    })

    const { GET } = await import('@/app/api/graph/[slug]/route')
    const req = new NextRequest('https://linked.md/api/graph/alice')
    const res = await GET(req, { params: { slug: 'alice' } })
    const json = await res.json()

    expect(json.profile.slug).toBe('alice')
    expect(json.outbound).toHaveLength(3) // bob, carol, dave
    expect(json.outbound.map((o: { slug: string }) => o.slug).sort()).toEqual(['bob', 'carol', 'dave'])
    expect(json.inbound).toEqual([{ slug: 'eve', display_name: 'Eve' }])
    expect(json.post_count).toBe(1)
  })
})
