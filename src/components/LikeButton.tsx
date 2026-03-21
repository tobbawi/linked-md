'use client'

import { useState } from 'react'

interface Props {
  postId: string
  initialLiked: boolean
  likeCount: number
}

export function LikeButton({ postId, initialLiked, likeCount }: Props) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(likeCount)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/reaction', {
        method: liked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId }),
      })
      if (res.ok) {
        const newLiked = !liked
        setLiked(newLiked)
        setCount((c) => c + (newLiked ? 1 : -1))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        fontSize: '13px',
        fontWeight: 500,
        padding: '5px 12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid',
        cursor: loading ? 'default' : 'pointer',
        opacity: loading ? 0.6 : 1,
        fontFamily: 'var(--font-sans)',
        transition: 'background 150ms ease',
        background: liked ? 'var(--color-primary-light)' : 'transparent',
        color: liked ? 'var(--color-primary)' : 'var(--color-secondary)',
        borderColor: liked ? 'var(--color-primary)' : 'var(--color-border)',
      }}
      title={liked ? 'Unlike' : 'Like'}
    >
      <span style={{ fontSize: '14px', lineHeight: 1 }}>{liked ? '♥' : '♡'}</span>
      <span>{count > 0 ? count : 'Like'}</span>
    </button>
  )
}
