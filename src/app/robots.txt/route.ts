import { NextResponse } from 'next/server'

const ROBOTS_TXT = `# linked.md — an open professional network
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

Sitemap: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://linked.md'}/sitemap.xml
`

export async function GET() {
  return new NextResponse(ROBOTS_TXT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=86400',
      'X-Llms-Txt': '/llms.txt',
    },
  })
}
