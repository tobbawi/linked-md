'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface PostActionsProps {
  postSlug: string
  profileSlug: string
}

export function PostActions({ postSlug, profileSlug }: PostActionsProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true)
      return
    }
    setDeleting(true)
    const res = await fetch('/api/post/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: postSlug }),
    })
    if (res.ok) {
      router.push(`/profile/${profileSlug}`)
      router.refresh()
    } else {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
      <Link
        href={`/post/new?post=${postSlug}`}
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--color-secondary)',
          padding: '5px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-border)',
        }}
      >
        Edit
      </Link>

      <button
        onClick={handleDelete}
        disabled={deleting}
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: confirming ? '#fff' : 'var(--color-error, #DC2626)',
          background: confirming ? 'var(--color-error, #DC2626)' : 'transparent',
          padding: '5px 12px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--color-error, #DC2626)',
          cursor: deleting ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-sans)',
          transition: 'all 150ms ease',
        }}
      >
        {deleting ? 'Deleting…' : confirming ? 'Confirm delete' : 'Delete'}
      </button>

      {confirming && !deleting && (
        <button
          onClick={() => setConfirming(false)}
          style={{
            fontSize: '13px',
            color: 'var(--color-muted)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            padding: '5px 4px',
          }}
        >
          Cancel
        </button>
      )}
    </div>
  )
}
