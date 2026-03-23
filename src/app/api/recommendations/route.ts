import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const supabase = createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServerClient()
  const { data: author } = await serviceClient
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()
  if (!author) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const body = await request.json()
  const { recipient_id, body: recBody } = body as { recipient_id: string; body: string }

  if (!recipient_id || !recBody) {
    return NextResponse.json({ error: 'recipient_id and body required' }, { status: 400 })
  }
  if (recBody.length < 20 || recBody.length > 500) {
    return NextResponse.json({ error: 'Body must be 20-500 characters' }, { status: 400 })
  }
  if (recipient_id === author.id) {
    return NextResponse.json({ error: 'Cannot recommend yourself' }, { status: 403 })
  }

  const { data: rec, error } = await supabase
    .from('recommendations')
    .insert({
      author_id: author.id,
      recipient_id,
      body: recBody,
      visible: true,
    })
    .select('id')
    .single()

  if (error || !rec) {
    return NextResponse.json({ error: error?.message ?? 'Failed to save' }, { status: 500 })
  }

  // Fire notification (non-blocking)
  serviceClient
    .from('notifications')
    .insert({
      recipient_id,
      actor_id: author.id,
      type: 'recommendation',
    })
    .then(() => {})
    .catch(() => {})

  return NextResponse.json({ id: rec.id })
}
