import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'
import { renderWikilinks } from '@/lib/wikilinks'
import { PostActions } from '@/components/PostActions'
import { LikeButton } from '@/components/LikeButton'
import { RepostButton } from '@/components/RepostButton'
import { CommentsSection } from '@/components/CommentsSection'
import PostViewTracker from '@/components/PostViewTracker'
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

  // Social data: reactions + comments + reposts
  const [{ count: likeCount }, likedRow, { data: rawComments }, { count: repostCount }, repostedRow] = await Promise.all([
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
    supabase.from('reposts').select('*', { count: 'exact', head: true }).eq('original_post_id', post.id),
    viewerProfileId
      ? supabase.from('reposts').select('id').eq('original_post_id', post.id).eq('profile_id', viewerProfileId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const isLiked = !!likedRow.data
  const isReposted = !!repostedRow.data
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
    <div className="pt-xl pb-3xl">
      <PostViewTracker postId={post.id} />
      <div className="max-w-[680px] border-l-2 border-border pl-lg">
        {/* Back to profile */}
        <div className="flex items-center justify-between mb-xl">
          <Link
            href={`/profile/${profile.slug}`}
            className="text-[13px] text-secondary"
          >
            ← {profile.display_name}
          </Link>

          {isOwner && (
            <PostActions postSlug={post.slug} profileSlug={profile.slug} />
          )}
        </div>

        {/* Post header */}
        <header className="mb-xl">
          {post.title && (
            <h1 className="font-serif text-[2rem] text-ink leading-[1.25] mb-md">
              {post.title}
            </h1>
          )}

          <div className="flex items-center gap-md flex-wrap">
            <Link
              href={`/profile/${profile.slug}`}
              className="text-[14px] font-medium text-text"
            >
              {profile.display_name}
            </Link>
            <time
              dateTime={post.created_at}
              className="text-[13px] text-muted"
            >
              {formatDate(post.created_at)}
            </time>
            <a href={mdUrl} className="md-url text-[12px]" title="Raw markdown">
              {mdUrl}
            </a>
          </div>
        </header>

        {/* Post body */}
        <article
          className="prose text-[16px] leading-[1.75] text-text"
          dangerouslySetInnerHTML={{ __html: contentHtml }}
        />

        {/* Like + Repost buttons */}
        <div className="mt-xl flex items-center gap-md">
          <LikeButton postId={post.id} initialLiked={isLiked} likeCount={likeCount ?? 0} />
          <RepostButton
            postId={post.id}
            postAuthorProfileId={profile.id}
            myProfileId={viewerProfileId}
            initialReposted={isReposted}
            repostCount={repostCount ?? 0}
          />
        </div>

        {/* Comments */}
        <CommentsSection
          postId={post.id}
          initialComments={comments}
          myProfileSlug={viewerProfileSlug}
        />

        {/* Footer */}
        <footer className="mt-3xl pt-lg border-t border-border flex items-center justify-between flex-wrap gap-sm">
          <Link
            href={`/profile/${profile.slug}`}
            className="flex items-center gap-sm text-[14px] text-text"
          >
            <div className="w-[36px] h-[36px] rounded-full bg-primary-light border border-primary flex items-center justify-center text-[14px] font-bold text-primary font-serif shrink-0">
              {profile.display_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium">{profile.display_name}</div>
              {profile.bio && (
                <div className="text-[12px] text-muted">
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
