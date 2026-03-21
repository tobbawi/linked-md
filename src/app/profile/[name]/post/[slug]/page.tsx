import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'
import { renderWikilinks } from '@/lib/wikilinks'
import { PostActions } from '@/components/PostActions'
import { LikeButton } from '@/components/LikeButton'
import { CommentsSection } from '@/components/CommentsSection'
import type { Profile, Post, Comment } from '@/types'

interface PageProps {
  params: { name: string; slug: string }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('slug, display_name, bio')
    .eq('slug', params.name)
    .single<Pick<Profile, 'slug' | 'display_name' | 'bio'>>()

  if (!profile) return { title: 'Post not found — linked.md' }

  const { data: post } = await supabase
    .from('posts')
    .select('title, markdown_content')
    .eq('slug', params.slug)
    .single<Pick<Post, 'title' | 'markdown_content'>>()

  if (!post) return { title: 'Post not found — linked.md' }

  const title = post.title
    ? `${post.title} — ${profile.display_name}`
    : `${profile.display_name} on linked.md`
  const description = post.markdown_content
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .trim()
    .slice(0, 160)

  return {
    title: `${title} — linked.md`,
    description,
    openGraph: {
      title,
      description,
      url: `https://linked.md/profile/${profile.slug}/post/${params.slug}`,
      type: 'article',
    },
  }
}

export default async function PostPage({ params }: PageProps) {
  const supabase = createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', params.name)
    .single<Profile>()

  if (!profile) notFound()

  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('slug', params.slug)
    .single<Post>()

  if (!post) notFound()

  // Check ownership + viewer identity
  let isOwner = false
  let viewerProfileSlug: string | null = null
  let viewerProfileId: string | null = null
  try {
    const authClient = createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    isOwner = !!user && user.id === profile.user_id
    if (user) {
      const { data: vp } = await supabase
        .from('profiles')
        .select('id, slug')
        .eq('user_id', user.id)
        .single<Pick<Profile, 'id' | 'slug'>>()
      viewerProfileId = vp?.id ?? null
      viewerProfileSlug = vp?.slug ?? null
    }
  } catch {
    // not logged in
  }

  // Social data: reactions + comments
  const [{ count: likeCount }, likedRow, { data: rawComments }] = await Promise.all([
    supabase.from('reactions').select('*', { count: 'exact', head: true }).eq('post_id', post.id).eq('type', 'like'),
    viewerProfileId
      ? supabase.from('reactions').select('id').eq('post_id', post.id).eq('profile_id', viewerProfileId).eq('type', 'like').maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('comments')
      .select('*, profile:profiles!profile_id(slug, display_name)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
      .returns<Comment[]>(),
  ])

  const isLiked = !!likedRow.data
  const comments = rawComments ?? []

  // Resolve wikilinks
  const [{ data: profileSlugs }, { data: companySlugsData }] = await Promise.all([
    supabase.from('profiles').select('slug'),
    supabase.from('companies').select('slug'),
  ])
  const resolvedSlugs = new Set<string>(
    (profileSlugs ?? []).map((p: { slug: string }) => p.slug)
  )
  const resolvedCompanySlugs = new Set<string>(
    (companySlugsData ?? []).map((c: { slug: string }) => c.slug)
  )

  // Render markdown server-side
  const { remark } = await import('remark')
  const remarkRehype = (await import('remark-rehype')).default
  const rehypeSanitize = (await import('rehype-sanitize')).default
  const rehypeStringify = (await import('rehype-stringify')).default
  const withWikilinks = renderWikilinks(post.markdown_content, resolvedSlugs, resolvedCompanySlugs)
  const result = await remark().use(remarkRehype).use(rehypeSanitize).use(rehypeStringify).process(withWikilinks)
  const contentHtml = String(result)

  const mdUrl = `/profile/${profile.slug}/post/${post.slug}.md`

  return (
    <div style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
      <div style={{ maxWidth: '680px' }}>
        {/* Back to profile */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <Link
            href={`/profile/${profile.slug}`}
            style={{
              fontSize: '13px',
              color: 'var(--color-secondary)',
            }}
          >
            ← {profile.display_name}
          </Link>

          {isOwner && (
            <PostActions postSlug={post.slug} profileSlug={profile.slug} />
          )}
        </div>

        {/* Post header */}
        <header style={{ marginBottom: 'var(--space-xl)' }}>
          {post.title && (
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '2rem',
                color: 'var(--color-ink)',
                lineHeight: 1.25,
                marginBottom: 'var(--space-md)',
              }}
            >
              {post.title}
            </h1>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-md)',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href={`/profile/${profile.slug}`}
              style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text)' }}
            >
              {profile.display_name}
            </Link>
            <time
              dateTime={post.created_at}
              style={{ fontSize: '13px', color: 'var(--color-muted)' }}
            >
              {formatDate(post.created_at)}
            </time>
            <a href={mdUrl} className="md-url" style={{ fontSize: '12px' }} title="Raw markdown">
              {mdUrl}
            </a>
          </div>
        </header>

        {/* Post body */}
        <article
          className="prose"
          style={{ fontSize: '16px', lineHeight: 1.75, color: 'var(--color-text)' }}
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {/* Like button */}
        <div style={{ marginTop: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <LikeButton postId={post.id} initialLiked={isLiked} likeCount={likeCount ?? 0} />
        </div>

        {/* Comments */}
        <CommentsSection
          postId={post.id}
          initialComments={comments}
          myProfileSlug={viewerProfileSlug}
        />

        {/* Footer */}
        <footer
          style={{
            marginTop: 'var(--space-3xl)',
            paddingTop: 'var(--space-lg)',
            borderTop: '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-sm)',
          }}
        >
          <Link
            href={`/profile/${profile.slug}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-sm)',
              fontSize: '14px',
              color: 'var(--color-text)',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-primary-light)',
                border: '1px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 700,
                color: 'var(--color-primary)',
                fontFamily: 'var(--font-serif)',
                flexShrink: 0,
              }}
            >
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 500 }}>{profile.display_name}</div>
              {profile.bio && (
                <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                  {profile.bio}
                </div>
              )}
            </div>
          </Link>

          <a href={mdUrl} className="llm-badge" title="Raw markdown source">
            view .md source
          </a>
        </footer>
      </div>
    </div>
  )
}
