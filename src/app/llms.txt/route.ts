import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://linked.md'

  const content = `# linked.md

An open professional network where every profile, post, and company is a markdown file.
Open. Portable. AI-readable.

> Every profile has a machine-readable URL. No API key required.

## How to read a profile

- Summary: ${baseUrl}/profile/{slug}/llm.txt
- Full profile: ${baseUrl}/profile/{slug}/llm-full.txt
- Connection graph: ${baseUrl}/profile/{slug}/graph.json
- Raw markdown: ${baseUrl}/profile/{slug}.md

## How to read a company

- Summary: ${baseUrl}/company/{slug}/llm.txt
- Full company: ${baseUrl}/company/{slug}/llm-full.txt
- Raw markdown: ${baseUrl}/company/{slug}.md

## Browse the network

- [All profiles](${baseUrl}/network/profiles/llm.txt) — paginated directory (cursor-based, 100 per page)
- [All companies](${baseUrl}/network/companies/llm.txt) — paginated directory

## Search

- [Search](${baseUrl}/api/search?q=QUERY&format=llm) — full-text search across profiles, companies, posts
- Returns text/markdown when format=llm, application/json otherwise
`

  return new NextResponse(content, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=3600',
    },
  })
}
