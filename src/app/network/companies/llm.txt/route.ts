import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const PAGE_SIZE = 100

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const cursor = searchParams.get('cursor')
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://linked.md'

  const supabase = createServerClient()

  let query = supabase
    .from('companies')
    .select('slug, name, tagline')
    .order('slug', { ascending: true })
    .limit(PAGE_SIZE + 1)

  if (cursor) {
    query = query.gt('slug', cursor)
  }

  const { data, error } = await query

  if (error) {
    return new NextResponse(`Error: ${error.message}`, { status: 500 })
  }

  const companies = data ?? []
  const hasNext = companies.length > PAGE_SIZE
  const page = hasNext ? companies.slice(0, PAGE_SIZE) : companies
  const nextCursor = hasNext ? page[page.length - 1].slug : null

  const lines: string[] = [
    '# linked.md — Company Directory',
    '',
  ]

  if (cursor) {
    lines.push(`> Page cursor: ${cursor}`)
  }
  if (nextCursor) {
    lines.push(`> Next: ${baseUrl}/network/companies/llm.txt?cursor=${nextCursor}`)
  }
  if (cursor || nextCursor) {
    lines.push('')
  }

  lines.push('## Companies', '')

  for (const c of page) {
    const suffix = c.tagline ? ` — ${c.tagline}` : ''
    lines.push(`- **${c.name}**${suffix}`)
    lines.push(`  ${baseUrl}/company/${c.slug}/llm.txt | ${baseUrl}/company/${c.slug}/llm-full.txt`)
    lines.push('')
  }

  if (page.length === 0) {
    lines.push('No companies found.', '')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300',
  }

  if (nextCursor) {
    headers['Link'] = `<${baseUrl}/network/companies/llm.txt?cursor=${nextCursor}>; rel="next"`
  }

  return new NextResponse(lines.join('\n'), { headers })
}
