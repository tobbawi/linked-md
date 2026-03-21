import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: { name: string } }
) {
  const { name } = params
  const supabase = createServerClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('markdown_content')
    .eq('slug', name)
    .single()

  if (error || !profile) {
    return new NextResponse(`# Not found\n\nNo profile found for \`${name}\`.\n`, {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  return new NextResponse(profile.markdown_content, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
