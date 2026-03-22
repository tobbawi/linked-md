'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Tab = 'people' | 'companies' | 'posts'

interface ProfileResult {
  slug: string
  display_name: string
  title?: string | null
  bio?: string | null
}

interface CompanyResult {
  slug: string
  name: string
  tagline?: string | null
}

interface PostResult {
  slug: string
  title?: string | null
  markdown_content: string
  profile: { slug: string; display_name: string } | null
}

interface SearchResults {
  profiles: ProfileResult[]
  companies: CompanyResult[]
  posts: PostResult[]
}

function snippet(text: string, q: string, max = 120): string {
  const idx = text.toLowerCase().indexOf(q.toLowerCase())
  if (idx === -1) return text.slice(0, max)
  const start = Math.max(0, idx - 40)
  const end = Math.min(text.length, idx + 80)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<Tab>('people')
  const [results, setResults] = useState<SearchResults>({ profiles: [], companies: [], posts: [] })
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults({ profiles: [], companies: [], posts: [] })
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=all`)
      const data = await res.json()
      setResults(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => search(q), 250)
    return () => clearTimeout(t)
  }, [q, search])

  const tabCounts = {
    people: results.profiles.length,
    companies: results.companies.length,
    posts: results.posts.length,
  }

  return (
    <div style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
      {/* Search input */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <input
          autoFocus
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people, companies, posts…"
          style={{
            width: '100%',
            fontSize: '1rem',
            fontFamily: 'var(--font-sans)',
            padding: '10px 14px',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-card)',
            color: 'var(--color-ink)',
            }}
          className="search-input"
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
        />
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-xs)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        {(['people', 'companies', 'posts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: tab === t ? 'var(--color-primary)' : 'var(--color-secondary)',
              cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {q && tabCounts[t] > 0 && (
              <span
                style={{
                  marginLeft: '6px',
                  fontSize: '11px',
                  background: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {tabCounts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty / loading */}
      {!q && (
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
          Start typing to search across the network.
        </p>
      )}
      {q && loading && (
        <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Searching…</p>
      )}

      {/* Results */}
      {q && !loading && tab === 'people' && (
        results.profiles.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>No people found for "{q}".</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {results.profiles.map((p) => (
              <Link key={p.slug} href={`/profile/${p.slug}`} style={{ textDecoration: 'none' }}>
                <div className="search-result-row">
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--color-primary-light)',
                      border: '1px solid var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      fontFamily: 'var(--font-serif)',
                      flexShrink: 0,
                    }}
                  >
                    {p.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--color-ink)', fontSize: '14px' }}>
                      {p.display_name}
                    </div>
                    {p.title && (
                      <div style={{ fontSize: '12px', color: 'var(--color-secondary)' }}>{p.title}</div>
                    )}
                    {!p.title && p.bio && (
                      <div style={{ fontSize: '12px', color: 'var(--color-secondary)' }}>
                        {snippet(p.bio, q)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {q && !loading && tab === 'companies' && (
        results.companies.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>No companies found for "{q}".</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {results.companies.map((c) => (
              <Link key={c.slug} href={`/company/${c.slug}`} style={{ textDecoration: 'none' }}>
                <div className="search-result-row">
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--color-secondary)',
                      fontFamily: 'var(--font-serif)',
                      flexShrink: 0,
                    }}
                  >
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--color-ink)', fontSize: '14px' }}>
                      {c.name}
                    </div>
                    {c.tagline && (
                      <div style={{ fontSize: '12px', color: 'var(--color-secondary)' }}>
                        {snippet(c.tagline, q)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {q && !loading && tab === 'posts' && (
        results.posts.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>No posts found for "{q}".</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)' }}>
            {results.posts.map((p) => (
              <Link
                key={`${p.profile?.slug}-${p.slug}`}
                href={p.profile ? `/profile/${p.profile.slug}/post/${p.slug}` : '#'}
                style={{ textDecoration: 'none' }}
              >
                <div className="search-result-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--space-2xs)' }}>
                  <div style={{ fontWeight: 500, color: 'var(--color-ink)', fontSize: '14px' }}>
                    {p.title ?? `/${p.slug}.md`}
                  </div>
                  {p.profile && (
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                      by {p.profile.display_name}
                    </div>
                  )}
                  <div style={{ fontSize: '12px', color: 'var(--color-secondary)', lineHeight: 1.4 }}>
                    {snippet(p.markdown_content, q)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )
      )}
    </div>
  )
}
