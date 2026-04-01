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
      className="relative w-[32px] h-[32px] rounded-full border border-border bg-card flex items-center justify-center text-[15px] text-secondary no-underline transition-[border-color] duration-150 shrink-0 hover:border-primary"
      title="Messages"
    >
      💬
      {unread > 0 && (
        <span className="absolute top-[-3px] right-[-3px] w-[14px] h-[14px] rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center leading-none">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
