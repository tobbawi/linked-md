import { createServerClient } from '@/lib/supabase'
import type { Profile } from '@/types'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { GraphCanvas } from './GraphCanvas'

export async function generateMetadata({ params }: { params: { name: string } }) {
  return { title: `${params.name} — graph — linked.md` }
}

export default async function GraphPage({ params }: { params: { name: string } }) {
  const slug = params.name
  const supabase = createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('slug, display_name')
    .eq('slug', slug)
    .single<Pick<Profile, 'slug' | 'display_name'>>()

  if (!profile) notFound()

  return (
    <div style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-md)',
          paddingBottom: 'var(--space-lg)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        <Link
          href={`/profile/${slug}`}
          style={{ fontSize: '13px', color: 'var(--color-secondary)' }}
        >
          ← {profile.display_name}
        </Link>
        <span style={{ color: 'var(--color-border)' }}>/</span>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.1rem',
            color: 'var(--color-ink)',
          }}
        >
          Graph
        </h1>
      </div>

      <GraphCanvas slug={slug} displayName={profile.display_name} />
    </div>
  )
}
