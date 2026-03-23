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

  async function handleClick() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.push('/auth'); return }

    setLoading(true)
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_slug: recipientSlug }),
    })
    setLoading(false)

    if (res.ok) {
      const data = await res.json()
      router.push(`/messages/${data.conversation_id}`)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      style={{
        fontSize: '13px',
        fontWeight: 500,
        padding: '6px 14px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--color-border)',
        background: 'var(--color-card)',
        color: 'var(--color-secondary)',
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        fontFamily: 'var(--font-sans)',
        transition: 'border-color 150ms ease',
      }}
      onMouseEnter={e => !loading && ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
    >
      {loading ? '…' : 'Message'}
    </button>
  )
}
