import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import { exportAllProfileFiles } from '@/lib/exports'
import { extractWikilinks, extractCompanyLinks, toSlug } from '@/lib/wikilinks'
import type { Post } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = createAuthServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { display_name, bio, markdown_content, slug, title, location, website } = body as {
    display_name: string
    bio?: string
    markdown_content?: string
    slug: string
    title?: string
    location?: string
    website?: string
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
        title: title ?? null,
        location: location ?? null,
        website: website ?? null,
        bio: bio ?? null,
        markdown_content: markdown_content ?? '',
        outbound_links: markdown_content
          ? Array.from(new Set(extractWikilinks(markdown_content).map(toSlug)))
          : [],
        company_links: markdown_content
          ? Array.from(new Set(extractCompanyLinks(markdown_content)))
          : [],
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
    const serviceClient = createServerClient()
    const [{ data: posts }, { count: followerCount }, { count: followingCount }] = await Promise.all([
      serviceClient.from('posts').select('*').eq('profile_id', profile.id).returns<Post[]>(),
      serviceClient.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', profile.id),
      serviceClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    ])

    await exportAllProfileFiles(profile, posts ?? [], {
      followerCount: followerCount ?? 0,
      followingCount: followingCount ?? 0,
    })
  } catch (exportErr) {
    // Export failure is non-fatal in dev — log and continue
    console.warn('Export failed:', exportErr)
  }

  return NextResponse.json({ profile })
}
