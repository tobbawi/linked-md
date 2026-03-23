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
    .select('conversation_id, profile:profiles!profile_id(id, slug, display_name)')
    .in('conversation_id', conversationIds)
    .neq('profile_id', myProfile.id)

  const { data: lastMessages } = await supabase
    .from('messages')
    .select('conversation_id, body, created_at, sender_id')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })

  // Unread count per conversation
  const { data: unreadRows } = await supabase
    .from('messages')
    .select('conversation_id')
    .in('conversation_id', conversationIds)
    .is('read_at', null)
    .neq('sender_id', myProfile.id)

  const unreadCounts: Record<string, number> = {}
  for (const row of (unreadRows ?? []) as { conversation_id: string }[]) {
    unreadCounts[row.conversation_id] = (unreadCounts[row.conversation_id] ?? 0) + 1
  }

  const lastMsgByConv: Record<string, { body: string; created_at: string }> = {}
  for (const msg of (lastMessages ?? []) as { conversation_id: string; body: string; created_at: string }[]) {
    if (!lastMsgByConv[msg.conversation_id]) {
      lastMsgByConv[msg.conversation_id] = { body: msg.body, created_at: msg.created_at }
    }
  }

  type MemberRow = { conversation_id: string; profile: { id: string; slug: string; display_name: string } }
  const otherByConv: Record<string, { id: string; slug: string; display_name: string }> = {}
  for (const m of (allMembers ?? []) as MemberRow[]) {
    otherByConv[m.conversation_id] = m.profile
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

  // Create new conversation
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .insert({})
    .select('id')
    .single()

  if (convErr || !conv) return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })

  // Add both members
  const { error: memberErr } = await supabase
    .from('conversation_members')
    .insert([
      { conversation_id: conv.id, profile_id: myProfile.id },
      { conversation_id: conv.id, profile_id: recipient.id },
    ])

  if (memberErr) return NextResponse.json({ error: 'Failed to add members' }, { status: 500 })

  return NextResponse.json({ conversation_id: conv.id, existing: false })
}
