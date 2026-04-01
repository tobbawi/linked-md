import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'

// POST /api/views/profile  body: { profile_slug }
// Tracks a profile view. Skips self-views. Uses SHA-256(IP+UA) for dedup.
export async function POST(request: NextRequest) {
  const { profile_slug } = await request.json()
  if (!profile_slug) return NextResponse.json({ ok: false }, { status: 400 })

  const supabase = createServerClient()

  // Look up the profile being viewed
  const { data: viewedProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', profile_slug)
    .single<{ id: string }>()

  if (!viewedProfile) return NextResponse.json({ ok: false }, { status: 404 })

  // Check if viewer is logged in (suppress self-views)
  let viewerProfileId: string | null = null
  try {
    const authClient = createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (user) {
      const { data: viewerProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single<{ id: string }>()
      if (viewerProfile) {
        // Skip self-view
        if (viewerProfile.id === viewedProfile.id) {
          return NextResponse.json({ ok: true, skipped: 'self' })
        }
        viewerProfileId = viewerProfile.id
      }
    }
  } catch {
    // anonymous viewer — fine
  }

  // Build privacy-preserving hash: SHA-256(IP + UA)
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'
  const ua = request.headers.get('user-agent') ?? 'unknown'
  const raw = `${ip}::${ua}`
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const viewerHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  await supabase.from('profile_views').insert({
    profile_id: viewedProfile.id,
    viewer_profile_id: viewerProfileId,
    viewer_hash: viewerHash,
  })

  return NextResponse.json({ ok: true })
}
