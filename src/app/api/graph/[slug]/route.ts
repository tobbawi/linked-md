import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { Profile } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createServerClient()

  // 1. Get profile by slug — O(1)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, slug, display_name, outbound_links')
    .eq('slug', params.slug)
    .single<Pick<Profile, 'id' | 'slug' | 'display_name' | 'outbound_links'>>()

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // 2. Get post outbound_links — O(k) where k = post count
  const { data: posts } = await supabase
    .from('posts')
    .select('outbound_links')
    .eq('profile_id', profile.id)

  // 3. Merge outbound links from profile + all posts
  const outboundSlugs = new Set<string>(profile.outbound_links ?? [])
  for (const post of posts ?? []) {
    for (const link of post.outbound_links ?? []) {
      outboundSlugs.add(link)
    }
  }

  // 4. Resolve outbound slugs: check which ones exist as profiles
  const outboundArray = Array.from(outboundSlugs)
  let resolvedSlugs = new Set<string>()
  if (outboundArray.length > 0) {
    const { data: resolved } = await supabase
      .from('profiles')
      .select('slug')
      .in('slug', outboundArray)
    resolvedSlugs = new Set((resolved ?? []).map((p: { slug: string }) => p.slug))
  }

  // 5. Find inbound links: profiles whose outbound_links contain this slug — O(log n) with index
  const { data: inboundProfiles } = await supabase
    .from('profiles')
    .select('slug, display_name')
    .contains('outbound_links', [profile.slug])
    .neq('slug', profile.slug)

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://linked.md'

  const graph = {
    profile: {
      slug: profile.slug,
      display_name: profile.display_name,
    },
    outbound: outboundArray.map((slug) => ({
      slug,
      resolved: resolvedSlugs.has(slug),
    })),
    inbound: (inboundProfiles ?? []).map((p: { slug: string; display_name: string }) => ({
      slug: p.slug,
      display_name: p.display_name,
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
