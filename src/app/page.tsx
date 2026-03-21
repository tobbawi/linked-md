import Link from 'next/link'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import type { Post, Profile } from '@/types'

interface FeedPost extends Post {
  profile: Pick<Profile, 'slug' | 'display_name' | 'bio'>
  likeCount?: number
  commentCount?: number
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function postPreview(post: Post): string {
  const raw = post.markdown_content
  const stripped = raw
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
  if (stripped.length <= 160) return stripped
  return stripped.slice(0, 160).trimEnd() + '…'
}

// ── Landing page for logged-out users ──────────────────────────────────────

function LandingHero() {
  return (
    <div
      style={{
        paddingTop: 'var(--space-3xl)',
        paddingBottom: 'var(--space-3xl)',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '2.625rem',
          color: 'var(--color-ink)',
          lineHeight: 1.2,
          marginBottom: 'var(--space-md)',
        }}
      >
        Your profile is a markdown file.
      </h1>
      <p
        style={{
          fontSize: '1.125rem',
          color: 'var(--color-secondary)',
          maxWidth: '480px',
          margin: '0 auto var(--space-xl)',
          lineHeight: 1.6,
        }}
      >
        An open professional network where every profile, post, and company is a{' '}
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
          .md
        </span>{' '}
        file. Open. Portable. AI-readable.
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/auth"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: 'var(--color-primary)',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            fontSize: '15px',
          }}
        >
          Get started
        </Link>
        <Link
          href="/auth?tab=login"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: 'none',
            color: 'var(--color-secondary)',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 500,
            fontSize: '15px',
            border: '1px solid var(--color-border)',
          }}
        >
          Sign in
        </Link>
      </div>

      <div
        style={{
          marginTop: 'var(--space-3xl)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          color: 'var(--color-muted)',
          fontSize: '13px',
        }}
      >
        <span>Your profile lives at</span>
        <span className="md-url">/profile/your-name.md</span>
      </div>
    </div>
  )
}

// ── Feed ───────────────────────────────────────────────────────────────────

function FeedHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 'var(--space-xl)',
        paddingBottom: 'var(--space-lg)',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: 'var(--space-lg)',
      }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.25rem',
          color: 'var(--color-ink)',
        }}
      >
        Recent posts
      </h2>
      {isLoggedIn && (
        <Link
          href="/editor?mode=post"
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-primary)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-primary-light)',
            border: '1px solid var(--color-primary)',
          }}
        >
          + Write a post
        </Link>
      )}
    </div>
  )
}

function PostCard({ post }: { post: FeedPost }) {
  const mdUrl = `/profile/${post.profile.slug}/post/${post.slug}.md`

  return (
    <article
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg)',
      }}
    >
      {/* Author row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-sm)',
          marginBottom: 'var(--space-sm)',
        }}
      >
        <Link
          href={`/profile/${post.profile.slug}`}
          style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-primary-light)',
            border: '1px solid var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 700,
            color: 'var(--color-primary)',
            fontFamily: 'var(--font-serif)',
            flexShrink: 0,
          }}
        >
          {post.profile.display_name.charAt(0).toUpperCase()}
        </Link>
        <Link
          href={`/profile/${post.profile.slug}`}
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text)',
          }}
        >
          {post.profile.display_name}
        </Link>
        <span style={{ color: 'var(--color-border)' }}>·</span>
        <time
          dateTime={post.created_at}
          style={{ fontSize: '12px', color: 'var(--color-muted)' }}
        >
          {formatDate(post.created_at)}
        </time>
      </div>

      {/* Title */}
      {post.title && (
        <Link href={`/profile/${post.profile.slug}/post/${post.slug}`}>
          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.0625rem',
              color: 'var(--color-ink)',
              lineHeight: 1.35,
              marginBottom: 'var(--space-xs)',
            }}
          >
            {post.title}
          </h3>
        </Link>
      )}

      {/* Preview */}
      <p
        style={{
          fontSize: '14px',
          color: 'var(--color-secondary)',
          lineHeight: 1.6,
          marginBottom: 'var(--space-md)',
        }}
      >
        {postPreview(post)}
      </p>

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <Link
            href={`/profile/${post.profile.slug}/post/${post.slug}`}
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--color-primary)',
            }}
          >
            Read →
          </Link>
          {(post.likeCount ?? 0) > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              ♥ {post.likeCount}
            </span>
          )}
          {(post.commentCount ?? 0) > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              💬 {post.commentCount}
            </span>
          )}
        </div>
        <span className="md-url" style={{ fontSize: '11px' }}>
          {mdUrl}
        </span>
      </div>
    </article>
  )
}

function EmptyFeed({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: 'var(--space-3xl) 0',
        color: 'var(--color-muted)',
      }}
    >
      <p style={{ fontSize: '15px', marginBottom: 'var(--space-md)' }}>
        No posts yet. Be the first.
      </p>
      {isLoggedIn && (
        <Link
          href="/editor?mode=post"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            background: 'var(--color-primary)',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          Write a post
        </Link>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function HomePage() {
  let isLoggedIn = false
  let hasProfile = true // assume true to avoid flash
  let myProfileId: string | null = null

  try {
    const authClient = createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    isLoggedIn = !!user
    if (user) {
      const supabase = createServerClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      hasProfile = !!profile
      myProfileId = profile?.id ?? null
    }
  } catch {
    // Supabase not configured
  }

  // Fetch recent posts with social counts; personalize feed for logged-in users
  let feedPosts: FeedPost[] = []
  try {
    const supabase = createServerClient()

    // Get IDs of profiles the viewer follows (for ordering)
    let followedIds: string[] = []
    if (myProfileId) {
      const { data: followRows } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', myProfileId)
      followedIds = (followRows ?? []).map((r: { followee_id: string }) => r.followee_id)
    }

    const { data: rawPosts } = await supabase
      .from('posts')
      .select('*, profile:profiles(slug, display_name, bio)')
      .order('created_at', { ascending: false })
      .limit(50)

    // Attach social counts
    const posts = (rawPosts ?? []) as FeedPost[]
    if (posts.length > 0) {
      const postIds = posts.map((p) => p.id)

      const [{ data: reactCounts }, { data: commentCounts }] = await Promise.all([
        supabase
          .from('reactions')
          .select('post_id')
          .in('post_id', postIds)
          .eq('type', 'like'),
        supabase
          .from('comments')
          .select('post_id')
          .in('post_id', postIds),
      ])

      const likeMap = new Map<string, number>()
      for (const r of reactCounts ?? []) {
        likeMap.set(r.post_id, (likeMap.get(r.post_id) ?? 0) + 1)
      }
      const commentMap = new Map<string, number>()
      for (const c of commentCounts ?? []) {
        commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1)
      }

      for (const post of posts) {
        post.likeCount = likeMap.get(post.id) ?? 0
        post.commentCount = commentMap.get(post.id) ?? 0
      }
    }

    // Sort: followed authors first, then by date
    if (followedIds.length > 0) {
      posts.sort((a, b) => {
        const aFollowed = followedIds.includes(a.profile_id) ? 1 : 0
        const bFollowed = followedIds.includes(b.profile_id) ? 1 : 0
        if (bFollowed !== aFollowed) return bFollowed - aFollowed
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
    }

    feedPosts = posts.slice(0, 30)
  } catch {
    // DB not reachable
  }

  return (
    <div>
      {!isLoggedIn && <LandingHero />}

      {isLoggedIn && !hasProfile && (
        <div
          style={{
            marginTop: 'var(--space-xl)',
            padding: 'var(--space-lg)',
            background: 'var(--color-primary-light)',
            border: '1px solid var(--color-primary)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-md)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <p style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: '2px' }}>
              Welcome to linked.md!
            </p>
            <p style={{ fontSize: '14px', color: 'var(--color-secondary)' }}>
              Set up your profile to get started. Your profile will live at{' '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                /profile/your-name.md
              </span>
            </p>
          </div>
          <Link
            href="/editor"
            style={{
              padding: '8px 20px',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 600,
              fontSize: '14px',
              flexShrink: 0,
            }}
          >
            Create your profile →
          </Link>
        </div>
      )}

      <FeedHeader isLoggedIn={isLoggedIn} />

      {feedPosts.length === 0 ? (
        <EmptyFeed isLoggedIn={isLoggedIn} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {feedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
