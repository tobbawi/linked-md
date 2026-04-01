import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { buildLlmCompanyFullTxt } from '@/lib/exports'
import type { Company, ExperienceEntry, Profile, JobListing, CompanyMember } from '@/types'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = createServerClient()

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', params.slug)
    .single<Company>()

  if (!company) {
    return new NextResponse('Company not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const { data: experienceRows } = await supabase
    .from('experience')
    .select('*, profile:profiles!profile_id(slug, display_name)')
    .eq('company_slug', company.slug)
    .order('is_current', { ascending: false })
    .order('end_year', { ascending: false, nullsFirst: true })

  type ExperienceWithProfile = ExperienceEntry & {
    profile: Pick<Profile, 'slug' | 'display_name'>
  }

  const people = ((experienceRows ?? []) as ExperienceWithProfile[]).map(e => {
    const start = e.start_month
      ? `${e.start_month}/${e.start_year}`
      : `${e.start_year}`
    const period = e.is_current
      ? `${start} – present`
      : e.end_year
        ? e.end_month
          ? `${e.end_month}/${e.end_year}`
          : `${start} – ${e.end_year}`
        : start
    return {
      display_name: e.profile.display_name,
      slug: e.profile.slug,
      title: e.title,
      is_current: e.is_current,
      period,
    }
  })

  const { data: jobRows } = await supabase
    .from('job_listings')
    .select('*')
    .eq('company_id', company.id)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .returns<JobListing[]>()

  const { data: memberRows } = await supabase
    .from('company_members')
    .select('profile_id, role, profile:profiles!profile_id(slug, display_name, user_id)')
    .eq('company_id', company.id)
    .order('created_at', { ascending: true })

  type MemberWithProfile = CompanyMember & {
    profile: Pick<Profile, 'slug' | 'display_name' | 'user_id'>
  }

  const admins = ((memberRows ?? []) as unknown as MemberWithProfile[])
    .filter(m => m.profile)
    .map(m => ({
      display_name: m.profile.display_name,
      slug: m.profile.slug,
      role: (m.profile.user_id === company.user_id ? 'owner' : 'admin') as 'owner' | 'admin',
    }))

  const txt = buildLlmCompanyFullTxt(company, people, jobRows ?? [], admins)

  return new NextResponse(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
