import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase'
import type { Profile } from '@/types'

export async function DELETE(request: NextRequest) {
  const supabase = createAuthServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { slug } = (await request.json()) as { slug: string }

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single<Pick<Profile, 'id'>>()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('profile_id', profile.id)
    .eq('slug', slug)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
