import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import type { EducationEntry } from '@/types'

type EducationInput = Omit<EducationEntry, 'id' | 'profile_id' | 'created_at' | 'updated_at'>

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
  const { education } = body as { education: EducationInput[] }

  if (!Array.isArray(education)) {
    return NextResponse.json({ error: 'education must be an array' }, { status: 400 })
  }

  const entries = education.map((e, i) => ({
    school: e.school,
    degree: e.degree ?? null,
    field_of_study: e.field_of_study ?? null,
    start_year: e.start_year,
    start_month: e.start_month ?? null,
    end_year: e.end_year ?? null,
    end_month: e.end_month ?? null,
    is_current: e.is_current,
    sort_order: i,
  }))

  const { error } = await supabase.rpc('replace_education', {
    p_profile_id: profile.id,
    p_entries: entries,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
