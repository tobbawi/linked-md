import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const q = (searchParams.get('q') ?? '').trim()

  if (!q) {
    return NextResponse.json([])
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('slug, display_name')
    .or(`slug.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}
