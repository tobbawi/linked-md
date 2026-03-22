import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { buildLlmCompanyTxt } from '@/lib/exports'
import type { Company } from '@/types'

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

  const { count: currentPeopleCount } = await supabase
    .from('experience')
    .select('*', { count: 'exact', head: true })
    .eq('company_slug', company.slug)
    .eq('is_current', true)

  const txt = buildLlmCompanyTxt(company, currentPeopleCount ?? 0)

  return new NextResponse(txt, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
