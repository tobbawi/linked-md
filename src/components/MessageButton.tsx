'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

interface Props {
  recipientSlug: string
}

export function MessageButton({ recipientSlug }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    setLoading(true)
    setError('')
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_slug: recipientSlug }),
    })
    setLoading(false)

    if (res.ok) {
      const data = await res.json()
      router.push(`/messages/${data.conversation_id}`)
    } else {
      setError('Could not open conversation. Try again.')
    }
  }

  return (
    <div className="inline-flex flex-col gap-[4px]">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`text-[13px] font-medium py-[6px] px-[14px] rounded-sm bg-card text-secondary font-sans transition-[border-color] duration-150 ${
          loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer opacity-100'
        } ${
          error ? 'border border-error' : 'border border-border'
        } hover:border-primary`}
      >
        {loading ? '…' : 'Message'}
      </button>
      {error && (
        <span className="text-[11px] text-error">
          {error}
        </span>
      )}
    </div>
  )
}
