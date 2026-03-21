'use client'

import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { NotificationBell } from './NotificationBell'
import { DarkModeToggle } from './DarkModeToggle'

interface NavProps {
  user: User | null
  profileSlug: string | null
}

export function Nav({ user, profileSlug }: NavProps) {
  const router = useRouter()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
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
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--color-primary)',
            letterSpacing: '-0.01em',
          }}
        >
          linked.md
        </Link>

        {/* Center nav */}
        <div className="nav-center">
          <Link href="/people" style={{ fontSize: '13px', color: 'var(--color-secondary)' }}>
            People
          </Link>
          <Link href="/companies" style={{ fontSize: '13px', color: 'var(--color-secondary)' }}>
            Companies
          </Link>
          <Link href="/explore" style={{ fontSize: '13px', color: 'var(--color-secondary)' }}>
            Explore
          </Link>
          <Link href="/search" style={{ fontSize: '13px', color: 'var(--color-secondary)' }}>
            Search
          </Link>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <DarkModeToggle />
          {user ? (
            <>
              <Link
                href="/editor"
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'var(--color-text)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border)',
                  transition: 'border-color 150ms ease',
                }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.borderColor = 'var(--color-primary)')
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.borderColor = 'var(--color-border)')
                }
              >
                New post
              </Link>

              {profileSlug && (
                <NotificationBell mySlug={profileSlug} />
              )}

              {profileSlug && (
                <Link
                  href={`/profile/${profileSlug}`}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-primary-light)',
                    border: '1px solid var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--color-primary)',
                    flexShrink: 0,
                  }}
                  title="My profile"
                >
                  {profileSlug.charAt(0).toUpperCase()}
                </Link>
              )}

              <button
                onClick={handleSignOut}
                style={{
                  fontSize: '13px',
                  color: 'var(--color-secondary)',
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
                height: '44px',
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
