import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import type { Post, Profile } from '@/types'
import { renderWikilinks } from '@/lib/wikilinks'

type PostWithProfile = Post & { profile: Pick<Profile, 'slug' | 'display_name'> | null }

function postPreview(content: string, limit = 240): string {
  const stripped = content.replace(/^#.*$/m, '').replace(/\[\[.*?\]\]/g, '').trim()
  return stripped.length > limit ? stripped.slice(0, limit) + '…' : stripped
}

export async function generateMetadata({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag)
  return { title: `#${tag} — linked.md` }
}

export default async function TagPage({ params }: { params: { tag: string } }) {
  const tag = decodeURIComponent(params.tag)
  const supabase = createServerClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('*, profile:profiles!profile_id(slug, display_name)')
    .contains('tags', [tag])
    .order('created_at', { ascending: false })
    .returns<PostWithProfile[]>()

  const { data: profileSlugsData } = await supabase.from('profiles').select('slug')
  const { data: companySlugsData } = await supabase.from('companies').select('slug')
  const profileSlugs = new Set<string>((profileSlugsData ?? []).map((p) => p.slug))
  const companySlugs = new Set<string>((companySlugsData ?? []).map((c) => c.slug))

  const allPosts = posts ?? []

  return (
    <div className="pt-xl pb-3xl">
      <div className="pb-lg border-b border-border mb-lg">
        <h1 className="font-serif text-[1.25rem] text-ink">
          #{tag}
        </h1>
        <p className="text-[13px] text-muted mt-[4px]">
          {allPosts.length} {allPosts.length === 1 ? 'post' : 'posts'}
        </p>
      </div>

      {allPosts.length === 0 ? (
        <div className="text-center py-3xl text-muted">
          <p className="text-[15px]">No posts tagged #{tag} yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          {allPosts.map((post) => {
            const preview = postPreview(post.markdown_content)
            const previewHtml = renderWikilinks(preview, profileSlugs, companySlugs)
            return (
              <article
                key={post.id}
                className="bg-card border border-border rounded-md p-lg"
              >
                {post.profile && (
                  <Link
                    href={`/profile/${post.profile.slug}`}
                    className="inline-flex items-center gap-xs mb-sm"
                  >
                    <div className="w-[24px] h-[24px] rounded-full bg-primary-light border border-primary flex items-center justify-center text-[11px] font-bold text-primary shrink-0">
                      {post.profile.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[13px] font-medium text-ink">
                      {post.profile.display_name}
                    </span>
                  </Link>
                )}

                {post.title && (
                  <Link
                    href={post.profile ? `/profile/${post.profile.slug}/post/${post.slug}` : '#'}
                  >
                    <h2 className="font-serif text-[1.1rem] text-ink mb-xs leading-[1.3]">
                      {post.title}
                    </h2>
                  </Link>
                )}

                <p
                  className="text-[14px] text-secondary leading-[1.5] mb-sm"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />

                <div className="flex items-center justify-between mt-sm">
                  <span className="md-url text-[11px]">
                    {post.slug}.md
                  </span>
                  <div className="flex gap-xs flex-wrap">
                    {(post.tags ?? []).map((t) => (
                      <Link
                        key={t}
                        href={`/tag/${encodeURIComponent(t)}`}
                        className="text-[11px] py-[2px] px-[8px] rounded-sm"
                        style={{
                          color: t === tag ? 'var(--color-bg)' : 'var(--color-primary)',
                          background: t === tag ? 'var(--color-primary)' : 'var(--color-primary-light)',
                        }}
                      >
                        #{t}
                      </Link>
                    ))}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
