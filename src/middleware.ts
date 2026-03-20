import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // --- URL rewrites for .md / llm.txt / llm-full.txt / graph.json ---

  const profileMdMatch = pathname.match(/^\/profile\/([^/]+)\.md$/)
  if (profileMdMatch) {
    return NextResponse.rewrite(new URL(`/api/raw/profile/${profileMdMatch[1]}`, request.url))
  }

  const postMdMatch = pathname.match(/^\/profile\/([^/]+)\/post\/([^/]+)\.md$/)
  if (postMdMatch) {
    return NextResponse.rewrite(new URL(`/api/raw/post/${postMdMatch[1]}/${postMdMatch[2]}`, request.url))
  }

  const llmMatch = pathname.match(/^\/profile\/([^/]+)\/llm\.txt$/)
  if (llmMatch) {
    return NextResponse.rewrite(new URL(`/api/llm/${llmMatch[1]}`, request.url))
  }

  const llmFullMatch = pathname.match(/^\/profile\/([^/]+)\/llm-full\.txt$/)
  if (llmFullMatch) {
    return NextResponse.rewrite(new URL(`/api/llm-full/${llmFullMatch[1]}`, request.url))
  }

  const graphMatch = pathname.match(/^\/profile\/([^/]+)\/graph\.json$/)
  if (graphMatch) {
    return NextResponse.rewrite(new URL(`/api/graph/${graphMatch[1]}`, request.url))
  }

  // --- Refresh Supabase session on every non-rewrite request ---
  // Required by @supabase/ssr — keeps auth cookies fresh so server
  // components always see the correct auth state.
  // Do NOT add logic between createServerClient and getUser().

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
