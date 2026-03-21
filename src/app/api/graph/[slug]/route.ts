import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { extractWikilinks, toSlug } from '@/lib/wikilinks'
import type { Post, Profile } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', params.slug)
    .single<Profile>()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('profile_id', profile.id)
    .returns<Post[]>()

  // Collect all slugs in the network for resolution
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('slug, display_name')

  const resolvedSlugs = new Set(
    (allProfiles ?? []).map((p: { slug: string }) => p.slug)
  )

  // Build outbound links from profile content + posts
  const outboundSlugs = new Set<string>()

  const profileLinks = profile.markdown_content
    ? extractWikilinks(profile.markdown_content)
    : []
  for (const name of profileLinks) {
    outboundSlugs.add(toSlug(name))
  }

  for (const post of posts ?? []) {
    for (const name of extractWikilinks(post.markdown_content)) {
      outboundSlugs.add(toSlug(name))
    }
  }

  // Find inbound links: profiles/posts that mention this profile's slug
  const { data: mentioningProfiles } = await supabase
    .from('profiles')
    .select('slug, display_name, markdown_content')
    .neq('slug', profile.slug)

  const inboundSlugs = new Set<string>()
  for (const p of mentioningProfiles ?? []) {
    const links = extractWikilinks(p.markdown_content ?? '')
    if (links.some((n) => toSlug(n) === profile.slug)) {
      inboundSlugs.add(p.slug)
    }
  }

  const graph = {
    profile: {
      slug: profile.slug,
      display_name: profile.display_name,
    },
    outbound: Array.from(outboundSlugs).map((slug) => ({
      slug,
      resolved: resolvedSlugs.has(slug),
    })),
    inbound: Array.from(inboundSlugs).map((slug) => ({
      slug,
      display_name:
        (allProfiles ?? []).find((p: { slug: string }) => p.slug === slug)
          ?.display_name ?? slug,
    })),
    post_count: (posts ?? []).length,
    generated_at: new Date().toISOString(),
  }

  return NextResponse.json(graph, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
