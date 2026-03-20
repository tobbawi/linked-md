/**
 * Middleware: rewrite extension-based URLs to API handlers
 *
 * URL routing table:
 *   /profile/name.md          → /api/raw/profile/name
 *   /profile/name/llm.txt     → /api/llm/name
 *   /profile/name/llm-full.txt → /api/llm-full/name
 *   /profile/name/graph.json  → /api/graph/name
 *   /profile/name/post/slug.md → /api/raw/post/name/slug
 *
 * The web UI reads from Supabase (strongly consistent).
 * These endpoints serve from the local filesystem exports (M1) or
 * Cloudflare R2 (M2). Max ~60s lag for social data; immediate for content.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /profile/name.md → /api/raw/profile/name
  const profileMdMatch = pathname.match(/^\/profile\/([^/]+)\.md$/)
  if (profileMdMatch) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/raw/profile/${profileMdMatch[1]}`
    return NextResponse.rewrite(url)
  }

  // /profile/name/post/slug.md → /api/raw/post/name/slug
  const postMdMatch = pathname.match(/^\/profile\/([^/]+)\/post\/([^/]+)\.md$/)
  if (postMdMatch) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/raw/post/${postMdMatch[1]}/${postMdMatch[2]}`
    return NextResponse.rewrite(url)
  }

  // /profile/name/llm.txt → /api/llm/name
  const llmTxtMatch = pathname.match(/^\/profile\/([^/]+)\/llm\.txt$/)
  if (llmTxtMatch) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/llm/${llmTxtMatch[1]}`
    return NextResponse.rewrite(url)
  }

  // /profile/name/llm-full.txt → /api/llm-full/name
  const llmFullMatch = pathname.match(/^\/profile\/([^/]+)\/llm-full\.txt$/)
  if (llmFullMatch) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/llm-full/${llmFullMatch[1]}`
    return NextResponse.rewrite(url)
  }

  // /profile/name/graph.json → /api/graph/name
  const graphJsonMatch = pathname.match(/^\/profile\/([^/]+)\/graph\.json$/)
  if (graphJsonMatch) {
    const url = request.nextUrl.clone()
    url.pathname = `/api/graph/${graphJsonMatch[1]}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/profile/:path*',
  ],
}
