import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'

// POST   /api/company/member  { company_slug, profile_slug }  → add admin
// DELETE /api/company/member  { company_slug, profile_slug }  → remove admin

async function resolveIds(
  authClient: ReturnType<typeof createAuthServerClient>,
  companySlug: string
): Promise<
  | { error: string; status: number }
  | { myProfileId: string; companyId: string; companyOwnerId: string }
> {
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const supabase = createServerClient()
  const [{ data: myProfile }, { data: company }] = await Promise.all([
    supabase.from('profiles').select('id').eq('user_id', user.id).single(),
    supabase.from('companies').select('id, user_id').eq('slug', companySlug).single(),
  ])

  if (!myProfile || !company) return { error: 'Company not found', status: 404 }

  // Verify caller is an admin of this company
  const { data: membership } = await supabase
    .from('company_members')
    .select('role')
    .eq('company_id', company.id)
    .eq('profile_id', myProfile.id)
    .maybeSingle()

  if (!membership) return { error: 'Forbidden — you are not an admin of this company', status: 403 }

  return {
    myProfileId: myProfile.id as string,
    companyId: company.id as string,
    companyOwnerId: company.user_id as string,
  }
}

export async function POST(request: NextRequest) {
  const authClient = createAuthServerClient()
  const body = await request.json()
  const company_slug: string = body?.company_slug
  const profile_slug: string = (body?.profile_slug ?? '').replace(/^@/, '')

  if (!company_slug || !profile_slug) {
    return NextResponse.json({ error: 'company_slug and profile_slug are required' }, { status: 400 })
  }

  const ids = await resolveIds(authClient, company_slug)
  if ('error' in ids) return NextResponse.json({ error: ids.error }, { status: ids.status })

  const supabase = createServerClient()

  // Resolve the target profile by slug
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', profile_slug)
    .single()

  if (!targetProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Check not already an admin
  const { data: existing } = await supabase
    .from('company_members')
    .select('role')
    .eq('company_id', ids.companyId)
    .eq('profile_id', targetProfile.id)
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'Already an admin' }, { status: 409 })

  const { data: member, error } = await supabase
    .from('company_members')
    .insert({ company_id: ids.companyId, profile_id: targetProfile.id, role: 'admin' })
    .select()
    .single()

  if (error || !member) {
    return NextResponse.json({ error: error?.message ?? 'Failed to add admin' }, { status: 500 })
  }

  return NextResponse.json({ member })
}

export async function DELETE(request: NextRequest) {
  const authClient = createAuthServerClient()
  const body = await request.json()
  const company_slug: string = body?.company_slug
  const profile_slug: string = (body?.profile_slug ?? '').replace(/^@/, '')

  if (!company_slug || !profile_slug) {
    return NextResponse.json({ error: 'company_slug and profile_slug are required' }, { status: 400 })
  }

  const ids = await resolveIds(authClient, company_slug)
  if ('error' in ids) return NextResponse.json({ error: ids.error }, { status: ids.status })

  const supabase = createServerClient()

  // Resolve the target profile by slug
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, user_id')
    .eq('slug', profile_slug)
    .single()

  if (!targetProfile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Verify target is actually a member before proceeding
  const { data: targetMembership } = await supabase
    .from('company_members')
    .select('role')
    .eq('company_id', ids.companyId)
    .eq('profile_id', targetProfile.id)
    .maybeSingle()

  if (!targetMembership) return NextResponse.json({ error: 'Profile is not an admin of this company' }, { status: 404 })

  // Check last-admin first (before checking if target is original creator —
  // if both apply, "cannot remove last admin" is the more informative error)
  const { count: adminCount } = await supabase
    .from('company_members')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', ids.companyId)

  if ((adminCount ?? 0) <= 1) {
    return NextResponse.json({ error: 'Cannot remove the last admin of a company' }, { status: 400 })
  }

  // Block removal of the original company creator
  if (targetProfile.user_id === ids.companyOwnerId) {
    return NextResponse.json({ error: 'Cannot remove the company owner' }, { status: 400 })
  }

  const { error } = await supabase
    .from('company_members')
    .delete()
    .eq('company_id', ids.companyId)
    .eq('profile_id', targetProfile.id)

  if (error) {
    // DB triggers fire if the client somehow bypassed the app-level checks (race)
    if (error.message.includes('last admin')) {
      return NextResponse.json({ error: 'Cannot remove the last admin of a company' }, { status: 400 })
    }
    if (error.message.includes('owner')) {
      return NextResponse.json({ error: 'Cannot remove the company owner' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ removed: true })
}
