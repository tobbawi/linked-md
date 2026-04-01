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
      className={`inline-flex items-center gap-[5px] text-[13px] font-medium py-[5px] px-[12px] rounded-sm border border-solid font-sans transition-[background] duration-150 ${
        loading ? 'cursor-default opacity-60' : 'cursor-pointer opacity-100'
      } ${
        liked
          ? 'bg-primary-light text-primary border-primary'
          : 'bg-transparent text-secondary border-border'
      }`}
      title={liked ? 'Unlike' : 'Like'}
    >
      <span className="text-[14px] leading-none">{liked ? '♥' : '♡'}</span>
      <span>{count > 0 ? count : 'Like'}</span>
    </button>
  )
}
