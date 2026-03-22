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
    <div style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
      <div
        style={{
          paddingBottom: 'var(--space-lg)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.25rem',
            color: 'var(--color-ink)',
          }}
        >
          #{tag}
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginTop: '4px' }}>
          {allPosts.length} {allPosts.length === 1 ? 'post' : 'posts'}
        </p>
      </div>

      {allPosts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl) 0', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '15px' }}>No posts tagged #{tag} yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {allPosts.map((post) => {
            const preview = postPreview(post.markdown_content)
            const previewHtml = renderWikilinks(preview, profileSlugs, companySlugs)
            return (
              <article
                key={post.id}
                style={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-lg)',
                }}
              >
                {post.profile && (
                  <Link
                    href={`/profile/${post.profile.slug}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 'var(--space-xs)',
                      marginBottom: 'var(--space-sm)',
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--color-primary-light)',
                        border: '1px solid var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        flexShrink: 0,
                      }}
                    >
                      {post.profile.display_name.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-ink)' }}>
                      {post.profile.display_name}
                    </span>
                  </Link>
                )}

                {post.title && (
                  <Link
                    href={post.profile ? `/profile/${post.profile.slug}/post/${post.slug}` : '#'}
                  >
                    <h2
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontSize: '1.1rem',
                        color: 'var(--color-ink)',
                        marginBottom: 'var(--space-xs)',
                        lineHeight: 1.3,
                      }}
                    >
                      {post.title}
                    </h2>
                  </Link>
                )}

                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--color-secondary)',
                    lineHeight: 1.5,
                    marginBottom: 'var(--space-sm)',
                  }}
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'var(--space-sm)',
                  }}
                >
                  <span className="md-url" style={{ fontSize: '11px' }}>
                    {post.slug}.md
                  </span>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                    {(post.tags ?? []).map((t) => (
                      <Link
                        key={t}
                        href={`/tag/${encodeURIComponent(t)}`}
                        style={{
                          fontSize: '11px',
                          color: t === tag ? 'var(--color-bg)' : 'var(--color-primary)',
                          background: t === tag ? 'var(--color-primary)' : 'var(--color-primary-light)',
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
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
