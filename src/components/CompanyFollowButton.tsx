'use client'

import { useState } from 'react'

interface Props {
  companySlug: string
  initialFollowing: boolean
  followerCount: number
}

export function CompanyFollowButton({ companySlug, initialFollowing, followerCount }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount] = useState(followerCount)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    try {
      const res = await fetch('/api/company/follow', {
        method: following ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_slug: companySlug }),
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
      <button
        onClick={toggle}
        disabled={loading}
        style={{
          fontSize: '12px',
          fontWeight: 500,
          padding: '5px 14px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid',
          cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.6 : 1,
          fontFamily: 'var(--font-sans)',
          transition: 'background 150ms ease, color 150ms ease',
          ...(following
            ? {
                background: 'var(--color-card)',
                color: 'var(--color-secondary)',
                borderColor: 'var(--color-border)',
              }
            : {
                background: 'var(--color-primary)',
                color: '#fff',
                borderColor: 'var(--color-primary)',
              }),
        }}
      >
        {following ? 'Following' : 'Follow'}
      </button>
      {count > 0 && (
        <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
          {count} {count === 1 ? 'follower' : 'followers'}
        </span>
      )}
    </div>
  )
}
