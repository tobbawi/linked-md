import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServerClient()
  const { data: endorser } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!endorser) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json()
  const { skill_id } = body as { skill_id: string }
  if (!skill_id) return NextResponse.json({ error: 'skill_id required' }, { status: 400 })

  // Fetch the skill to check ownership and get context for notification
  const { data: skill } = await serviceClient
    .from('profile_skills')
    .select('id, name, profile_id')
    .eq('id', skill_id)
    .single()
  if (!skill) return NextResponse.json({ error: 'Skill not found' }, { status: 404 })

  // Self-endorsement prevention
  if (skill.profile_id === endorser.id) {
    return NextResponse.json({ error: 'Cannot endorse your own skill' }, { status: 403 })
  }

  const { error } = await supabase
    .from('skill_endorsements')
    .insert({ skill_id, endorser_id: endorser.id })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already endorsed' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fire notification (non-blocking — ignore failures)
  serviceClient
    .from('notifications')
    .insert({
      recipient_id: skill.profile_id,
      actor_id: endorser.id,
      type: 'endorse',
      skill_id: skill.id,
      skill_name: skill.name,
    })
    .then(() => {})
    .catch(() => {})

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServerClient()
  const { data: endorser } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!endorser) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json()
  const { skill_id } = body as { skill_id: string }
  if (!skill_id) return NextResponse.json({ error: 'skill_id required' }, { status: 400 })

  const { error } = await supabase
    .from('skill_endorsements')
    .delete()
    .eq('skill_id', skill_id)
    .eq('endorser_id', endorser.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
