import Link from 'next/link'
import { createServerClient } from '@/lib/supabase'
import { renderWikilinks, extractWikilinks, toSlug } from '@/lib/wikilinks'
import type { Profile, Post } from '@/types'

interface PageProps {
  params: { name: string }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '…'
}

function postPreview(post: Post): string {
  const raw = post.title ?? post.content
  // Strip markdown syntax for preview
  const stripped = raw
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
  return truncate(stripped, 140)
}

export default async function ProfilePage({ params }: PageProps) {
  const { name } = params

  const supabase = createServerClient()

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', name)
    .single<Profile>()

  if (!profile) {
    return (
      <div
        style={{
          padding: 'var(--space-3xl) var(--space-md)',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.5rem',
            color: 'var(--color-ink)',
            marginBottom: 'var(--space-sm)',
          }}
        >
          Profile not found.
        </h1>
        <p style={{ color: 'var(--color-secondary)', fontSize: '15px' }}>
          Search for someone?{' '}
          <Link
            href="/"
            style={{ color: 'var(--color-primary)', fontWeight: 500 }}
          >
            Go to feed →
          </Link>
        </p>
      </div>
    )
  }

  // Fetch posts (newest first)
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })
    .returns<Post[]>()

  const allPosts = posts ?? []

  // Fetch all profile slugs for wikilink resolution
  const { data: profileSlugs } = await supabase
    .from('profiles')
    .select('slug')
  const resolvedSlugs = new Set<string>(
    (profileSlugs ?? []).map((p: { slug: string }) => p.slug)
  )

  // Collect outbound wikilinks from profile content
  const profileWikilinks = profile.content
    ? extractWikilinks(profile.content)
    : []
  const outboundLinks = Array.from(
    new Set(profileWikilinks.map((n) => JSON.stringify({ name: n, slug: toSlug(n) })))
  ).map((s) => JSON.parse(s) as { name: string; slug: string })

  return (
    <div style={{ padding: 'var(--space-xl) 0' }}>
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-xl)',
          alignItems: 'flex-start',
        }}
      >
        {/* Left column — profile card */}
        <aside
          style={{
            width: '240px',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              position: 'sticky',
              top: '72px',
            }}
          >
            {/* Avatar placeholder */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-primary-light)',
                border: '2px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--color-primary)',
                fontFamily: 'var(--font-serif)',
                marginBottom: 'var(--space-md)',
              }}
            >
              {profile.display_name.charAt(0).toUpperCase()}
            </div>

            {/* Display name */}
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.125rem',
                color: 'var(--color-ink)',
                lineHeight: 1.3,
                marginBottom: profile.bio ? 'var(--space-sm)' : 'var(--space-md)',
              }}
            >
              {profile.display_name}
            </h1>

            {/* Bio */}
            {profile.bio && (
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--color-secondary)',
                  lineHeight: 1.5,
                  marginBottom: 'var(--space-md)',
                }}
              >
                {profile.bio}
              </p>
            )}

            {/* Badges */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-xs)',
                marginBottom: outboundLinks.length > 0 ? 'var(--space-md)' : 0,
              }}
            >
              <a
                href={`/profile/${name}/llm.txt`}
                className="llm-badge"
                style={{ alignSelf: 'flex-start' }}
                title="AI-readable profile"
              >
                llm.txt available
              </a>
              <span className="md-url" style={{ alignSelf: 'flex-start' }}>
                /profile/{name}.md
              </span>
            </div>

            {/* Outbound wikilinks */}
            {outboundLinks.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--color-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 'var(--space-xs)',
                  }}
                >
                  Links to
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                  {outboundLinks.map(({ name: linkName, slug: linkSlug }) =>
                    resolvedSlugs.has(linkSlug) ? (
                      <Link
                        key={linkSlug}
                        href={`/profile/${linkSlug}`}
                        className="wikilink-resolved"
                        style={{ fontSize: '12px' }}
                      >
                        {linkName}
                      </Link>
                    ) : (
                      <span
                        key={linkSlug}
                        className="wikilink-unresolved"
                        style={{ fontSize: '12px' }}
                        title="Profile not found"
                      >
                        {linkName}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right column — posts */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {allPosts.length === 0 ? (
            <p
              style={{
                color: 'var(--color-muted)',
                fontSize: '15px',
                paddingTop: 'var(--space-lg)',
              }}
            >
              No posts yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {allPosts.map((post) => {
                const postWikilinksHtml = renderWikilinks(
                  postPreview(post),
                  resolvedSlugs
                )
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
                    {/* Post title or preview */}
                    {post.title && (
                      <h2
                        style={{
                          fontFamily: 'var(--font-serif)',
                          fontSize: '1.125rem',
                          color: 'var(--color-ink)',
                          marginBottom: 'var(--space-xs)',
                          lineHeight: 1.35,
                        }}
                      >
                        {post.title}
                      </h2>
                    )}

                    <p
                      className="prose"
                      style={{
                        fontSize: '15px',
                        color: 'var(--color-text)',
                        lineHeight: 1.6,
                        marginBottom: 'var(--space-md)',
                      }}
                      dangerouslySetInnerHTML={{ __html: postWikilinksHtml }}
                    />

                    {/* Footer */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 'var(--space-sm)',
                      }}
                    >
                      <time
                        dateTime={post.created_at}
                        style={{
                          fontSize: '13px',
                          color: 'var(--color-muted)',
                        }}
                      >
                        {formatDate(post.created_at)}
                      </time>
                      <span className="md-url">
                        /profile/{name}/post/{post.slug}.md
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </main>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 767px) {
          .profile-layout { flex-direction: column !important; }
          .profile-sidebar { width: 100% !important; position: static !important; }
        }
      `}</style>
    </div>
  )
}
