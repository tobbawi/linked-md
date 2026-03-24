'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import type { Conversation } from '@/types'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function MessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [myProfileId, setMyProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const res = await fetch('/api/messages')
      if (!res.ok) {
        setError('Failed to load messages.')
        setLoading(false)
        return
      }
      const data = await res.json()
      setConversations(data.conversations ?? [])
      setMyProfileId(data.myProfileId ?? null)
      setLoading(false)
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div style={{ paddingTop: 'var(--space-3xl)', textAlign: 'center', color: 'var(--color-muted)' }}>
        Loading…
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
      <div>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.25rem',
            color: 'var(--color-ink)',
            marginBottom: 'var(--space-xl)',
          }}
        >
          Messages
        </h1>

        {error && (
          <p style={{ color: '#dc2626', fontSize: '14px', marginBottom: 'var(--space-md)' }}>{error}</p>
        )}

        {conversations.length === 0 ? (
          <div
            style={{
              padding: 'var(--space-xl)',
              background: 'var(--color-card)',
              border: '1px dashed var(--color-border)',
              borderRadius: 'var(--radius-md)',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'var(--color-muted)', fontSize: '15px', marginBottom: 'var(--space-sm)' }}>
              No messages yet.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
              Visit a profile and click{' '}
              <strong style={{ color: 'var(--color-secondary)' }}>Message</strong>{' '}
              to start a conversation.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    padding: 'var(--space-md) var(--space-lg)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-md)',
                    background: (conv.unread_count ?? 0) > 0 ? 'var(--color-primary-light)' : 'transparent',
                  }}
                >
                  {/* Avatar initial */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--color-primary-light)',
                      border: '1px solid var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                      fontFamily: 'var(--font-serif)',
                      flexShrink: 0,
                    }}
                  >
                    {conv.other_profile?.display_name?.charAt(0).toUpperCase() ?? '?'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
                      <p
                        style={{
                          fontSize: '14px',
                          fontWeight: (conv.unread_count ?? 0) > 0 ? 600 : 500,
                          color: 'var(--color-ink)',
                        }}
                      >
                        {conv.other_profile?.display_name ?? 'Unknown'}
                      </p>
                      <span style={{ fontSize: '11px', color: 'var(--color-muted)', flexShrink: 0 }}>
                        {conv.last_message ? timeAgo(conv.last_message.created_at) : ''}
                      </span>
                    </div>
                    {conv.last_message && (
                      <p
                        style={{
                          fontSize: '13px',
                          color: (conv.unread_count ?? 0) > 0 ? 'var(--color-ink)' : 'var(--color-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          marginTop: '2px',
                          fontWeight: (conv.unread_count ?? 0) > 0 ? 500 : 400,
                        }}
                      >
                        {conv.last_message.body}
                      </p>
                    )}
                  </div>

                  {(conv.unread_count ?? 0) > 0 && (
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {conv.unread_count}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
