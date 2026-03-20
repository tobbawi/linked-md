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

  try {
    const supabase = createAuthServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    user = authUser

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('slug')
        .eq('user_id', user.id)
        .single()
      profileSlug = profile?.slug ?? null
    }
  } catch {
    // Supabase not configured — dev mode
  }

  return (
    <html lang="en" className={geistMono.variable}>
      <body>
        <Nav user={user} profileSlug={profileSlug} />
        <main
          style={{
            maxWidth: '960px',
            margin: '0 auto',
            padding: '0 var(--space-md)',
          }}
        >
          {children}
        </main>
      </body>
    </html>
  )
}
