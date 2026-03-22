import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import type { Profile } from '@/types'

export async function POST(request: NextRequest) {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { post_id, body } = await request.json()
  if (!post_id || !body?.trim()) {
    return NextResponse.json({ error: 'post_id and body required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id, slug, display_name')
    .eq('user_id', user.id)
    .single<Pick<Profile, 'id' | 'slug' | 'display_name'>>()

  if (!myProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: comment, error } = await supabase
    .from('comments')
    .insert({ post_id, profile_id: myProfile.id, body: body.trim() })
    .select()
    .single()

  if (error || !comment) return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 })

  // Notify post author (skip if commenting on own post)
  const { data: post } = await supabase
    .from('posts')
    .select('profile_id')
    .eq('id', post_id)
    .single()
  if (post && post.profile_id !== myProfile.id) {
    await supabase.from('notifications').insert({
      recipient_id: post.profile_id,
      type: 'comment',
      actor_id: myProfile.id,
      post_id,
      comment_id: comment.id,
    })
  }

  return NextResponse.json({ comment: { ...comment, profile: { slug: myProfile.slug, display_name: myProfile.display_name } } })
}
