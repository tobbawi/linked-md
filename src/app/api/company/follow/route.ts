import { NextRequest, NextResponse } from 'next/server'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'

// POST   /api/company/follow  body: { company_slug }  → follow
// DELETE /api/company/follow  body: { company_slug }  → unfollow

type GetIdsResult =
  | { error: string; status: number }
  | { myProfileId: string; companyId: string; companyOwnerId: string }

async function getIds(authClient: ReturnType<typeof createAuthServerClient>, companySlug: string): Promise<GetIdsResult> {
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { error: 'Unauthorized', status: 401 }

  const supabase = createServerClient()
  const [{ data: myProfile }, { data: company }] = await Promise.all([
    supabase.from('profiles').select('id').eq('user_id', user.id).single(),
    supabase.from('companies').select('id, user_id').eq('slug', companySlug).single(),
  ])

  if (!myProfile || !company) return { error: 'Company not found', status: 404 }

  return { myProfileId: myProfile.id as string, companyId: company.id as string, companyOwnerId: company.user_id as string }
}

export async function POST(request: NextRequest) {
  const authClient = createAuthServerClient()
  const { company_slug } = await request.json()
  if (!company_slug) return NextResponse.json({ error: 'company_slug required' }, { status: 400 })

  const ids = await getIds(authClient, company_slug)
  if ('error' in ids) return NextResponse.json({ error: ids.error }, { status: ids.status })

  const supabase = createServerClient()

  const { error } = await supabase
    .from('company_follows')
    .upsert({ follower_id: ids.myProfileId, company_id: ids.companyId }, { onConflict: 'follower_id,company_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify company owner (if different from follower)
  if (ids.companyOwnerId) {
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', ids.companyOwnerId)
      .single()
    if (ownerProfile && ownerProfile.id !== ids.myProfileId) {
      await supabase.from('notifications').insert({
        recipient_id: ownerProfile.id,
        type: 'company_follow',
        actor_id: ids.myProfileId,
      })
    }
  }

  return NextResponse.json({ following: true })
}

export async function DELETE(request: NextRequest) {
  const authClient = createAuthServerClient()
  const { company_slug } = await request.json()
  if (!company_slug) return NextResponse.json({ error: 'company_slug required' }, { status: 400 })

  const ids = await getIds(authClient, company_slug)
  if ('error' in ids) return NextResponse.json({ error: ids.error }, { status: ids.status })

  const supabase = createServerClient()

  const { error } = await supabase
    .from('company_follows')
    .delete()
    .eq('follower_id', ids.myProfileId)
    .eq('company_id', ids.companyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ following: false })
}
