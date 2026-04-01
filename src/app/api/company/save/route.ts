import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import { extractWikilinks, toSlug } from '@/lib/wikilinks'

export async function POST(request: NextRequest) {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { name, slug, tagline, website, bio, markdown_content } = body as {
    name: string
    slug: string
    tagline?: string
    website?: string
    bio?: string
    markdown_content?: string
  }

  if (!name || !slug) {
    return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
  }

  const outbound_links = markdown_content
    ? Array.from(new Set(extractWikilinks(markdown_content).map(toSlug)))
    : []

  // Check if this is an INSERT or UPDATE (by looking up the slug)
  const supabase = createServerClient()
  const { data: existing } = await supabase
    .from('companies')
    .select('id, user_id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    // UPDATE path — REGRESSION: co-admin update must not overwrite user_id.
    // Only admins can update (enforced by RLS). Strip user_id from payload.
    const { data: company, error } = await authClient
      .from('companies')
      .update({
        name,
        tagline: tagline ?? null,
        website: website ?? null,
        bio: bio ?? null,
        markdown_content: markdown_content ?? '',
        outbound_links,
        updated_at: new Date().toISOString(),
      })
      .eq('slug', slug)
      .select()
      .single()

    if (error || !company) {
      return NextResponse.json({ error: error?.message ?? 'Failed to save company' }, { status: 500 })
    }
    return NextResponse.json({ company })
  }

  // INSERT path — seed the creator as the first admin in company_members.
  // Get the creator's profile id first.
  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // REGRESSION: non-admin save blocked by RLS (returns 403/500 from Supabase)
  const { data: company, error } = await authClient
    .from('companies')
    .insert({
      user_id: user.id,
      slug,
      name,
      tagline: tagline ?? null,
      website: website ?? null,
      bio: bio ?? null,
      markdown_content: markdown_content ?? '',
      outbound_links,
    })
    .select()
    .single()

  if (error || !company) {
    return NextResponse.json({ error: error?.message ?? 'Failed to save company' }, { status: 500 })
  }

  // Seed creator as admin — skip gracefully if profile doesn't exist yet
  if (myProfile) {
    try {
      await supabase
        .from('company_members')
        .insert({ company_id: company.id, profile_id: myProfile.id, role: 'admin' })
    } catch {
      // ignore — on conflict the backfill may have already seeded this
    }
  }

  return NextResponse.json({ company })
}
