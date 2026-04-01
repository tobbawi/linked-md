'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { Comment } from '@/types'

interface Props {
  postId: string
  initialComments: Comment[]
  myProfileSlug: string | null
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function CommentsSection({ postId, initialComments, myProfileSlug }: Props) {
  const [comments, setComments] = useState(initialComments)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || submitting) return
    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/comment/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: postId, body }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to post comment')
      } else {
        setComments((prev) => [...prev, data.comment])
        setBody('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(commentId: string) {
    const res = await fetch('/api/comment/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment_id: commentId }),
    })
    if (res.ok) {
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    }
  }

  return (
    <section
      style={{
        marginTop: 'var(--space-3xl)',
        paddingTop: 'var(--space-lg)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.125rem',
          color: 'var(--color-ink)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        {comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Comments'}
      </h2>

      {/* Comment list */}
      {comments.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                padding: 'var(--space-md)',
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--space-xs)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  {comment.profile && (
                    <Link
                      href={`/profile/${comment.profile.slug}`}
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--color-text)',
                      }}
                    >
                      {comment.profile.display_name}
                    </Link>
                  )}
                  <span style={{ color: 'var(--color-border)' }}>·</span>
                  <time style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                    {formatDate(comment.created_at)}
                  </time>
                </div>
                {myProfileSlug && comment.profile?.slug === myProfileSlug && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-muted)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '2px 4px',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
              <p
                style={{
                  fontSize: '14px',
                  color: 'var(--color-text)',
                  lineHeight: 1.6,
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Comment form */}
      {myProfileSlug ? (
        <form onSubmit={handleSubmit}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            rows={3}
            style={{
              width: '100%',
              padding: 'var(--space-sm) var(--space-md)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '14px',
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-text)',
              background: 'var(--color-card)',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
              lineHeight: 1.5,
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
          />
          {error && (
            <p style={{ color: '#dc2626', fontSize: '13px', marginTop: 'var(--space-xs)' }}>
              {error}
            </p>
          )}
          <div style={{ marginTop: 'var(--space-sm)', textAlign: 'right' }}>
            <button
              type="submit"
              disabled={!body.trim() || submitting}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                padding: '7px 18px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-primary)',
                background: body.trim() && !submitting ? 'var(--color-primary)' : 'var(--color-border)',
                color: '#fff',
                cursor: !body.trim() || submitting ? 'default' : 'pointer',
                fontFamily: 'var(--font-sans)',
                transition: 'background 150ms ease',
              }}
            >
              {submitting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </form>
      ) : (
        <p style={{ fontSize: '14px', color: 'var(--color-secondary)' }}>
          <Link href="/auth" style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
            Sign in
          </Link>{' '}
          to leave a comment.
        </p>
      )}
    </section>
  )
}
