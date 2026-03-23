// GET  /api/messages/[id]  — load messages in a conversation
// POST /api/messages/[id]  — send a message

import { NextResponse } from 'next/server'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'
import type { Message } from '@/types'
import { validateMessageBody } from '@/lib/messageValidation'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Verify membership (RLS handles this but let's also return 403 explicitly)
  const { data: membership } = await supabase
    .from('conversation_members')
    .select('profile_id')
    .eq('conversation_id', params.id)
    .eq('profile_id', myProfile.id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Mark unread messages as read BEFORE fetching — prevents a message arriving
  // between fetch and mark-read from being silently consumed without being shown.
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', params.id)
    .neq('sender_id', myProfile.id)
    .is('read_at', null)

  const { data: messages } = await supabase
    .from('messages')
    .select('*, sender:profiles!sender_id(id, slug, display_name)')
    .eq('conversation_id', params.id)
    .order('created_at', { ascending: true })
    .returns<Message[]>()

  // Get other member info
  const { data: members } = await supabase
    .from('conversation_members')
    .select('profile:profiles!profile_id(id, slug, display_name)')
    .eq('conversation_id', params.id)
    .neq('profile_id', myProfile.id)

  type MemberRow = { profile: { id: string; slug: string; display_name: string } }
  const otherProfile = members && members.length > 0
    ? (members[0] as MemberRow).profile
    : null

  return NextResponse.json({
    messages: messages ?? [],
    myProfileId: myProfile.id,
    otherProfile,
  })
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { body } = await req.json()
  const bodyError = validateMessageBody(body)
  if (bodyError) return NextResponse.json({ error: bodyError }, { status: 400 })

  const supabase = createServerClient()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id, display_name, slug')
    .eq('user_id', user.id)
    .single()

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Verify membership
  const { data: membership } = await supabase
    .from('conversation_members')
    .select('profile_id')
    .eq('conversation_id', params.id)
    .eq('profile_id', myProfile.id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: params.id,
      sender_id: myProfile.id,
      body: body.trim(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the other member
  const { data: members } = await supabase
    .from('conversation_members')
    .select('profile_id')
    .eq('conversation_id', params.id)
    .neq('profile_id', myProfile.id)

  if (members && members.length > 0) {
    const recipientId = (members[0] as { profile_id: string }).profile_id
    await supabase.from('notifications').insert({
      recipient_id: recipientId,
      type: 'message',
      actor_id: myProfile.id,
    })
  }

  return NextResponse.json({ message })
}
