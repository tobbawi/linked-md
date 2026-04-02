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
    <div className="flex items-center gap-sm">
      <Link
        href={`/post/new?post=${postSlug}`}
        className="text-[13px] font-medium text-secondary py-[5px] px-[12px] rounded-sm border border-border"
      >
        Edit
      </Link>

      <button
        onClick={handleDelete}
        disabled={deleting}
        className={`text-[13px] font-medium py-[5px] px-[12px] rounded-sm border border-solid border-error font-sans transition-all duration-150 ${
          confirming ? 'text-white bg-error' : 'text-error bg-transparent'
        } ${
          deleting ? 'cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        {deleting ? 'Deleting…' : confirming ? 'Confirm delete' : 'Delete'}
      </button>

      {confirming && !deleting && (
        <button
          onClick={() => setConfirming(false)}
          className="text-[13px] text-muted bg-none border-none cursor-pointer font-sans py-[5px] px-[4px]"
        >
          Cancel
        </button>
      )}
    </div>
  )
}
