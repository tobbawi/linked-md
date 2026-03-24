'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase-browser'
import type { Message } from '@/types'

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return 'Today'
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function MessageThreadPage() {
  const router = useRouter()
  const params = useParams()
  const conversationId = params.id as string

  const [messages, setMessages] = useState<Message[]>([])
  const [myProfileId, setMyProfileId] = useState<string | null>(null)
  const [otherProfile, setOtherProfile] = useState<{ id: string; slug: string; display_name: string; avatar_url?: string | null } | null>(null)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const res = await fetch(`/api/messages/${conversationId}`)
      if (!res.ok) {
        setError('Conversation not found.')
        setLoading(false)
        return
      }
      const data = await res.json()
      setMessages(data.messages ?? [])
      setMyProfileId(data.myProfileId ?? null)
      setOtherProfile(data.otherProfile ?? null)
      setLoading(false)
    }
    load()
  }, [conversationId, router])

  // Scroll to bottom when messages load or change
  useEffect(() => {
    if (!loading) scrollToBottom()
  }, [loading, messages.length, scrollToBottom])

  // Supabase Realtime subscription
  useEffect(() => {
    if (!conversationId || !myProfileId) return

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            // Avoid duplicates (if we already added it optimistically)
            if (prev.some(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          // Mark as read — dedicated endpoint, no full re-fetch
          if (newMsg.sender_id !== myProfileId) {
            fetch(`/api/messages/${conversationId}/read`, { method: 'PATCH' }).catch(() => {})
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, myProfileId])

  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault()
    if (!body.trim() || sending) return

    const text = body.trim()
    setBody('')
    setSending(true)

    // Optimistic update with a temp id
    const tempId = `temp-${Date.now()}`
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: myProfileId!,
      body: text,
      read_at: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    scrollToBottom()

    const res = await fetch(`/api/messages/${conversationId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text }),
    })

    setSending(false)

    if (!res.ok) {
      // Rollback optimistic update
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setBody(text)
      setError('Failed to send message.')
    } else {
      const data = await res.json()
      // Replace temp with real message
      setMessages(prev => prev.map(m => m.id === tempId ? { ...data.message, sender_id: myProfileId! } : m))
    }

    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (loading) {
    return (
      <div style={{ paddingTop: 'var(--space-3xl)', textAlign: 'center', color: 'var(--color-muted)' }}>
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ paddingTop: 'var(--space-xl)', maxWidth: '640px', margin: '0 auto' }}>
        <p style={{ color: 'var(--color-muted)', fontSize: '15px' }}>{error}</p>
        <Link href="/messages" style={{ fontSize: '13px', color: 'var(--color-primary)' }}>← Back to messages</Link>
      </div>
    )
  }

  // Group messages by date
  const grouped: { date: string; messages: Message[] }[] = []
  for (const msg of messages) {
    const label = formatDate(msg.created_at)
    const last = grouped[grouped.length - 1]
    if (!last || last.date !== label) {
      grouped.push({ date: label, messages: [msg] })
    } else {
      last.messages.push(msg)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        maxWidth: '640px',
        margin: '0 auto',
        paddingTop: 'var(--space-md)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          padding: 'var(--space-md) 0',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-md)',
          flexShrink: 0,
        }}
      >
        <Link href="/messages" style={{ fontSize: '13px', color: 'var(--color-secondary)' }}>
          ←
        </Link>
        {otherProfile && (
          <>
            <Avatar name={otherProfile.display_name} avatarUrl={otherProfile.avatar_url} size={36} />
            <Link
              href={`/profile/${otherProfile.slug}`}
              style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}
            >
              {otherProfile.display_name}
            </Link>
          </>
        )}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-xs)',
          paddingBottom: 'var(--space-md)',
        }}
      >
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: 'var(--color-muted)', fontSize: '14px', marginTop: 'var(--space-xl)' }}>
            Say hello 👋
          </p>
        )}

        {grouped.map(group => (
          <div key={group.date}>
            {/* Date divider */}
            <div
              style={{
                textAlign: 'center',
                fontSize: '11px',
                color: 'var(--color-muted)',
                margin: 'var(--space-md) 0 var(--space-sm)',
              }}
            >
              {group.date}
            </div>

            {group.messages.map((msg, idx) => {
              const isMe = msg.sender_id === myProfileId
              const prevMsg = idx > 0 ? group.messages[idx - 1] : null
              const isContinuation = prevMsg && prevMsg.sender_id === msg.sender_id

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                    marginTop: isContinuation ? '2px' : 'var(--space-sm)',
                    paddingLeft: isMe ? 'var(--space-3xl)' : 0,
                    paddingRight: isMe ? 0 : 'var(--space-3xl)',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: '8px 12px',
                      borderRadius: isMe
                        ? `var(--radius-md) var(--radius-md) 4px var(--radius-md)`
                        : `var(--radius-md) var(--radius-md) var(--radius-md) 4px`,
                      background: isMe ? 'var(--color-primary)' : 'var(--color-card)',
                      border: isMe ? 'none' : '1px solid var(--color-border)',
                      color: isMe ? '#fff' : 'var(--color-ink)',
                      fontSize: '14px',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      opacity: msg.id.startsWith('temp-') ? 0.6 : 1,
                    }}
                  >
                    {msg.body}
                    <div
                      style={{
                        fontSize: '10px',
                        marginTop: '4px',
                        color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--color-muted)',
                        textAlign: 'right',
                      }}
                    >
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          flexShrink: 0,
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--space-md)',
          paddingBottom: 'var(--space-md)',
          display: 'flex',
          gap: 'var(--space-sm)',
          alignItems: 'flex-end',
        }}
      >
        <textarea
          ref={inputRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          rows={1}
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: '14px',
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-ink)',
            resize: 'none',
            lineHeight: 1.5,
            maxHeight: '120px',
            overflowY: 'auto',
          }}
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 500,
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: !body.trim() || sending ? 'not-allowed' : 'pointer',
            opacity: !body.trim() || sending ? 0.5 : 1,
            flexShrink: 0,
            transition: 'opacity 150ms ease',
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}
