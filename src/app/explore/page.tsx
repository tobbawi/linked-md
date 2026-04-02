import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import type { Post, Profile } from '@/types'
import { renderWikilinks } from '@/lib/wikilinks'

export const revalidate = 30 // ISR: revalidate every 30 seconds (high-traffic page)

type PostWithProfile = Post & { profile: Pick<Profile, 'slug' | 'display_name' | 'avatar_url'> | null }

function postPreview(content: string, limit = 280): string {
  const stripped = content.replace(/^#.*$/m, '').replace(/\[\[.*?\]\]/g, '').trim()
  return stripped.length > limit ? stripped.slice(0, limit) + '…' : stripped
}

export default async function ExplorePage() {
  const supabase = createServerClient()

  const { data: posts } = await supabase
    .from('posts')
    .select('*, profile:profiles!profile_id(slug, display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(50)
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
          Explore
        </h1>
        <p className="text-[13px] text-muted mt-[4px]">
          Recent posts from across the network
        </p>
      </div>

      {allPosts.length === 0 ? (
        <div className="text-center py-3xl text-muted">
          <p className="text-[15px]">No posts yet. Be the first to write something.</p>
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
                {/* Author */}
                {post.profile && (
                  <Link
                    href={`/profile/${post.profile.slug}`}
                    className="inline-flex items-center gap-xs mb-sm"
                  >
                    <Avatar name={post.profile.display_name} avatarUrl={post.profile.avatar_url} size={24} />
                    <span className="text-[13px] font-medium text-ink">
                      {post.profile.display_name}
                    </span>
                  </Link>
                )}

                {/* Title */}
                {post.title && (
                  <Link href={post.profile ? `/profile/${post.profile.slug}/post/${post.slug}` : '#'}>
                    <h2 className="font-serif text-[1.1rem] text-ink mb-xs leading-[1.3]">
                      {post.title}
                    </h2>
                  </Link>
                )}

                {/* Preview */}
                <p
                  className="prose text-[14px] text-secondary leading-[1.5] mb-sm"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />

                {/* Footer */}
                <div className="flex items-center justify-between mt-sm">
                  <span className="md-url text-[11px]">
                    {post.profile && `/profile/${post.profile.slug}/post/`}{post.slug}.md
                  </span>
                  <div className="flex gap-xs flex-wrap">
                    {(post.tags ?? []).map((tag) => (
                      <Link
                        key={tag}
                        href={`/tag/${encodeURIComponent(tag)}`}
                        className="text-[11px] text-primary bg-primary-light py-[2px] px-[8px] rounded-sm"
                      >
                        #{tag}
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
