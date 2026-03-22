import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { buildProfileMarkdown } from '@/lib/exports'
import type { Profile } from '@/types'

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
    return new NextResponse('# Profile not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  const md = buildProfileMarkdown(profile)

  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
