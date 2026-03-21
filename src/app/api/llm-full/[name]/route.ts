import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { Profile, Post } from '@/types'

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
    return new NextResponse(`# not found\n\nNo profile found for \`${name}\`.\n`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })

  const p = profile as Profile
  const allPosts = (posts || []) as Post[]
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://linked.md'

  const sections: string[] = [
    `# linked.md full profile: ${p.display_name}`,
    `> ${baseUrl}/profile/${p.slug}.md`,
    '',
    '## Profile',
    p.markdown_content,
    '',
  ]

  for (const post of allPosts) {
    sections.push(`### ${post.title || post.slug}`)
    sections.push(`> ${baseUrl}/profile/${p.slug}/post/${post.slug}.md`)
    sections.push(post.markdown_content)
    sections.push('')
  }

  return new NextResponse(sections.join('\n'), {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
