'use client'

import { useState } from 'react'

interface Props {
  postId: string
  postAuthorProfileId: string
  myProfileId: string | null
  initialReposted: boolean
  repostCount: number
}

export function RepostButton({
  postId,
  postAuthorProfileId,
  myProfileId,
  initialReposted,
  repostCount,
}: Props) {
  const [reposted, setReposted] = useState(initialReposted)
  const [count, setCount] = useState(repostCount)
  const [loading, setLoading] = useState(false)

  // Don't show for own posts or logged-out users
  if (!myProfileId || myProfileId === postAuthorProfileId) return null

  async function toggle() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/repost', {
        method: reposted ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      })
      if (res.ok) {
        const next = !reposted
        setReposted(next)
        setCount((c) => c + (next ? 1 : -1))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={reposted ? 'Undo repost' : 'Repost'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'none',
        border: 'none',
        cursor: loading ? 'default' : 'pointer',
        padding: '2px 0',
        opacity: loading ? 0.6 : 1,
        color: reposted ? 'var(--color-primary)' : 'var(--color-muted)',
        fontSize: '12px',
        fontFamily: 'var(--font-sans)',
        transition: 'color 150ms ease',
      }}
    >
      {/* Repost icon (two arrows forming a loop) */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M17 1l4 4-4 4" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <path d="M7 23l-4-4 4-4" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </svg>
      {count > 0 && <span>{count}</span>}
    </button>
  )
}
