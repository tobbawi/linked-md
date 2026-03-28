import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient } from '@/lib/supabase'
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

  // Companies link outbound to profiles via [[Name]] in their content
  const outbound_links = markdown_content
    ? Array.from(new Set(extractWikilinks(markdown_content).map(toSlug)))
    : []

  const { data: company, error } = await authClient
    .from('companies')
    .upsert(
      {
        user_id: user.id,
        slug,
        name,
        tagline: tagline ?? null,
        website: website ?? null,
        bio: bio ?? null,
        markdown_content: markdown_content ?? '',
        outbound_links,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'slug' }
    )
    .select()
    .single()

  if (error || !company) {
    return NextResponse.json({ error: error?.message ?? 'Failed to save company' }, { status: 500 })
  }

  return NextResponse.json({ company })
}
