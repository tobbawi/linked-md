import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { JobListing } from '@/types'

export async function GET(
  _req: Request,
  { params }: { params: { 'company-slug': string } }
) {
  const supabase = createServerClient()
  const companySlug = params['company-slug']

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', companySlug)
    .single()

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  const { data: jobs } = await supabase
    .from('job_listings')
    .select('*')
    .eq('company_id', company.id)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .returns<JobListing[]>()

  return NextResponse.json(
    { jobs: jobs ?? [] },
    { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
  )
}
