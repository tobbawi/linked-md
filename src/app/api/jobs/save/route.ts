import { NextResponse } from 'next/server'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'

export async function POST(req: Request) {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, company_slug, title, location, type, description_md, active } = body

  if (!company_slug || !title) {
    return NextResponse.json({ error: 'company_slug and title required' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Verify ownership
  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', company_slug)
    .eq('user_id', user.id)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (id === null || id === undefined) {
    // Create
    const { data, error } = await supabase
      .from('job_listings')
      .insert({
        company_id: company.id,
        title,
        location: location || null,
        type: type || 'full-time',
        description_md: description_md || '',
        active: active ?? true,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ job: data })
  }

  if (active === false && id) {
    // Deactivate (soft delete)
    const { error } = await supabase
      .from('job_listings')
      .update({ active: false })
      .eq('id', id)
      .eq('company_id', company.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Update
  const { data, error } = await supabase
    .from('job_listings')
    .update({
      title,
      location: location || null,
      type: type || 'full-time',
      description_md: description_md || '',
      active: active ?? true,
    })
    .eq('id', id)
    .eq('company_id', company.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ job: data })
}
