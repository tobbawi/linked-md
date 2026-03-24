import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const CACHE = { headers: { 'Cache-Control': 'private, max-age=60' } }

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const q = (searchParams.get('q') ?? '').trim()
  // Strip PostgREST filter-syntax special chars to prevent filter injection
  const safeQ = q.replace(/[,().]/g, '')
  const type = searchParams.get('type') ?? 'profiles' // profiles | all

  if (!q) {
    return NextResponse.json(type === 'all' ? { profiles: [], companies: [], posts: [] } : [])
  }

  const supabase = createServerClient()

  if (type === 'company') {
    const { data, error } = await supabase
      .from('companies')
      .select('slug, name')
      .or(`slug.ilike.%${safeQ}%,name.ilike.%${safeQ}%`)
      .limit(10)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    // Return same shape as profile search: { slug, display_name }
    return NextResponse.json((data ?? []).map((c: { slug: string; name: string }) => ({
      slug: c.slug,
      display_name: c.name,
    })), CACHE)
  }

  if (type !== 'all') {
    // Backward-compat: plain profile search used by editor autocomplete
    const { data, error } = await supabase
      .from('profiles')
      .select('slug, display_name')
      .or(`slug.ilike.%${safeQ}%,display_name.ilike.%${safeQ}%`)
      .limit(10)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [], CACHE)
  }

  // Unified search across profiles, companies, and posts
  const [profilesRes, companiesRes, postsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('slug, display_name, title, bio')
      .or(`slug.ilike.%${safeQ}%,display_name.ilike.%${safeQ}%,bio.ilike.%${safeQ}%,title.ilike.%${safeQ}%`)
      .limit(8),
    supabase
      .from('companies')
      .select('slug, name, tagline')
      .or(`slug.ilike.%${safeQ}%,name.ilike.%${safeQ}%,tagline.ilike.%${safeQ}%`)
      .limit(8),
    supabase
      .from('posts')
      .select('slug, title, markdown_content, profile:profiles!profile_id(slug, display_name)')
      .or(`title.ilike.%${safeQ}%,markdown_content.ilike.%${safeQ}%`)
      .limit(8),
  ])

  return NextResponse.json({
    profiles: profilesRes.data ?? [],
    companies: companiesRes.data ?? [],
    posts: postsRes.data ?? [],
  }, CACHE)
}
