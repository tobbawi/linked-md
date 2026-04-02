'use client'

import { useState } from 'react'

interface Props {
  followeeSlug: string
  initialFollowing: boolean
  followerCount: number
}

export function FollowButton({ followeeSlug, initialFollowing, followerCount }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount] = useState(followerCount)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/follow', {
        method: following ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followee_slug: followeeSlug }),
      })
      if (res.ok) {
        const newFollowing = !following
        setFollowing(newFollowing)
        setCount((c) => c + (newFollowing ? 1 : -1))
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-sm">
      <button
        onClick={toggle}
        disabled={loading}
        className={`text-[12px] font-medium py-[5px] px-[14px] rounded-sm border border-solid font-sans transition-[background,color] duration-150 ${
          loading ? 'cursor-default opacity-60' : 'cursor-pointer opacity-100'
        } ${
          following
            ? 'bg-card text-secondary border-border'
            : 'bg-primary text-white border-primary'
        }`}
      >
        {following ? 'Following' : 'Follow'}
      </button>
      {count > 0 && (
        <span className="text-[12px] text-muted">
          {count} {count === 1 ? 'follower' : 'followers'}
        </span>
      )}
    </div>
  )
}
