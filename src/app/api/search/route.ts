import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const CACHE = { headers: { 'Cache-Control': 'private, max-age=60' } }

/** Escape markdown-significant chars to prevent injection in LLM-consumed output */
function escapeMd(s: string): string {
  return s.replace(/[#\[\]*_`~>|\n\r\\]/g, (c) => (c === '\n' || c === '\r' ? ' ' : `\\${c}`))
}

/** Convert user query to tsquery format. Handles multi-word queries with & operator. */
function toTsQuery(q: string): string {
  return q.trim().split(/\s+/).filter(Boolean).map(w => w.replace(/[^a-zA-Z0-9]/g, '')).filter(Boolean).join(' & ')
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const q = (searchParams.get('q') ?? '').trim()
  // Strip PostgREST filter-syntax special chars + SQL LIKE wildcards to prevent injection
  const safeQ = q.replace(/[,().%_]/g, '')
  const type = searchParams.get('type') ?? 'profiles' // profiles | all
  const format = searchParams.get('format')

  if (!q) {
    if (format === 'llm') {
      return new NextResponse('# Search\n\nNo query provided. Use ?q=QUERY&format=llm\n', {
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      })
    }
    return NextResponse.json(type === 'all' ? { profiles: [], companies: [], posts: [] } : [])
  }

  const supabase = createServerClient()
  const tsQuery = toTsQuery(safeQ)
  // Use full-text search for 3+ char queries, ilike for short ones
  const useFts = tsQuery.length >= 3

  // LLM format always does unified search
  if (format === 'llm') {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://linked.md'

    const [profilesRes, companiesRes, postsRes] = await Promise.all([
      useFts
        ? supabase.from('profiles').select('slug, display_name, title').textSearch('search_vector', tsQuery, { type: 'plain' }).limit(10)
        : supabase.from('profiles').select('slug, display_name, title').or(`slug.ilike.%${safeQ}%,display_name.ilike.%${safeQ}%`).limit(10),
      useFts
        ? supabase.from('companies').select('slug, name, tagline').textSearch('search_vector', tsQuery, { type: 'plain' }).limit(10)
        : supabase.from('companies').select('slug, name, tagline').or(`slug.ilike.%${safeQ}%,name.ilike.%${safeQ}%`).limit(10),
      useFts
        ? supabase.from('posts').select('slug, title, profile:profiles!profile_id(slug, display_name)').textSearch('search_vector', tsQuery, { type: 'plain' }).limit(10)
        : supabase.from('posts').select('slug, title, profile:profiles!profile_id(slug, display_name)').or(`title.ilike.%${safeQ}%,markdown_content.ilike.%${safeQ}%`).limit(10),
    ])

    if (profilesRes.error || companiesRes.error || postsRes.error) {
      const msg = profilesRes.error?.message || companiesRes.error?.message || postsRes.error?.message
      return new NextResponse(`# Search error\n\n${msg}\n`, {
        status: 500,
        headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
      })
    }

    const profiles = profilesRes.data ?? []
    const companies = companiesRes.data ?? []
    const posts = postsRes.data ?? []

    const lines: string[] = [
      `# Search results for "${escapeMd(q)}"`,
      '',
      `Found ${profiles.length} profiles, ${companies.length} companies, ${posts.length} posts.`,
      '',
    ]

    if (profiles.length > 0) {
      lines.push('## Profiles', '')
      for (const p of profiles) {
        const suffix = p.title ? ` — ${escapeMd(p.title)}` : ''
        lines.push(`- **${escapeMd(p.display_name)}**${suffix}`)
        lines.push(`  ${baseUrl}/profile/${p.slug}/llm.txt`)
        lines.push('')
      }
    }

    if (companies.length > 0) {
      lines.push('## Companies', '')
      for (const c of companies) {
        const suffix = c.tagline ? ` — ${escapeMd(c.tagline)}` : ''
        lines.push(`- **${escapeMd(c.name)}**${suffix}`)
        lines.push(`  ${baseUrl}/company/${c.slug}/llm.txt`)
        lines.push('')
      }
    }

    if (posts.length > 0) {
      lines.push('## Posts', '')
      for (const post of posts) {
        const profile = post.profile as unknown as { slug: string; display_name: string } | null
        const byLine = profile ? ` by ${escapeMd(profile.display_name)}` : ''
        const profileSlug = profile?.slug ?? 'unknown'
        lines.push(`- **${escapeMd(post.title || post.slug)}**${byLine}`)
        lines.push(`  ${baseUrl}/profile/${profileSlug}/post/${post.slug}.md`)
        lines.push('')
      }
    }

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'private, max-age=60',
      },
    })
  }

  if (type === 'company') {
    const { data, error } = useFts
      ? await supabase.from('companies').select('slug, name').textSearch('search_vector', tsQuery, { type: 'plain' }).limit(10)
      : await supabase.from('companies').select('slug, name').or(`slug.ilike.%${safeQ}%,name.ilike.%${safeQ}%`).limit(10)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json((data ?? []).map((c: { slug: string; name: string }) => ({
      slug: c.slug,
      display_name: c.name,
    })), CACHE)
  }

  if (type !== 'all') {
    // Backward-compat: plain profile search used by editor autocomplete
    const { data, error } = useFts
      ? await supabase.from('profiles').select('slug, display_name').textSearch('search_vector', tsQuery, { type: 'plain' }).limit(10)
      : await supabase.from('profiles').select('slug, display_name').or(`slug.ilike.%${safeQ}%,display_name.ilike.%${safeQ}%`).limit(10)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? [], CACHE)
  }

  // Unified search across profiles, companies, and posts
  const [profilesRes, companiesRes, postsRes] = await Promise.all([
    useFts
      ? supabase.from('profiles').select('slug, display_name, title, bio').textSearch('search_vector', tsQuery, { type: 'plain' }).limit(8)
      : supabase.from('profiles').select('slug, display_name, title, bio').or(`slug.ilike.%${safeQ}%,display_name.ilike.%${safeQ}%`).limit(8),
    useFts
      ? supabase.from('companies').select('slug, name, tagline').textSearch('search_vector', tsQuery, { type: 'plain' }).limit(8)
      : supabase.from('companies').select('slug, name, tagline').or(`slug.ilike.%${safeQ}%,name.ilike.%${safeQ}%`).limit(8),
    useFts
      ? supabase.from('posts').select('slug, title, markdown_content, profile:profiles!profile_id(slug, display_name)').textSearch('search_vector', tsQuery, { type: 'plain' }).limit(8)
      : supabase.from('posts').select('slug, title, markdown_content, profile:profiles!profile_id(slug, display_name)').or(`title.ilike.%${safeQ}%,markdown_content.ilike.%${safeQ}%`).limit(8),
  ])

  return NextResponse.json({
    profiles: profilesRes.data ?? [],
    companies: companiesRes.data ?? [],
    posts: postsRes.data ?? [],
  }, CACHE)
}
