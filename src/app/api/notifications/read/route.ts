import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import type { Profile } from '@/types'

// POST /api/notifications/read  body: { ids?: string[] }  (empty = mark all read)
export async function POST(request: NextRequest) {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single<Pick<Profile, 'id'>>()

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const ids: string[] | undefined = body?.ids

  let query = supabase
    .from('notifications')
    .update({ read: true })
    .eq('recipient_id', myProfile.id)

  if (ids && ids.length > 0) {
    query = query.in('id', ids)
  }

  const { error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
