import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'

interface Params {
  params: { id: string }
}

export async function PATCH(_request: NextRequest, { params }: Params) {
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

  // Only the recipient can hide their own recommendations
  const { error } = await supabase
    .from('recommendations')
    .update({ visible: false })
    .eq('id', params.id)
    .eq('recipient_id', profile.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
