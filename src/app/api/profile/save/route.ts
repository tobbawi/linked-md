import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import { exportAllProfileFiles } from '@/lib/exports'
import { extractWikilinks, extractCompanyLinks, toSlug } from '@/lib/wikilinks'
import type { Post, ExperienceEntry } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = createAuthServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  type ExperienceInput = Omit<ExperienceEntry, 'id' | 'profile_id' | 'created_at' | 'updated_at'> & { id?: string }

  const body = await request.json()
  const { display_name, bio, markdown_content, slug, title, location, website, experience } = body as {
    display_name: string
    bio?: string
    markdown_content?: string
    slug: string
    title?: string
    location?: string
    website?: string
    experience?: ExperienceInput[]
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

  // Save experience atomically (delete+insert inside Postgres function)
  if (experience !== undefined) {
    const entries = experience.map((e, i) => ({
      company_name: e.company_name,
      company_slug: e.company_slug ?? null,
      title: e.title,
      start_year: e.start_year,
      start_month: e.start_month ?? null,
      end_year: e.end_year ?? null,
      end_month: e.end_month ?? null,
      is_current: e.is_current,
      description: e.description ?? null,
      sort_order: i, // re-index by array position on every save
    }))
    const { error: expError } = await supabase.rpc('replace_experience', {
      p_profile_id: profile.id,
      p_entries: entries,
    })
    if (expError) {
      return NextResponse.json({ error: expError.message }, { status: 500 })
    }
  }

  // Export files (async, non-blocking — failures are logged but don't affect the response)
  try {
    const serviceClient = createServerClient()
    const [{ data: posts }, { data: experienceRows }, { count: followerCount }, { count: followingCount }] =
      await Promise.all([
        serviceClient.from('posts').select('*').eq('profile_id', profile.id).returns<Post[]>(),
        serviceClient.from('experience').select('*').eq('profile_id', profile.id).order('sort_order').returns<ExperienceEntry[]>(),
        serviceClient.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', profile.id),
        serviceClient.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
      ])

    await exportAllProfileFiles(profile, posts ?? [], experienceRows ?? [], {
      followerCount: followerCount ?? 0,
      followingCount: followingCount ?? 0,
    })
  } catch (exportErr) {
    console.warn('Export failed:', exportErr)
  }

  return NextResponse.json({ profile })
}
