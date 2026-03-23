// PATCH /api/messages/[id]/read — mark all unread messages in a conversation as read
// Called by the Realtime handler in the chat thread page on incoming messages.

import { NextResponse } from 'next/server'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'

export async function PATCH(
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

  // Verify membership before marking read (RLS also enforces this)
  const { data: membership } = await supabase
    .from('conversation_members')
    .select('profile_id')
    .eq('conversation_id', params.id)
    .eq('profile_id', myProfile.id)
    .maybeSingle()

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', params.id)
    .neq('sender_id', myProfile.id)
    .is('read_at', null)

  return NextResponse.json({ ok: true })
}
