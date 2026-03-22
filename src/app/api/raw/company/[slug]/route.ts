import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { Company } from '@/types'

function buildCompanyMarkdown(company: Company): string {
  const lines: string[] = []
  lines.push(`# ${company.name}`)
  lines.push('')
  if (company.tagline) {
    lines.push(`> ${company.tagline}`)
    lines.push('')
  }
  if (company.website) {
    lines.push(`**Website:** ${company.website}`)
    lines.push('')
  }
  if (company.bio) {
    lines.push(company.bio)
    lines.push('')
  }
  if (company.markdown_content) {
    lines.push(company.markdown_content)
    lines.push('')
  }
  lines.push('---')
  lines.push(`slug: ${company.slug}`)
  lines.push(`created: ${company.created_at}`)
  return lines.join('\n')
}

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
    return new NextResponse('# Company not found\n', {
      status: 404,
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  return new NextResponse(buildCompanyMarkdown(company), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}
