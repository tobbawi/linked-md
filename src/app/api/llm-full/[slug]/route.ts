import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { buildLlmFullTxt } from '@/lib/exports'
import type { Post, Profile, ExperienceEntry, EducationEntry, ProfileSkill, Recommendation, Repost } from '@/types'

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

  const [
    { data: posts },
    { data: experienceRows },
    { data: educationRows },
    { data: skillRows },
    { data: recommendationRows },
    { count: followerCount },
    { count: followingCount },
    { data: repostRows },
  ] = await Promise.all([
    supabase
      .from('posts')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .returns<Post[]>(),
    supabase
      .from('experience')
      .select('*')
      .eq('profile_id', profile.id)
      .order('sort_order', { ascending: true })
      .returns<ExperienceEntry[]>(),
    supabase
      .from('education_entries')
      .select('*')
      .eq('profile_id', profile.id)
      .order('sort_order', { ascending: true })
      .returns<EducationEntry[]>(),
    supabase
      .from('profile_skills')
      .select('id, profile_id, name, sort_order')
      .eq('profile_id', profile.id)
      .order('sort_order', { ascending: true })
      .returns<ProfileSkill[]>(),
    supabase
      .from('recommendations')
      .select('*, author:profiles!recommendations_author_id_fkey(slug, display_name)')
      .eq('recipient_id', profile.id)
      .eq('visible', true)
      .order('created_at', { ascending: false })
      .returns<Recommendation[]>(),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('followee_id', profile.id),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profile.id),
    supabase
      .from('reposts')
      .select('*, post:posts!original_post_id(slug, title, profile:profiles!profile_id(slug, display_name))')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const txt = buildLlmFullTxt(profile, {
    posts: posts ?? [],
    experience: experienceRows ?? [],
    education: educationRows ?? [],
    skills: skillRows ?? [],
    recommendations: recommendationRows ?? [],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reposts: (repostRows ?? []) as any[],
    stats: {
      followerCount: followerCount ?? undefined,
      followingCount: followingCount ?? undefined,
    },
  })

  return new NextResponse(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
