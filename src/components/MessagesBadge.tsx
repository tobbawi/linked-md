'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'

export function MessagesBadge() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    fetch('/api/messages')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        const total = (data.conversations ?? []).reduce(
          (sum: number, c: { unread_count?: number }) => sum + (c.unread_count ?? 0),
          0
        )
        setUnread(total)
      })
      .catch(() => {})
  }, [])

  return (
    <Link
      href="/messages"
      style={{
        position: 'relative',
        width: '32px',
        height: '32px',
        borderRadius: 'var(--radius-full)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '15px',
        color: 'var(--color-secondary)',
        textDecoration: 'none',
        transition: 'border-color 150ms ease',
        flexShrink: 0,
      }}
      title="Messages"
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
    >
      💬
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
    </Link>
  )
}
