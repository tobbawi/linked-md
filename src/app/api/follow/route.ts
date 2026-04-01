import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import type { Profile } from '@/types'

// POST /api/follow  body: { followee_slug }  → follow
// DELETE /api/follow  body: { followee_slug }  → unfollow

async function getProfiles(authClient: ReturnType<typeof createAuthServerClient>, followeeSlug: string) {
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return null

  const supabase = createServerClient()
  const [{ data: myProfile }, { data: theirProfile }] = await Promise.all([
    supabase.from('profiles').select('id').eq('user_id', user.id).single<Pick<Profile, 'id'>>(),
    supabase.from('profiles').select('id').eq('slug', followeeSlug).single<Pick<Profile, 'id'>>(),
  ])

  if (!myProfile || !theirProfile) return null
  if (myProfile.id === theirProfile.id) return null // can't follow yourself

  return { myProfileId: myProfile.id, theirProfileId: theirProfile.id, userId: user.id }
}

export async function POST(request: NextRequest) {
  const authClient = createAuthServerClient()
  const { followee_slug } = await request.json()
  if (!followee_slug) return NextResponse.json({ error: 'followee_slug required' }, { status: 400 })

  const ids = await getProfiles(authClient, followee_slug)
  if (!ids) return NextResponse.json({ error: 'Unauthorized or profile not found' }, { status: 401 })

  const supabase = createServerClient()

  // Insert follow (ignore conflict)
  const { error } = await supabase.from('follows').upsert(
    { follower_id: ids.myProfileId, followee_id: ids.theirProfileId },
    { onConflict: 'follower_id,followee_id' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create notification
  await supabase.from('notifications').insert({
    recipient_id: ids.theirProfileId,
    type: 'follow',
    actor_id: ids.myProfileId,
  })

  return NextResponse.json({ following: true })
}

export async function DELETE(request: NextRequest) {
  const authClient = createAuthServerClient()
  const { followee_slug } = await request.json()
  if (!followee_slug) return NextResponse.json({ error: 'followee_slug required' }, { status: 400 })

  const ids = await getProfiles(authClient, followee_slug)
  if (!ids) return NextResponse.json({ error: 'Unauthorized or profile not found' }, { status: 401 })

  const supabase = createServerClient()

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', ids.myProfileId)
    .eq('followee_id', ids.theirProfileId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ following: false })
}
