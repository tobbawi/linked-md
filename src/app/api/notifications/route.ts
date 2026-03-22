import { NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import type { Profile, Notification } from '@/types'

export async function GET() {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single<Pick<Profile, 'id'>>()

  if (!myProfile) return NextResponse.json({ notifications: [], unread: 0 })

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*, actor:profiles!actor_id(slug, display_name), post:posts!post_id(slug, title)')
    .eq('recipient_id', myProfile.id)
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<Notification[]>()

  const unread = (notifications ?? []).filter((n) => !n.read).length

  return NextResponse.json({ notifications: notifications ?? [], unread })
}
