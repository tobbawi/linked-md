import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

const PAGE_SIZE = 100
const SLUG_RE = /^[a-z0-9-]+$/

/** Escape markdown-significant chars to prevent injection in LLM-consumed output */
function escapeMd(s: string): string {
  return s.replace(/[#\[\]*_`~>|\n\r\\]/g, (c) => (c === '\n' || c === '\r' ? ' ' : `\\${c}`))
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const rawCursor = searchParams.get('cursor')
  const cursor = rawCursor && SLUG_RE.test(rawCursor) ? rawCursor : null
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://linked.md'

  const supabase = createServerClient()

  let query = supabase
    .from('profiles')
    .select('slug, display_name, title, location')
    .order('slug', { ascending: true })
    .limit(PAGE_SIZE + 1)

  if (cursor) {
    query = query.gt('slug', cursor)
  }

  const { data, error } = await query

  if (error) {
    return new NextResponse(`Error: ${error.message}`, { status: 500 })
  }

  const profiles = data ?? []
  const hasNext = profiles.length > PAGE_SIZE
  const page = hasNext ? profiles.slice(0, PAGE_SIZE) : profiles
  const nextCursor = hasNext ? page[page.length - 1].slug : null

  const lines: string[] = [
    '# linked.md — Profile Directory',
    '',
  ]

  if (cursor) {
    lines.push(`> Page cursor: ${cursor}`)
  }
  if (nextCursor) {
    lines.push(`> Next: ${baseUrl}/network/profiles/llm.txt?cursor=${nextCursor}`)
  }
  if (cursor || nextCursor) {
    lines.push('')
  }

  lines.push('## Profiles', '')

  for (const p of page) {
    const details = [p.title, p.location].filter(Boolean).map(escapeMd).join(', ')
    const suffix = details ? ` — ${details}` : ''
    lines.push(`- **${escapeMd(p.display_name)}**${suffix}`)
    lines.push(`  ${baseUrl}/profile/${p.slug}/llm.txt | ${baseUrl}/profile/${p.slug}/llm-full.txt`)
    lines.push('')
  }

  if (page.length === 0) {
    lines.push('No profiles found.', '')
  }

  const headers: Record<string, string> = {
    'Content-Type': 'text/markdown; charset=utf-8',
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300',
  }

  if (nextCursor) {
    headers['Link'] = `<${baseUrl}/network/profiles/llm.txt?cursor=${nextCursor}>; rel="next"`
  }

  return new NextResponse(lines.join('\n'), { headers })
}
