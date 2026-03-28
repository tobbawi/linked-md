import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { buildPostMarkdown } from '@/lib/exports'
import type { Post, Profile } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string; postslug: string } }
) {
  const supabase = createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', params.slug)
    .single<Profile>()

  if (!profile) {
    return new NextResponse('# Profile not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('slug', params.postslug)
    .single<Post>()

  if (!post) {
    return new NextResponse('# Post not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  const md = buildPostMarkdown(post, profile.slug)

  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
