import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { exportAllProfileFiles, exportPostMarkdown } from '@/lib/exports'
import type { Post, Profile } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { title, slug: postSlug, content } = body as {
    title?: string
    slug: string
    content: string
  }

  if (!postSlug || !content) {
    return NextResponse.json(
      { error: 'slug and content are required' },
      { status: 400 }
    )
  }

  // Get author's profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single<Profile>()

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'Profile not found. Please set up your profile first.' },
      { status: 404 }
    )
  }

  const { data: post, error } = await supabase
    .from('posts')
    .upsert(
      {
        profile_id: profile.id,
        slug: postSlug,
        title: title ?? null,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id,slug' }
    )
    .select()
    .single<Post>()

  if (error || !post) {
    return NextResponse.json(
      { error: error?.message ?? 'Failed to save post' },
      { status: 500 }
    )
  }

  // Export files
  try {
    const { data: allPosts } = await supabase
      .from('posts')
      .select('*')
      .eq('profile_id', profile.id)
      .returns<Post[]>()

    exportPostMarkdown(post, profile.slug)
    await exportAllProfileFiles(profile, allPosts ?? [])
  } catch (exportErr) {
    console.warn('Export failed:', exportErr)
  }

  return NextResponse.json({ post, profileSlug: profile.slug })
}
