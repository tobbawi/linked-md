import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { Nav } from '@/components/Nav'
import { createAuthServerClient } from '@/lib/supabase'

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'linked.md — Open Professional Network',
  description:
    'An open professional network where every profile, post, and company is a markdown file. Open. Portable. AI-readable.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user = null
  let profileSlug: string | null = null
  let profileDisplayName: string | null = null
  let profileAvatarUrl: string | null = null

  try {
    const supabase = createAuthServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    user = authUser

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('slug, display_name, avatar_url')
        .eq('user_id', user.id)
        .single()
      profileSlug = profile?.slug ?? null
      profileDisplayName = profile?.display_name ?? null
      profileAvatarUrl = profile?.avatar_url ?? null
    }
  } catch {
    // Supabase not configured — dev mode
  }

  return (
    <html lang="en" className={geistMono.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t){document.documentElement.setAttribute('data-theme',t);}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.setAttribute('data-theme','dark');}})()`,
          }}
        />
      </head>
      <body>
        <Nav user={user} profileSlug={profileSlug} displayName={profileDisplayName} avatarUrl={profileAvatarUrl} />
        <main className="max-w-[1200px] mx-auto px-xl pt-[60px]">
          {children}
        </main>
      </body>
    </html>
  )
}
