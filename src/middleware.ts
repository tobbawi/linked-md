import { NextRequest, NextResponse } from 'next/server'

/**
 * Middleware rewrites:
 *   /profile/[slug].md              → /api/profile/[slug]/md
 *   /profile/[slug]/llm.txt         → /api/profile/[slug]/llm
 *   /profile/[slug]/graph.json      → /api/profile/[slug]/graph
 *   /profile/[slug]/post/[post].md  → /api/post/[slug]/[post]/md
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /profile/[slug].md
  const profileMdMatch = pathname.match(/^\/profile\/([^/]+)\.md$/)
  if (profileMdMatch) {
    const slug = profileMdMatch[1]
    return NextResponse.rewrite(new URL(`/api/profile/${slug}/md`, request.url))
  }

  // /profile/[slug]/llm.txt
  const llmMatch = pathname.match(/^\/profile\/([^/]+)\/llm\.txt$/)
  if (llmMatch) {
    const slug = llmMatch[1]
    return NextResponse.rewrite(new URL(`/api/profile/${slug}/llm`, request.url))
  }

  // /profile/[slug]/graph.json
  const graphMatch = pathname.match(/^\/profile\/([^/]+)\/graph\.json$/)
  if (graphMatch) {
    const slug = graphMatch[1]
    return NextResponse.rewrite(new URL(`/api/profile/${slug}/graph`, request.url))
  }

  // /profile/[slug]/post/[postSlug].md
  const postMdMatch = pathname.match(/^\/profile\/([^/]+)\/post\/([^/]+)\.md$/)
  if (postMdMatch) {
    const [, slug, postSlug] = postMdMatch
    return NextResponse.rewrite(
      new URL(`/api/post/${slug}/${postSlug}/md`, request.url)
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/profile/:path*',
  ],
}
