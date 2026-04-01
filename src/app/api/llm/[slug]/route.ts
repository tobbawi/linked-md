import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { buildLlmTxt } from '@/lib/exports'
import type { Profile, ExperienceEntry } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', params.slug)
    .single<Profile>()

  if (!profile) {
    return new NextResponse('Profile not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const [{ data: experienceRows }, { count: followerCount }, { count: followingCount }] =
    await Promise.all([
      supabase
        .from('experience')
        .select('*')
        .eq('profile_id', profile.id)
        .order('sort_order', { ascending: true })
        .returns<ExperienceEntry[]>(),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('followee_id', profile.id),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profile.id),
    ])

  const txt = buildLlmTxt(
    profile,
    experienceRows ?? [],
    {
      followerCount: followerCount ?? undefined,
      followingCount: followingCount ?? undefined,
    }
  )

  return new NextResponse(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
