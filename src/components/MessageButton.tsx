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
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          fontSize: '13px',
          fontWeight: 500,
          padding: '6px 14px',
          borderRadius: 'var(--radius-sm)',
          border: `1px solid ${error ? 'var(--color-error, #DC2626)' : 'var(--color-border)'}`,
          background: 'var(--color-card)',
          color: 'var(--color-secondary)',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          fontFamily: 'var(--font-sans)',
          transition: 'border-color 150ms ease',
        }}
        onMouseEnter={e => !loading && !error && ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)')}
        onMouseLeave={e => !error && ((e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)')}
      >
        {loading ? '…' : 'Message'}
      </button>
      {error && (
        <span style={{ fontSize: '11px', color: 'var(--color-error, #DC2626)' }}>
          {error}
        </span>
      )}
    </div>
  )
}
