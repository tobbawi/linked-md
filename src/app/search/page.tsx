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
    <div className="pt-xl pb-3xl">
      {/* Search input */}
      <div className="mb-lg">
        <input
          autoFocus
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people, companies, posts…"
          className="search-input w-full text-[1rem] font-sans py-[10px] px-[14px] border border-border rounded-md bg-card text-ink focus:border-primary"
          onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-xs border-b border-border mb-lg">
        {(['people', 'companies', 'posts'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="py-[8px] px-[16px] text-[13px] font-medium font-sans bg-transparent border-none cursor-pointer -mb-[1px]"
            style={{
              borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
              color: tab === t ? 'var(--color-primary)' : 'var(--color-secondary)',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {q && tabCounts[t] > 0 && (
              <span className="ml-[6px] text-[11px] bg-primary-light text-primary py-[1px] px-[6px] rounded-full">
                {tabCounts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Empty / loading */}
      {!q && (
        <p className="text-muted text-[14px]">
          Start typing to search across the network.
        </p>
      )}
      {q && loading && (
        <p className="text-muted text-[14px]">Searching…</p>
      )}

      {/* Results */}
      {q && !loading && tab === 'people' && (
        results.profiles.length === 0 ? (
          <p className="text-muted text-[14px]">No people found for &ldquo;{q}&rdquo;.</p>
        ) : (
          <div className="flex flex-col gap-xs">
            {results.profiles.map((p) => (
              <Link key={p.slug} href={`/profile/${p.slug}`} className="no-underline">
                <div className="search-result-row">
                  <div className="w-[36px] h-[36px] rounded-full bg-primary-light border border-primary flex items-center justify-center text-[14px] font-bold text-primary font-serif shrink-0">
                    {p.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-ink text-[14px]">
                      {p.display_name}
                    </div>
                    {p.title && (
                      <div className="text-[12px] text-secondary">{p.title}</div>
                    )}
                    {!p.title && p.bio && (
                      <div className="text-[12px] text-secondary">
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
          <p className="text-muted text-[14px]">No companies found for &ldquo;{q}&rdquo;.</p>
        ) : (
          <div className="flex flex-col gap-xs">
            {results.companies.map((c) => (
              <Link key={c.slug} href={`/company/${c.slug}`} className="no-underline">
                <div className="search-result-row">
                  <div className="w-[36px] h-[36px] rounded-sm bg-card border border-border flex items-center justify-center text-[14px] font-bold text-secondary font-serif shrink-0">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-ink text-[14px]">
                      {c.name}
                    </div>
                    {c.tagline && (
                      <div className="text-[12px] text-secondary">
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
          <p className="text-muted text-[14px]">No posts found for &ldquo;{q}&rdquo;.</p>
        ) : (
          <div className="flex flex-col gap-xs">
            {results.posts.map((p) => (
              <Link
                key={`${p.profile?.slug}-${p.slug}`}
                href={p.profile ? `/profile/${p.profile.slug}/post/${p.slug}` : '#'}
                className="no-underline"
              >
                <div className="search-result-row flex-col items-start gap-2xs">
                  <div className="font-medium text-ink text-[14px]">
                    {p.title ?? `/${p.slug}.md`}
                  </div>
                  {p.profile && (
                    <div className="text-[11px] text-muted">
                      by {p.profile.display_name}
                    </div>
                  )}
                  <div className="text-[12px] text-secondary leading-[1.4]">
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
