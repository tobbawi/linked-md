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
    <section className="mt-3xl pt-lg border-t border-border">
      <h2 className="font-serif text-[1.125rem] text-ink mb-lg">
        {comments.length > 0 ? `${comments.length} comment${comments.length === 1 ? '' : 's'}` : 'Comments'}
      </h2>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="flex flex-col gap-md mb-lg">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-md bg-card border border-border rounded-md"
            >
              <div className="flex items-center justify-between mb-xs">
                <div className="flex items-center gap-sm">
                  {comment.profile && (
                    <Link
                      href={`/profile/${comment.profile.slug}`}
                      className="text-[13px] font-medium text-text"
                    >
                      {comment.profile.display_name}
                    </Link>
                  )}
                  <span className="text-border">·</span>
                  <time className="text-[12px] text-muted">
                    {formatDate(comment.created_at)}
                  </time>
                </div>
                {myProfileSlug && comment.profile?.slug === myProfileSlug && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-[11px] text-muted bg-none border-none cursor-pointer py-[2px] px-[4px] font-sans"
                  >
                    Delete
                  </button>
                )}
              </div>
              <p className="text-[14px] text-text leading-[1.6] m-0 whitespace-pre-wrap">
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
            className="w-full py-sm px-md border border-border rounded-sm text-[14px] font-sans text-text bg-card resize-y box-border outline-none leading-[1.5] focus:border-primary"
          />
          {error && (
            <p className="text-[#dc2626] text-[13px] mt-xs">
              {error}
            </p>
          )}
          <div className="mt-sm text-right">
            <button
              type="submit"
              disabled={!body.trim() || submitting}
              className={`text-[13px] font-medium py-[7px] px-[18px] rounded-sm border border-solid border-primary text-white font-sans transition-[background] duration-150 ${
                body.trim() && !submitting
                  ? 'bg-primary cursor-pointer'
                  : 'bg-border cursor-default'
              }`}
            >
              {submitting ? 'Posting…' : 'Post comment'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-[14px] text-secondary">
          <Link href="/auth" className="text-primary font-medium">
            Sign in
          </Link>{' '}
          to leave a comment.
        </p>
      )}
    </section>
  )
}
