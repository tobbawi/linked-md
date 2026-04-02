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
    <div className="pt-xl pb-3xl">
      <div className="flex items-center gap-md pb-lg border-b border-border mb-lg">
        <Link
          href={`/profile/${slug}`}
          className="text-[13px] text-secondary"
        >
          ← {profile.display_name}
        </Link>
        <span className="text-border">/</span>
        <h1 className="font-serif text-[1.25rem] text-ink">
          Graph
        </h1>
      </div>

      <GraphCanvas slug={slug} displayName={profile.display_name} />
    </div>
  )
}
