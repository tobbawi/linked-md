import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
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
    return new NextResponse('Profile not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })
    .returns<Post[]>()

  const allPosts = posts ?? []

  const lines: string[] = []

  // Header
  lines.push(`# ${profile.display_name} — linked.md profile (full)`)
  lines.push(`> Source: /profile/${profile.slug}/llm-full.txt`)
  lines.push(`> Last updated: ${profile.updated_at}`)
  lines.push('')

  // Bio
  if (profile.bio) {
    lines.push('## Bio')
    lines.push(profile.bio)
    lines.push('')
  }

  // Profile content
  if (profile.markdown_content) {
    lines.push('## About')
    lines.push(profile.markdown_content)
    lines.push('')
  }

  // Full posts with complete content
  if (allPosts.length > 0) {
    lines.push(`## Posts (${allPosts.length})`)
    lines.push('')
    for (const post of allPosts) {
      if (post.title) lines.push(`### ${post.title}`)
      lines.push(`> /profile/${profile.slug}/post/${post.slug}.md`)
      lines.push(`> Posted: ${post.created_at}`)
      lines.push('')
      lines.push(post.markdown_content)
      lines.push('')
      lines.push('---')
      lines.push('')
    }
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
