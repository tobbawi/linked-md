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
    <div ref={containerRef} className="nav-search-desktop relative">
      <div className="relative flex items-center">
        <svg
          className="absolute left-[8px] text-muted pointer-events-none"
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
            transition: 'border-color 150ms, width 150ms',
          }}
          className="text-[13px] font-sans text-text bg-bg border border-border rounded-[var(--radius-sm)] outline-none"
          onFocusCapture={(e) => { e.currentTarget.style.borderColor = 'var(--color-primary)'; e.currentTarget.style.width = '220px' }}
          onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.width = '180px' }}
        />
      </div>

      {open && query && (
        <div
          className="absolute top-[calc(100%+6px)] left-0 w-[300px] bg-card border border-border rounded-[var(--radius-md)] shadow-[0_4px_16px_rgba(0,0,0,0.10)] z-[100] overflow-hidden"
        >
          {!hasResults ? (
            <div className="p-[var(--space-md)] text-[13px] text-muted text-center">
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
      <div className="px-[12px] pt-[6px] pb-[4px] text-[10px] font-mono font-semibold text-muted uppercase tracking-[0.06em] border-t border-border">
        {label}
      </div>
      {children}
    </div>
  )
}

function ResultRow({ primary, secondary, onClick }: { primary: string; secondary?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="block w-full text-left px-[12px] py-[7px] bg-transparent hover:bg-primary-light border-none cursor-pointer"
    >
      <div className="text-[13px] font-medium text-ink leading-[1.3]">{primary}</div>
      {secondary && <div className="text-[11px] text-muted">{secondary}</div>}
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
    <div ref={containerRef} className="relative">
      <button
        onClick={toggleOpen}
        className={`relative inline-flex items-center justify-center w-[32px] h-[32px] bg-transparent border-none cursor-pointer rounded-[var(--radius-sm)] transition-colors duration-150 ${open ? 'text-ink' : 'text-secondary'}`}
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
          <span className="absolute top-[4px] right-[4px] w-[8px] h-[8px] bg-primary rounded-full border-[1.5px] border-bg" />
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+6px)] right-0 w-[320px] bg-card border border-border rounded-[var(--radius-md)] shadow-[0_4px_16px_rgba(0,0,0,0.10)] z-[100] overflow-hidden">
          <div className="px-[14px] py-[10px] border-b border-border flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink">Notifications</span>
          </div>

          {notifications.length === 0 ? (
            <div className="p-[var(--space-lg)] text-[13px] text-muted text-center">
              No notifications yet
            </div>
          ) : (
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex items-start gap-[var(--space-sm)] w-full text-left px-[14px] py-[10px] border-none border-b border-border cursor-pointer transition-colors duration-150 hover:bg-bg ${n.read ? 'bg-transparent' : 'bg-primary-light'}`}
                >
                  {n.actor && (
                    <div className="shrink-0 mt-[1px]">
                      <Avatar name={n.actor.display_name} size={28} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] text-text leading-[1.4]">
                      {notificationLabel(n)}
                    </div>
                    <div className="text-[11px] text-muted mt-[2px]">
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
      className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-white/85 backdrop-blur-[16px] backdrop-saturate-[180%]"
    >
      <div
        className="max-w-[1200px] mx-auto px-xl h-[60px] flex items-center gap-xl"
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center no-underline shrink-0"
        >
          <span
            className="font-sans text-[20px] font-extrabold text-ink tracking-[-0.03em]"
          >
            linked
          </span>
          <span
            className="font-mono text-[14px] font-medium text-white bg-primary px-[10px] py-[3px] rounded-[6px] ml-[4px]"
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
                className={`text-[14px] font-medium no-underline px-[14px] py-[6px] rounded-sm inline-flex items-center min-h-[44px] whitespace-nowrap transition-all duration-150 ${isActive ? 'text-ink bg-off-white' : 'text-secondary hover:text-ink hover:bg-off-white'}`}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-[10px]">
          {user ? (
            <>
              {/* Notification bell */}
              <NotificationBell />

              {/* Write button */}
              <Link
                href="/post/new"
                className="text-[13px] font-medium text-secondary px-[12px] py-[6px] rounded-[var(--radius-sm)] border border-border bg-transparent transition-colors duration-150 inline-flex items-center whitespace-nowrap no-underline hover:bg-card"
              >
                Write
              </Link>

              {/* Avatar */}
              {profileSlug && (
                <Link
                  href={`/profile/${profileSlug}`}
                  className="inline-flex shrink-0 no-underline"
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
            <>
              <Link
                href="/auth"
                className="text-[14px] font-medium text-secondary px-[18px] py-[9px] rounded-[10px] border-[1.5px] border-border transition-all duration-150 inline-flex items-center no-underline hover:text-ink hover:border-secondary"
              >
                Sign in
              </Link>
              <Link
                href="/auth"
                className="text-[14px] font-semibold text-white px-[18px] py-[9px] rounded-[10px] bg-ink transition-all duration-200 inline-flex items-center no-underline hover:bg-text hover:-translate-y-px hover:shadow-md"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
