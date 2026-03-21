import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { exportLlmTxt } from '@/lib/exports'
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
    return new NextResponse(`# linked.md profile: not found\n\nNo profile found for \`${name}\`.\n`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10)

  const content = await exportLlmTxt(
    profile as Profile,
    (posts || []) as Post[]
  )

  return new NextResponse(content, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
