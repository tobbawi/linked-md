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

  // Atomic replace via transactional RPC (delete + insert in one txn, no data-loss window)
  const { error } = await supabase.rpc('replace_skills', {
    p_profile_id: profile.id,
    p_skills: JSON.stringify(skills),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
