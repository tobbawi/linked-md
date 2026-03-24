import Link from 'next/link'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import type { Post, Profile } from '@/types'

interface FeedPost extends Post {
  profile: Pick<Profile, 'slug' | 'display_name' | 'avatar_url' | 'bio'>
  likeCount?: number
  commentCount?: number
}

interface SuggestedProfile {
  slug: string
  display_name: string
  title: string | null
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
        paddingBottom: 'var(--space-2xl)',
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
          marginTop: 'var(--space-xl)',
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

// ── User sidebar (logged-in) ────────────────────────────────────────────────

function UserSidebar({
  profile,
  profileViews,
  postImpressions,
}: {
  profile: Profile
  profileViews: number
  postImpressions: number
}) {
  return (
    <div
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        position: 'sticky',
        top: '72px',
      }}
    >
      {/* Emerald header strip */}
      <div
        style={{
          height: '48px',
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #0B7D62 100%)',
        }}
      />

      {/* Avatar + info */}
      <div style={{ padding: '0 var(--space-lg) var(--space-lg)', marginTop: '-24px' }}>
        {/* Avatar */}
        <Link href={`/profile/${profile.slug}`} style={{ display: 'inline-block', marginBottom: 'var(--space-sm)' }}>
          <div style={{ outline: '3px solid var(--color-card)', borderRadius: '50%', display: 'inline-flex' }}>
            <Avatar name={profile.display_name} avatarUrl={profile.avatar_url} size={52} />
          </div>
        </Link>

        {/* Name */}
        <Link
          href={`/profile/${profile.slug}`}
          style={{ textDecoration: 'none' }}
        >
          <span
            style={{
              display: 'block',
              fontFamily: 'var(--font-serif)',
              fontSize: '1.0625rem',
              fontWeight: 400,
              color: 'var(--color-ink)',
              lineHeight: 1.3,
              marginBottom: '2px',
            }}
          >
            {profile.display_name}
          </span>
        </Link>

        {/* Title */}
        {profile.title && (
          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-secondary)',
              lineHeight: 1.4,
              marginBottom: profile.location ? '1px' : 'var(--space-sm)',
            }}
          >
            {profile.title}
          </p>
        )}

        {/* Location */}
        {profile.location && (
          <p
            style={{
              fontSize: '12px',
              color: 'var(--color-muted)',
              marginBottom: 'var(--space-sm)',
            }}
          >
            {profile.location}
          </p>
        )}

        {/* View profile link */}
        <Link
          href={`/profile/${profile.slug}`}
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--color-primary)',
            marginBottom: 'var(--space-md)',
          }}
        >
          View profile →
        </Link>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: 'var(--space-md)' }} />

        {/* Stats — profile views + post impressions */}
        <div
          style={{
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-md)',
            marginBottom: 'var(--space-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-sm)',
          }}
        >
          {/* Profile views */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '2px',
              }}
            >
              Profile views
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.5rem',
                  fontWeight: 400,
                  color: 'var(--color-primary)',
                  lineHeight: 1,
                }}
              >
                {profileViews}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--color-muted)',
                }}
              >
                last 7 days
              </span>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--color-border)' }} />

          {/* Post impressions */}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginBottom: '2px',
              }}
            >
              Post impressions
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.5rem',
                  fontWeight: 400,
                  color: 'var(--color-primary)',
                  lineHeight: 1,
                }}
              >
                {postImpressions}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  color: 'var(--color-muted)',
                }}
              >
                last 7 days
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-xs)',
            marginBottom: 'var(--space-md)',
          }}
        >
          <a
            href={`/profile/${profile.slug}/llm.txt`}
            className="llm-badge"
            style={{ alignSelf: 'flex-start' }}
            title="AI-readable profile summary"
          >
            llm.txt available
          </a>
          <span className="md-url" style={{ alignSelf: 'flex-start', fontSize: '11px' }}>
            /profile/{profile.slug}.md
          </span>
        </div>

        {/* Write a post CTA */}
        <Link
          href="/post/new"
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '8px 0',
            background: 'var(--color-primary)',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 600,
            fontSize: '13px',
          }}
        >
          + Write a post
        </Link>
      </div>
    </div>
  )
}

// ── Post card ───────────────────────────────────────────────────────────────

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
        <Link href={`/profile/${post.profile.slug}`} style={{ display: 'inline-flex', flexShrink: 0 }}>
          <Avatar name={post.profile.display_name} avatarUrl={post.profile.avatar_url} size={28} />
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
              fontSize: '1.2rem',
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
          marginBottom: post.tags && post.tags.length > 0 ? 'var(--space-sm)' : 'var(--space-md)',
        }}
      >
        {postPreview(post)}
      </p>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-xs)',
            marginBottom: 'var(--space-md)',
          }}
        >
          {post.tags.slice(0, 4).map((tag) => (
            <Link
              key={tag}
              href={`/tags/${tag}`}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: 'var(--color-muted)',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 7px',
              }}
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

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
              {post.likeCount} likes
            </span>
          )}
          {(post.commentCount ?? 0) > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              {post.commentCount} comments
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

// ── Right widgets ────────────────────────────────────────────────────────────

function RightWidgets({
  suggestedProfiles,
  trendingTags,
}: {
  suggestedProfiles: SuggestedProfile[]
  trendingTags: string[]
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      {/* People to follow */}
      {suggestedProfiles.length > 0 && (
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              People to follow
            </span>
          </div>
          <div style={{ padding: 'var(--space-sm) 0' }}>
            {suggestedProfiles.map((p) => (
              <div
                key={p.slug}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-sm)',
                  padding: 'var(--space-xs) var(--space-md)',
                }}
              >
                <Link href={`/profile/${p.slug}`} style={{ display: 'inline-flex', flexShrink: 0 }}>
                  <Avatar name={p.display_name} size={28} />
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link
                    href={`/profile/${p.slug}`}
                    style={{
                      display: 'block',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'var(--color-ink)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.display_name}
                  </Link>
                  {p.title && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--color-muted)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: 'block',
                      }}
                    >
                      {p.title}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: 'var(--space-xs) var(--space-md)', borderTop: '1px solid var(--color-border)' }}>
            <Link
              href="/people"
              style={{
                fontSize: '11px',
                color: 'var(--color-primary)',
                fontWeight: 500,
              }}
            >
              See all →
            </Link>
          </div>
        </div>
      )}

      {/* Trending tags */}
      {trendingTags.length > 0 && (
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: 'var(--space-sm) var(--space-md)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Trending tags
            </span>
          </div>
          <div style={{ padding: 'var(--space-sm) var(--space-md)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
            {trendingTags.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${tag}`}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-primary)',
                  background: 'var(--color-primary-light)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '2px 7px',
                }}
              >
                #{tag}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
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
      {isLoggedIn ? (
        <>
          <p style={{ fontSize: '15px', marginBottom: 'var(--space-sm)', color: 'var(--color-ink)' }}>
            Your feed is empty.
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-secondary)', marginBottom: 'var(--space-lg)' }}>
            Follow people to see their posts here.
          </p>
          <Link
            href="/people"
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
            Discover people →
          </Link>
        </>
      ) : (
        <>
          <p style={{ fontSize: '15px', marginBottom: 'var(--space-md)' }}>
            No posts yet. Be the first.
          </p>
          <Link
            href="/auth"
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
            Get started
          </Link>
        </>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function HomePage() {
  let isLoggedIn = false
  let hasProfile = true // assume true to avoid flash
  let myProfileId: string | null = null
  let currentProfile: Profile | null = null
  let profileViews = 0
  let postImpressions = 0
  let suggestedProfiles: SuggestedProfile[] = []
  let trendingTags: string[] = []
  let hasFollows = false

  try {
    const authClient = createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    isLoggedIn = !!user
    if (user) {
      const supabase = createServerClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single<Profile>()
      hasProfile = !!profile
      myProfileId = profile?.id ?? null
      currentProfile = profile ?? null

      if (profile) {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

        // Profile view count: distinct viewer hashes in last 7 days
        const { data: pvRows } = await supabase
          .from('profile_views')
          .select('viewer_hash')
          .eq('profile_id', profile.id)
          .gte('created_at', since)
        if (pvRows) {
          profileViews = new Set(pvRows.map((r: { viewer_hash: string }) => r.viewer_hash)).size
        }

        // Post impressions: sum of distinct views across all posts in last 7 days
        const { data: myPosts } = await supabase
          .from('posts')
          .select('id')
          .eq('profile_id', profile.id)
        if (myPosts && myPosts.length > 0) {
          const postIds = myPosts.map((p: { id: string }) => p.id)
          const { data: postViewRows } = await supabase
            .from('post_views')
            .select('post_id, viewer_hash')
            .in('post_id', postIds)
            .gte('created_at', since)
          if (postViewRows) {
            // Count distinct (post_id, viewer_hash) pairs for total impressions
            const seen = new Set(postViewRows.map((r: { post_id: string; viewer_hash: string }) => `${r.post_id}::${r.viewer_hash}`))
            postImpressions = seen.size
          }
        }
      }
    }
  } catch {
    // Supabase not configured
  }

  // Fetch network feed: posts from followed people + own posts, newest first
  let feedPosts: FeedPost[] = []
  try {
    const supabase = createServerClient()

    // Build feed: if logged in, UNION followed posts + own posts; else all recent posts
    if (myProfileId) {
      // Fetch followee IDs first, then run feed queries in parallel
      const { data: followRows } = await supabase
        .from('follows')
        .select('followee_id')
        .eq('follower_id', myProfileId)
      const followeeIds = (followRows ?? []).map((r: { followee_id: string }) => r.followee_id)

      const [{ data: followedPosts }, { data: ownPosts }] = await Promise.all([
        followeeIds.length > 0
          ? supabase
              .from('posts')
              .select('*, profile:profiles!profile_id(slug, display_name, avatar_url, bio)')
              .in('profile_id', followeeIds)
              .order('created_at', { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] }),
        supabase
          .from('posts')
          .select('*, profile:profiles!profile_id(slug, display_name, avatar_url, bio)')
          .eq('profile_id', myProfileId)
          .order('created_at', { ascending: false })
          .limit(20),
      ])

      hasFollows = (followedPosts ?? []).length > 0

      // Merge, deduplicate by id, sort newest-first, take 20
      const merged = [...(followedPosts ?? []), ...(ownPosts ?? [])] as FeedPost[]
      const deduped = Array.from(new Map(merged.map((p) => [p.id, p])).values())
      deduped.sort((a, b) => {
        const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        if (diff !== 0) return diff
        return a.id < b.id ? 1 : -1 // composite tie-break by id
      })
      const posts = deduped.slice(0, 20)

      if (posts.length > 0) {
        const postIds = posts.map((p) => p.id)
        const [{ data: reactCounts }, { data: commentCounts }] = await Promise.all([
          supabase.from('reactions').select('post_id').in('post_id', postIds).eq('type', 'like'),
          supabase.from('comments').select('post_id').in('post_id', postIds),
        ])
        const likeMap = new Map<string, number>()
        for (const r of reactCounts ?? []) likeMap.set(r.post_id, (likeMap.get(r.post_id) ?? 0) + 1)
        const commentMap = new Map<string, number>()
        for (const c of commentCounts ?? []) commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1)
        for (const post of posts) {
          post.likeCount = likeMap.get(post.id) ?? 0
          post.commentCount = commentMap.get(post.id) ?? 0
        }
      }

      feedPosts = posts

      // Trending tags from feed posts
      const tagCounts = new Map<string, number>()
      for (const post of posts) {
        for (const tag of post.tags ?? []) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
      }
      trendingTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag)

      // People to follow: profiles not yet followed (reuse followeeIds from above)
      const followedSet = new Set(followeeIds)
      const { data: suggRaw } = await supabase
        .from('profiles')
        .select('id, slug, display_name, title')
        .neq('id', myProfileId)
        .order('created_at', { ascending: false })
        .limit(20)
      suggestedProfiles = ((suggRaw ?? []) as (SuggestedProfile & { id: string })[])
        .filter((p) => !followedSet.has(p.id))
        .slice(0, 5)
    } else {
      // Logged-out: show recent posts from everyone
      const { data: rawPosts } = await supabase
        .from('posts')
        .select('*, profile:profiles!profile_id(slug, display_name, avatar_url, bio)')
        .order('created_at', { ascending: false })
        .limit(20)
      feedPosts = (rawPosts ?? []) as FeedPost[]

      const tagCounts = new Map<string, number>()
      for (const post of feedPosts) {
        for (const tag of post.tags ?? []) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
      }
      trendingTags = Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag]) => tag)
    }
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

      {/* Feed layout: sidebar + posts (+ right widgets when logged in) */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-xl)',
          alignItems: 'flex-start',
          paddingTop: isLoggedIn ? 'var(--space-xl)' : 0,
        }}
      >
        {/* Left sidebar — only for logged-in users with a profile */}
        {isLoggedIn && currentProfile && (
          <aside
            style={{
              width: '220px',
              flexShrink: 0,
              display: 'none', // hidden on mobile via CSS; override in layout
            }}
            className="home-sidebar"
          >
            <UserSidebar
              profile={currentProfile}
              profileViews={profileViews}
              postImpressions={postImpressions}
            />
          </aside>
        )}

        {/* Main feed */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Write a post button — visible on mobile or when no sidebar */}
          {isLoggedIn && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: 'var(--space-lg)',
                borderBottom: '1px solid var(--color-border)',
                paddingBottom: 'var(--space-lg)',
              }}
              className="feed-write-btn"
            >
              <Link
                href="/post/new"
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
            </div>
          )}

          {feedPosts.length === 0 ? (
            <EmptyFeed isLoggedIn={isLoggedIn} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {feedPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </main>

        {/* Right widgets — only for logged-in users on desktop */}
        {isLoggedIn && (suggestedProfiles.length > 0 || trendingTags.length > 0) && (
          <aside
            style={{
              width: '200px',
              flexShrink: 0,
              display: 'none', // hidden on mobile
              position: 'sticky',
              top: '72px',
            }}
            className="home-sidebar"
          >
            <RightWidgets
              suggestedProfiles={suggestedProfiles}
              trendingTags={trendingTags}
            />
          </aside>
        )}
      </div>
    </div>
  )
}
