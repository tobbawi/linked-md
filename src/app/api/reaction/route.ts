import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import type { Profile } from '@/types'

// POST /api/reaction  body: { post_id }  → like
// DELETE /api/reaction  body: { post_id }  → unlike

async function getMyProfile(authClient: ReturnType<typeof createAuthServerClient>) {
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null
  const supabase = createServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single<Pick<Profile, 'id'>>()
  return profile ? { profileId: profile.id } : null
}

export async function POST(request: NextRequest) {
  const authClient = createAuthServerClient()
  const { post_id } = await request.json()
  if (!post_id) return NextResponse.json({ error: 'post_id required' }, { status: 400 })

  const me = await getMyProfile(authClient)
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const { error } = await supabase.from('reactions').upsert(
    { profile_id: me.profileId, post_id, type: 'like' },
    { onConflict: 'profile_id,post_id,type' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the post author (skip if liking own post)
  const { data: post } = await supabase
    .from('posts')
    .select('profile_id')
    .eq('id', post_id)
    .single()
  if (post && post.profile_id !== me.profileId) {
    await supabase.from('notifications').insert({
      recipient_id: post.profile_id,
      type: 'like',
      actor_id: me.profileId,
      post_id,
    })
  }

  return NextResponse.json({ liked: true })
}

export async function DELETE(request: NextRequest) {
  const authClient = createAuthServerClient()
  const { post_id } = await request.json()
  if (!post_id) return NextResponse.json({ error: 'post_id required' }, { status: 400 })

  const me = await getMyProfile(authClient)
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServerClient()

  const { error } = await supabase
    .from('reactions')
    .delete()
    .eq('profile_id', me.profileId)
    .eq('post_id', post_id)
    .eq('type', 'like')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ liked: false })
}
