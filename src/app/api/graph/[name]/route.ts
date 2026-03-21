import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { Profile } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: { name: string } }
) {
  const { name } = params
  const supabase = createServerClient()

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', name)
    .single()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Inbound links: other profiles that mention [[this profile's name]]
  const { data: inboundLinks } = await supabase
    .from('links')
    .select('source_id, profiles!inner(slug)')
    .eq('target_slug', name)
    .eq('target_type', 'profile')

  const inbound = (inboundLinks || []).map(
    (l: { source_id: string; profiles: { slug: string }[] }) =>
      l.profiles[0]?.slug
  ).filter(Boolean) as string[]

  const p = profile as Profile
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://linked.md'

  const graph = {
    entity: p.display_name,
    url: `${baseUrl}/profile/${p.slug}.md`,
    outbound: p.outbound_links,
    inbound,
  }

  return NextResponse.json(graph, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
