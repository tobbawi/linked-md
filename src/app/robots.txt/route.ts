import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://linked.md'

  const body = `# linked.md — an open professional network
# Every profile is a markdown file. We welcome AI agents.

User-agent: *
Allow: /

# AI-specific crawlers: explicitly welcome
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Applebot-Extended
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
      'X-Llms-Txt': '/llms.txt',
    },
  })
}
