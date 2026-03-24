// GET  /api/messages  — list conversations for the current user
// POST /api/messages  — start a new conversation (or return existing) with a profile

import { NextResponse } from 'next/server'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'

export async function GET() {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  // Get current user's profile
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!myProfile) return NextResponse.json({ conversations: [] })

  // Get all conversations where user is a member
  const { data: memberRows } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('profile_id', myProfile.id)

  if (!memberRows || memberRows.length === 0) {
    return NextResponse.json({ conversations: [] })
  }

  const conversationIds = memberRows.map((r: { conversation_id: string }) => r.conversation_id)

  // For each conversation, get the other member and last message
  const { data: allMembers } = await supabase
    .from('conversation_members')
    .select('conversation_id, profile:profiles!profile_id(id, slug, display_name, avatar_url)')
    .in('conversation_id', conversationIds)
    .neq('profile_id', myProfile.id)

  // One row per conversation via DISTINCT ON — O(conversations), not O(all messages)
  const { data: lastMessages } = await supabase
    .rpc('last_messages_for_conversations', { conv_ids: conversationIds })

  // Unread counts aggregated in Postgres — avoids fetching individual rows
  const { data: unreadRows } = await supabase
    .rpc('unread_counts_for_conversations', {
      conv_ids: conversationIds,
      reader_profile_id: myProfile.id,
    })

  const unreadCounts: Record<string, number> = {}
  for (const row of (unreadRows ?? []) as { conversation_id: string; unread_count: number }[]) {
    unreadCounts[row.conversation_id] = row.unread_count
  }

  const lastMsgByConv: Record<string, { body: string; created_at: string }> = {}
  for (const msg of (lastMessages ?? []) as { conversation_id: string; body: string; created_at: string }[]) {
    if (!lastMsgByConv[msg.conversation_id]) {
      lastMsgByConv[msg.conversation_id] = { body: msg.body, created_at: msg.created_at }
    }
  }

  type OtherProfile = { id: string; slug: string; display_name: string; avatar_url: string | null }
  type MemberRow = { conversation_id: string; profile: OtherProfile | OtherProfile[] }
  const otherByConv: Record<string, OtherProfile> = {}
  for (const m of (allMembers ?? []) as unknown as MemberRow[]) {
    const p = m.profile
    otherByConv[m.conversation_id] = Array.isArray(p) ? p[0] : p
  }

  const conversations = conversationIds.map((cid) => ({
    id: cid,
    other_profile: otherByConv[cid] ?? null,
    last_message: lastMsgByConv[cid] ?? null,
    unread_count: unreadCounts[cid] ?? 0,
  })).sort((a, b) => {
    const ta = a.last_message?.created_at ?? ''
    const tb = b.last_message?.created_at ?? ''
    return tb.localeCompare(ta)
  })

  return NextResponse.json({ conversations, myProfileId: myProfile.id })
}

export async function POST(req: Request) {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recipient_slug } = await req.json()
  if (!recipient_slug) return NextResponse.json({ error: 'recipient_slug required' }, { status: 400 })

  const supabase = createServerClient()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: recipient } = await supabase
    .from('profiles')
    .select('id, slug, display_name')
    .eq('slug', recipient_slug)
    .single()

  if (!recipient) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })

  if (recipient.id === myProfile.id) {
    return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
  }

  // Check if a conversation already exists between these two
  const { data: existing } = await supabase
    .from('conversation_members')
    .select('conversation_id')
    .eq('profile_id', myProfile.id)

  if (existing && existing.length > 0) {
    const myConvIds = existing.map((r: { conversation_id: string }) => r.conversation_id)
    const { data: shared } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('profile_id', recipient.id)
      .in('conversation_id', myConvIds)

    if (shared && shared.length > 0) {
      return NextResponse.json({ conversation_id: shared[0].conversation_id, existing: true })
    }
  }

  // Create conversation + members atomically (single transaction via RPC)
  const { data: newConvId, error: createErr } = await supabase
    .rpc('create_conversation_with_members', {
      member_a: myProfile.id,
      member_b: recipient.id,
    })

  if (createErr || !newConvId) return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })

  return NextResponse.json({ conversation_id: newConvId, existing: false })
}
