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
    case 'endorse': return `${actor} endorsed your skill${n.skill_name ? ` "${n.skill_name}"` : ''}`
    case 'recommendation': return `${actor} wrote you a recommendation`
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
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative w-[32px] h-[32px] rounded-full border border-border bg-card cursor-pointer flex items-center justify-center text-[15px] text-secondary transition-[border-color] duration-150 hover:border-primary"
        title="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute top-[-3px] right-[-3px] w-[14px] h-[14px] rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-[calc(100%+8px)] right-0 w-[320px] bg-bg border border-border rounded-md z-[100] overflow-hidden"
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
        >
          <div className="py-sm px-md border-b border-border flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink">
              Notifications
            </span>
            <Link
              href="/notifications"
              className="text-[11px] text-primary"
              onClick={() => setOpen(false)}
            >
              See all
            </Link>
          </div>

          {notifications.length === 0 ? (
            <p className="p-lg text-center text-muted text-[13px] m-0">
              No notifications yet.
            </p>
          ) : (
            <ul className="list-none m-0 p-0">
              {notifications.slice(0, 8).map((n) => (
                <li key={n.id}>
                  <Link
                    href={notificationHref(n, mySlug)}
                    onClick={() => setOpen(false)}
                    className={`block py-sm px-md no-underline border-b border-border transition-[background] duration-150 hover:bg-border ${
                      n.read ? 'bg-transparent' : 'bg-primary-light'
                    }`}
                  >
                    <p className="text-[13px] text-text m-0 mb-[2px] leading-[1.4]">
                      {notificationText(n)}
                    </p>
                    <p className="text-[11px] text-muted m-0">
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
