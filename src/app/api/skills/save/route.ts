import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServerClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json()
  const { skills } = body as { skills: string[] }

  if (!Array.isArray(skills)) {
    return NextResponse.json({ error: 'skills must be an array of strings' }, { status: 400 })
  }

  // Atomic replace: delete all existing skills, then re-insert
  const { error: delError } = await supabase
    .from('profile_skills')
    .delete()
    .eq('profile_id', profile.id)

  if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })

  if (skills.length > 0) {
    const rows = skills.map((name, i) => ({
      profile_id: profile.id,
      name: name.trim(),
      sort_order: i,
    })).filter(r => r.name.length > 0)

    const { error: insError } = await supabase
      .from('profile_skills')
      .insert(rows)

    if (insError) return NextResponse.json({ error: insError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
