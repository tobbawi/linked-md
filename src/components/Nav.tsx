'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Avatar from '@/components/Avatar'

interface NavProps {
  user: User | null
  profileSlug: string | null
  displayName?: string | null
  avatarUrl?: string | null
}

const NAV_LINKS = [
  { href: '/', label: 'Feed' },
  { href: '/explore', label: 'Explore' },
  { href: '/people', label: 'People' },
  { href: '/jobs', label: 'Jobs' },
]

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
          gap: 'var(--space-lg)',
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
              {/* Write button — ghost style */}
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

              {/* Avatar — gradient circle */}
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
