'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Avatar from '@/components/Avatar'
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
      <div className="pt-3xl text-center text-muted">
        Loading…
      </div>
    )
  }

  return (
    <div className="pt-xl pb-3xl">
      <div>
        <h1 className="font-serif text-[1.25rem] text-ink mb-xl">
          Messages
        </h1>

        {error && (
          <p className="text-[#dc2626] text-[14px] mb-md">{error}</p>
        )}

        {conversations.length === 0 ? (
          <div className="p-xl bg-card border border-dashed border-border rounded-md text-center">
            <p className="text-muted text-[15px] mb-sm">
              No messages yet.
            </p>
            <p className="text-[13px] text-muted">
              Visit a profile and click{' '}
              <strong className="text-secondary">Message</strong>{' '}
              to start a conversation.
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className="no-underline"
              >
                <div
                  className="px-lg py-md border-b border-border flex items-center gap-md"
                  style={{
                    background: (conv.unread_count ?? 0) > 0 ? 'var(--color-primary-light)' : 'transparent',
                  }}
                >
                  {/* Avatar */}
                  <Avatar name={conv.other_profile?.display_name} avatarUrl={conv.other_profile?.avatar_url} size={40} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-sm">
                      <p
                        className="text-[14px] text-ink"
                        style={{ fontWeight: (conv.unread_count ?? 0) > 0 ? 600 : 500 }}
                      >
                        {conv.other_profile?.display_name ?? 'Unknown'}
                      </p>
                      <span className="text-[11px] text-muted shrink-0">
                        {conv.last_message ? timeAgo(conv.last_message.created_at) : ''}
                      </span>
                    </div>
                    {conv.last_message && (
                      <p
                        className="text-[13px] overflow-hidden text-ellipsis whitespace-nowrap mt-[2px]"
                        style={{
                          color: (conv.unread_count ?? 0) > 0 ? 'var(--color-ink)' : 'var(--color-muted)',
                          fontWeight: (conv.unread_count ?? 0) > 0 ? 500 : 400,
                        }}
                      >
                        {conv.last_message.body}
                      </p>
                    )}
                  </div>

                  {(conv.unread_count ?? 0) > 0 && (
                    <div className="w-[20px] h-[20px] rounded-full bg-primary text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
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
