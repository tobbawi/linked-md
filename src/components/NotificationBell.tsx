'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import type { Notification } from '@/types'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function notificationText(n: Notification): string {
  const actor = n.actor?.display_name ?? 'Someone'
  switch (n.type) {
    case 'follow': return `${actor} followed you`
    case 'like': return `${actor} liked your post${n.post?.title ? ` "${n.post.title}"` : ''}`
    case 'comment': return `${actor} commented on your post${n.post?.title ? ` "${n.post.title}"` : ''}`
    default: return 'New notification'
  }
}

function notificationHref(n: Notification, mySlug: string): string {
  if (n.type === 'follow' && n.actor) return `/profile/${n.actor.slug}`
  if ((n.type === 'like' || n.type === 'comment') && n.post) {
    return `/profile/${mySlug}/post/${n.post.slug}`
  }
  return '/notifications'
}

interface Props {
  mySlug: string
}

export function NotificationBell({ mySlug }: Props) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? [])
        setUnread(data.unread ?? 0)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleOpen() {
    setOpen((o) => !o)
    if (!open && unread > 0) {
      fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
        .then(() => setUnread(0))
        .catch(() => {})
    }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        style={{
          position: 'relative',
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-card)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '15px',
          color: 'var(--color-secondary)',
          transition: 'border-color 150ms ease',
        }}
        title="Notifications"
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              width: '14px',
              height: '14px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-primary)',
              color: '#fff',
              fontSize: '9px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '320px',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>
              Notifications
            </span>
            <Link
              href="/notifications"
              style={{ fontSize: '11px', color: 'var(--color-primary)' }}
              onClick={() => setOpen(false)}
            >
              See all
            </Link>
          </div>

          {notifications.length === 0 ? (
            <p
              style={{
                padding: 'var(--space-lg)',
                textAlign: 'center',
                color: 'var(--color-muted)',
                fontSize: '13px',
                margin: 0,
              }}
            >
              No notifications yet.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {notifications.slice(0, 8).map((n) => (
                <li key={n.id}>
                  <Link
                    href={notificationHref(n, mySlug)}
                    onClick={() => setOpen(false)}
                    style={{
                      display: 'block',
                      padding: 'var(--space-sm) var(--space-md)',
                      textDecoration: 'none',
                      borderBottom: '1px solid var(--color-border)',
                      background: n.read ? 'transparent' : 'var(--color-primary-light)',
                      transition: 'background 150ms ease',
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = 'var(--color-border)')
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLElement).style.background = n.read
                        ? 'transparent'
                        : 'var(--color-primary-light)')
                    }
                  >
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-text)',
                        margin: '0 0 2px',
                        lineHeight: 1.4,
                      }}
                    >
                      {notificationText(n)}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--color-muted)', margin: 0 }}>
                      {formatDate(n.created_at)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
