import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { Company, Profile } from '@/types'

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

  // Fetch employees: profiles whose company_links includes this slug
  const { data: employees } = await supabase
    .from('profiles')
    .select('slug, display_name, bio')
    .contains('company_links', [company.slug])
    .returns<Pick<Profile, 'slug' | 'display_name' | 'bio'>[]>()

  const lines: string[] = []
  lines.push(`# ${company.name} — linked.md company profile`)
  lines.push('')
  if (company.tagline) {
    lines.push(company.tagline)
    lines.push('')
  }
  if (company.website) {
    lines.push(`Website: ${company.website}`)
    lines.push('')
  }
  if (company.bio) {
    lines.push(`## About`)
    lines.push(company.bio)
    lines.push('')
  }
  if (company.markdown_content) {
    lines.push(company.markdown_content)
    lines.push('')
  }
  if (employees && employees.length > 0) {
    lines.push(`## People`)
    for (const e of employees) {
      lines.push(`- ${e.display_name} (/profile/${e.slug})${e.bio ? ' — ' + e.bio : ''}`)
    }
    lines.push('')
  }

  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
