import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'

// POST   /api/repost  body: { post_id }  → repost
// DELETE /api/repost  body: { post_id }  → un-repost

async function getIds(authClient: ReturnType<typeof createAuthServerClient>, postId: string) {
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const supabase = createServerClient()
  const [{ data: myProfile }, { data: post }] = await Promise.all([
    supabase.from('profiles').select('id').eq('user_id', user.id).single(),
    supabase.from('posts').select('id, profile_id').eq('id', postId).single(),
  ])

  if (!myProfile || !post) return null
  return { myProfileId: myProfile.id as string, post: post as { id: string; profile_id: string } }
}

export async function POST(request: NextRequest) {
  const authClient = createAuthServerClient()
  const body = await request.json()
  const post_id: string = body?.post_id
  if (!post_id) return NextResponse.json({ error: 'post_id required' }, { status: 400 })

  const ids = await getIds(authClient, post_id)
  if (!ids) return NextResponse.json({ error: 'Unauthorized or post not found' }, { status: 401 })

  // Cannot repost own post
  if (ids.post.profile_id === ids.myProfileId) {
    return NextResponse.json({ error: 'Cannot repost your own post' }, { status: 403 })
  }

  const comment: string | null = body?.comment ?? null
  const supabase = createServerClient()

  const { error } = await supabase
    .from('reposts')
    .insert({ profile_id: ids.myProfileId, original_post_id: post_id, comment })

  if (error) {
    // UNIQUE violation → already reposted
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already reposted' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Notify original post author (different from reposter)
  if (ids.post.profile_id !== ids.myProfileId) {
    await supabase.from('notifications').insert({
      recipient_id: ids.post.profile_id,
      type: 'repost',
      actor_id: ids.myProfileId,
      post_id: post_id,
    })
  }

  return NextResponse.json({ reposted: true })
}

export async function DELETE(request: NextRequest) {
  const authClient = createAuthServerClient()
  const body = await request.json()
  const post_id: string = body?.post_id
  if (!post_id) return NextResponse.json({ error: 'post_id required' }, { status: 400 })

  const ids = await getIds(authClient, post_id)
  if (!ids) return NextResponse.json({ error: 'Unauthorized or post not found' }, { status: 401 })

  const supabase = createServerClient()

  const { error } = await supabase
    .from('reposts')
    .delete()
    .eq('profile_id', ids.myProfileId)
    .eq('original_post_id', post_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ reposted: false })
}
