import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { exportAllProfileFiles } from '@/lib/exports'
import type { Post } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { display_name, bio, content, slug } = body as {
    display_name: string
    bio?: string
    content?: string
    slug: string
  }

  if (!display_name || !slug) {
    return NextResponse.json(
      { error: 'display_name and slug are required' },
      { status: 400 }
    )
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: user.id,
        slug,
        display_name,
        bio: bio ?? null,
        content: content ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error || !profile) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to save profile' },
      { status: 500 }
    )
  }

  // Export files
  try {
    const { data: posts } = await supabase
      .from('posts')
      .select('*')
      .eq('profile_id', profile.id)
      .returns<Post[]>()

    await exportAllProfileFiles(profile, posts ?? [])
  } catch (exportErr) {
    // Export failure is non-fatal in dev — log and continue
    console.warn('Export failed:', exportErr)
  }

  return NextResponse.json({ profile })
}
