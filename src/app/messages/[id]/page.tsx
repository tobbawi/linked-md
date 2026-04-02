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
      <div className="pt-3xl text-center text-muted">
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="pt-xl max-w-[640px] mx-auto">
        <p className="text-muted text-[15px]">{error}</p>
        <Link href="/messages" className="text-[13px] text-primary">← Back to messages</Link>
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
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-[640px] mx-auto pt-md">
      {/* Header */}
      <div className="flex items-center gap-md py-md border-b border-border mb-md shrink-0">
        <Link href="/messages" className="text-[13px] text-secondary">
          ←
        </Link>
        {otherProfile && (
          <>
            <Avatar name={otherProfile.display_name} avatarUrl={otherProfile.avatar_url} size={36} />
            <Link
              href={`/profile/${otherProfile.slug}`}
              className="text-[15px] font-semibold text-ink"
            >
              {otherProfile.display_name}
            </Link>
          </>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-xs pb-md">
        {messages.length === 0 && (
          <p className="text-center text-muted text-[14px] mt-xl">
            Say hello 👋
          </p>
        )}

        {grouped.map(group => (
          <div key={group.date}>
            {/* Date divider */}
            <div className="text-center text-[11px] text-muted my-md mb-sm">
              {group.date}
            </div>

            {group.messages.map((msg, idx) => {
              const isMe = msg.sender_id === myProfileId
              const prevMsg = idx > 0 ? group.messages[idx - 1] : null
              const isContinuation = prevMsg && prevMsg.sender_id === msg.sender_id

              return (
                <div
                  key={msg.id}
                  className={isMe ? 'flex justify-end pl-3xl' : 'flex justify-start pr-3xl'}
                  style={{ marginTop: isContinuation ? '2px' : 'var(--space-sm)' }}
                >
                  <div
                    className="max-w-[80%] py-[8px] px-[12px] text-[14px] leading-[1.5] whitespace-pre-wrap break-words"
                    style={{
                      borderRadius: isMe
                        ? `var(--radius-md) var(--radius-md) 4px var(--radius-md)`
                        : `var(--radius-md) var(--radius-md) var(--radius-md) 4px`,
                      background: isMe ? 'var(--color-primary)' : 'var(--color-card)',
                      border: isMe ? 'none' : '1px solid var(--color-border)',
                      color: isMe ? '#fff' : 'var(--color-ink)',
                      opacity: msg.id.startsWith('temp-') ? 0.6 : 1,
                    }}
                  >
                    {msg.body}
                    <div
                      className="text-[10px] mt-[4px] text-right"
                      style={{
                        color: isMe ? 'rgba(255,255,255,0.6)' : 'var(--color-muted)',
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
        className="shrink-0 border-t border-border pt-md pb-md flex gap-sm items-end"
      >
        <textarea
          ref={inputRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message…"
          rows={1}
          className="flex-1 py-[10px] px-[14px] text-[14px] bg-card border border-border rounded-md text-ink resize-none leading-[1.5] max-h-[120px] overflow-y-auto"
        />
        <button
          type="submit"
          disabled={!body.trim() || sending}
          className="py-[10px] px-[16px] text-[13px] font-medium bg-primary text-white border-none rounded-md shrink-0 transition-opacity duration-150"
          style={{
            cursor: !body.trim() || sending ? 'not-allowed' : 'pointer',
            opacity: !body.trim() || sending ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}
