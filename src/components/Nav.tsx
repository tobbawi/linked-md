'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-browser'
import { NotificationBell } from './NotificationBell'
import { MessagesBadge } from './MessagesBadge'
import { DarkModeToggle } from './DarkModeToggle'

interface NavProps {
  user: User | null
  profileSlug: string | null
}

export function Nav({ user, profileSlug }: NavProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`)
      setSearchQuery('')
    }
  }

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
          padding: '0 var(--space-md)',
          height: '56px',
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
            alignItems: 'baseline',
            gap: '1px',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '18px',
              fontStyle: 'italic',
              fontWeight: 500,
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
              letterSpacing: '0',
            }}
          >
            .md
          </span>
        </Link>

        {/* Inline search */}
        <form onSubmit={handleSearch} style={{ flexShrink: 0 }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people, topics…"
            className="search-input"
            style={{
              width: '200px',
              padding: '6px 12px',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-sans)',
              fontSize: '13px',
              background: 'var(--color-card)',
              color: 'var(--color-text)',
              outline: 'none',
            }}
          />
        </form>

        {/* Center nav links */}
        <div className="nav-center">
          <Link href="/people" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-secondary)', display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
            People
          </Link>
          <Link href="/companies" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-secondary)', display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
            Companies
          </Link>
          <Link href="/jobs" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-secondary)', display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
            Jobs
          </Link>
          <Link href="/explore" style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-secondary)', display: 'inline-flex', alignItems: 'center', minHeight: '44px' }}>
            Explore
          </Link>
        </div>

        {/* Right side — push to end */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <DarkModeToggle />
          {user ? (
            <>
              {/* Write button */}
              <Link
                href="/post/new"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--color-text)',
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  transition: 'border-color 150ms ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')
                }
              >
                Write
              </Link>

              {profileSlug && <NotificationBell mySlug={profileSlug} />}
              {profileSlug && <MessagesBadge />}

              {/* Avatar */}
              {profileSlug && (
                <Link
                  href={`/profile/${profileSlug}`}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-primary-light)',
                    border: '1px solid var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    flexShrink: 0,
                    textDecoration: 'none',
                  }}
                  title={`@${profileSlug}`}
                >
                  {profileSlug.charAt(0).toUpperCase()}
                </Link>
              )}

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                style={{
                  fontSize: '12px',
                  color: 'var(--color-muted)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 0',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Sign out
              </button>
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
