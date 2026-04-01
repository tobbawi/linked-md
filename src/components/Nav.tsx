'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import Avatar from '@/components/Avatar'
import type { Notification } from '@/types'

interface NavProps {
  user: User | null
  profileSlug: string | null
  displayName?: string | null
  avatarUrl?: string | null
}

interface SearchResults {
  profiles: { slug: string; display_name: string; title?: string | null }[]
  companies: { slug: string; name: string }[]
  posts: { slug: string; title: string | null; profile: { slug: string; display_name: string } }[]
}

const NAV_LINKS = [
  { href: '/', label: 'Feed' },
  { href: '/explore', label: 'Explore' },
  { href: '/people', label: 'People' },
  { href: '/jobs', label: 'Jobs' },
]

function notificationLabel(n: Notification): string {
  const actor = n.actor?.display_name ?? 'Someone'
  const postTitle = n.post?.title ? `"${n.post.title}"` : 'your post'
  switch (n.type) {
    case 'follow': return `${actor} followed you`
    case 'company_follow': return `${actor} followed your company`
    case 'like': return `${actor} liked ${postTitle}`
    case 'comment': return `${actor} commented on ${postTitle}`
    case 'endorse': return `${actor} endorsed a skill`
    case 'recommendation': return `${actor} wrote you a recommendation`
    case 'repost': return `${actor} reposted ${postTitle}`
    default: return `${actor} interacted with you`
  }
}

function notificationHref(n: Notification): string {
  if (n.actor?.slug) {
    if (n.type === 'follow' || n.type === 'endorse' || n.type === 'recommendation') {
      return `/profile/${n.actor.slug}`
    }
    if (n.post?.slug) {
      return `/profile/${n.actor.slug}/post/${n.post.slug}`
    }
    // Repost/like/comment where post was deleted — fall back to actor profile
    return `/profile/${n.actor.slug}`
  }
  return '/'
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(1, mins)}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

// ── Search box ────────────────────────────────────────────────────────────────

function SearchBox() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    if (!q.trim()) { setResults(null); setOpen(false); return }
    setLoading(true)
    fetch(`/api/search?type=all&q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((data) => { setResults(data); setOpen(true) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 300)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
  }

  function navigate(href: string) {
    setOpen(false)
    setQuery('')
    setResults(null)
    router.push(href)
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const hasResults = results && (
    results.profiles.length > 0 || results.companies.length > 0 || results.posts.length > 0
  )

  return (
    <div ref={containerRef} className="nav-search-desktop" style={{ position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <svg
          style={{ position: 'absolute', left: '8px', color: 'var(--color-muted)', pointerEvents: 'none' }}
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results && query) setOpen(true) }}
          placeholder="Search…"
          style={{
            width: '180px',
            padding: `5px ${loading ? '24px' : '8px'} 5px 28px`,
            fontSize: '13px',
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-text)',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            outline: 'none',
            transition: 'border-color 150ms, width 150ms',
          }}
          onFocusCapture={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.width = '220px' }}
          onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.width = '180px' }}
        />
      </div>

      {open && query && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '300px',
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          {!hasResults ? (
            <div style={{ padding: 'var(--space-md)', fontSize: '13px', color: 'var(--color-muted)', textAlign: 'center' }}>
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {results.profiles.length > 0 && (
                <Section label="People">
                  {results.profiles.map((p) => (
                    <ResultRow
                      key={p.slug}
                      primary={p.display_name}
                      secondary={p.title ?? undefined}
                      onClick={() => navigate(`/profile/${p.slug}`)}
                    />
                  ))}
                </Section>
              )}
              {results.companies.length > 0 && (
                <Section label="Companies">
                  {results.companies.map((c) => (
                    <ResultRow
                      key={c.slug}
                      primary={c.name}
                      onClick={() => navigate(`/company/${c.slug}`)}
                    />
                  ))}
                </Section>
              )}
              {results.posts.length > 0 && (
                <Section label="Posts">
                  {results.posts.map((p) => (
                    <ResultRow
                      key={p.slug}
                      primary={p.title ?? '(untitled)'}
                      secondary={p.profile.display_name}
                      onClick={() => navigate(`/profile/${p.profile.slug}/post/${p.slug}`)}
                    />
                  ))}
                </Section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        padding: '6px 12px 4px',
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        fontWeight: 600,
        color: 'var(--color-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        borderTop: '1px solid var(--color-border)',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function ResultRow({ primary, secondary, onClick }: { primary: string; secondary?: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '7px 12px',
        background: hovered ? 'var(--color-primary-light)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)', lineHeight: 1.3 }}>{primary}</div>
      {secondary && <div style={{ fontSize: '11px', color: 'var(--color-muted)' }}>{secondary}</div>}
    </button>
  )
}

// ── Notification bell ─────────────────────────────────────────────────────────

function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(() => {
    fetch('/api/notifications')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setNotifications(data.notifications ?? [])
          setUnread(data.unread ?? 0)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next && unread > 0) {
      setUnread(0)
      fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {})
    }
  }

  function handleNotificationClick(n: Notification) {
    setOpen(false)
    router.push(notificationHref(n))
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={toggleOpen}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: open ? 'var(--color-ink)' : 'var(--color-secondary)',
          borderRadius: 'var(--radius-sm)',
          transition: 'color 150ms ease',
        }}
        title="Notifications"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '8px',
            height: '8px',
            background: 'var(--color-primary)',
            borderRadius: '50%',
            border: '1.5px solid var(--color-bg)',
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          width: '320px',
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          zIndex: 100,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 14px',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Notifications</span>
          </div>

          {notifications.length === 0 ? (
            <div style={{ padding: 'var(--space-lg)', fontSize: '13px', color: 'var(--color-muted)', textAlign: 'center' }}>
              No notifications yet
            </div>
          ) : (
            <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
              {notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--space-sm)',
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    background: n.read ? 'transparent' : 'var(--color-primary-light)',
                    border: 'none',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    transition: 'background 150ms ease',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--color-bg)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = n.read ? 'transparent' : 'var(--color-primary-light)' }}
                >
                  {n.actor && (
                    <div style={{ flexShrink: 0, marginTop: '1px' }}>
                      <Avatar name={n.actor.display_name} size={28} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: 'var(--color-text)', lineHeight: 1.4 }}>
                      {notificationLabel(n)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                      {timeAgo(n.created_at)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────

export function Nav({ user, profileSlug, displayName, avatarUrl }: NavProps) {
  const pathname = usePathname()

  return (
    <nav
      style={{
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          padding: '0 var(--space-lg)',
          height: '52px',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '20px',
              fontStyle: 'italic',
              fontWeight: 600,
              color: 'var(--color-ink)',
              letterSpacing: '-0.02em',
            }}
          >
            linked
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              color: 'var(--color-primary)',
              background: 'var(--color-primary-light)',
              padding: '2px 5px',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            .md
          </span>
        </Link>

        {/* Search — desktop only */}
        <SearchBox />

        {/* Center nav links — hidden on mobile */}
        <div className="nav-center">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: isActive ? 'var(--color-ink)' : 'var(--color-secondary)',
                  textDecoration: 'none',
                  padding: '4px 0',
                  borderBottom: `2px solid ${isActive ? 'var(--color-primary)' : 'transparent'}`,
                  transition: 'color 150ms ease, border-color 150ms ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: '44px',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {user ? (
            <>
              {/* Notification bell */}
              <NotificationBell />

              {/* Write button */}
              <Link
                href="/post/new"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--color-secondary)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  transition: 'background 150ms ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  whiteSpace: 'nowrap',
                  textDecoration: 'none',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = 'var(--color-card)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.background = 'transparent')
                }
              >
                Write
              </Link>

              {/* Avatar */}
              {profileSlug && (
                <Link
                  href={`/profile/${profileSlug}`}
                  style={{ display: 'inline-flex', flexShrink: 0, textDecoration: 'none' }}
                  title={`@${profileSlug}`}
                >
                  <Avatar
                    name={displayName ?? profileSlug}
                    avatarUrl={avatarUrl}
                    size={32}
                    variant="nav"
                  />
                </Link>
              )}
            </>
          ) : (
            <Link
              href="/auth"
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-primary)',
                padding: '0 16px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-primary-light)',
                border: '1px solid var(--color-primary)',
                transition: 'background 150ms ease',
                display: 'inline-flex',
                alignItems: 'center',
                height: '34px',
                textDecoration: 'none',
              }}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
