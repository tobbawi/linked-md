import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import type { Profile } from '@/types'

export async function DELETE(request: NextRequest) {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { comment_id } = await request.json()
  if (!comment_id) return NextResponse.json({ error: 'comment_id required' }, { status: 400 })

  const supabase = createServerClient()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single<Pick<Profile, 'id'>>()

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', comment_id)
    .eq('profile_id', myProfile.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: true })
}
