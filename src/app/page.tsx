import Link from 'next/link'
import { createAuthServerClient, createServerClient } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import { RepostButton } from '@/components/RepostButton'
import { mergeFeedItems } from '@/lib/feed'
import type { Post, Profile, JobListing } from '@/types'

interface FeedPost extends Post {
  profile: Pick<Profile, 'slug' | 'display_name' | 'avatar_url' | 'bio'>
  likeCount?: number
  commentCount?: number
  repostCount?: number
  viewerHasReposted?: boolean
}

interface FeedRepost {
  id: string
  created_at: string
  comment: string | null
  feed_type: 'repost'
  reposter: Pick<Profile, 'slug' | 'display_name' | 'avatar_url'>
  post: Post & { post_author: Pick<Profile, 'slug' | 'display_name' | 'avatar_url' | 'bio'> }
}

interface FeedJobListing extends JobListing {
  company: { id: string; name: string; slug: string }
  feed_type: 'job'
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

function PostCard({ post, myProfileId }: { post: FeedPost; myProfileId?: string | null }) {
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
          <RepostButton
            postId={post.id}
            postAuthorProfileId={post.profile_id}
            myProfileId={myProfileId ?? null}
            initialReposted={post.viewerHasReposted ?? false}
            repostCount={post.repostCount ?? 0}
          />
        </div>
        <span className="md-url" style={{ fontSize: '11px' }}>
          {mdUrl}
        </span>
      </div>
    </article>
  )
}

// ── Job card (company following feed) ───────────────────────────────────────

const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  'contract': 'Contract',
  'internship': 'Internship',
}

function JobCard({ job }: { job: FeedJobListing }) {
  return (
    <article
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg)',
        borderLeft: '3px solid var(--color-primary)',
      }}
    >
      {/* Company row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
        <Link href={`/company/${job.company.slug}`} style={{ display: 'inline-flex', flexShrink: 0 }}>
          <Avatar name={job.company.name} size={24} shape="square" />
        </Link>
        <Link href={`/company/${job.company.slug}`} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-secondary)' }}>
          {job.company.name}
        </Link>
        <span style={{ color: 'var(--color-border)' }}>·</span>
        <span style={{ fontSize: '11px', color: 'var(--color-muted)', fontFamily: 'var(--font-mono)' }}>
          {JOB_TYPE_LABELS[job.type] ?? job.type}
        </span>
      </div>

      {/* Title */}
      <Link href={`/company/${job.company.slug}`}>
        <h3
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.1rem',
            color: 'var(--color-ink)',
            lineHeight: 1.35,
            marginBottom: job.location ? 'var(--space-xs)' : 'var(--space-md)',
          }}
        >
          {job.title}
        </h3>
      </Link>

      {job.location && (
        <p style={{ fontSize: '13px', color: 'var(--color-muted)', marginBottom: 'var(--space-md)' }}>
          {job.location}
        </p>
      )}

      <Link
        href={`/company/${job.company.slug}`}
        style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-primary)' }}
      >
        View opening →
      </Link>
    </article>
  )
}

// ── Repost card ──────────────────────────────────────────────────────────────

function RepostCard({ repost, myProfileId }: { repost: FeedRepost; myProfileId?: string | null }) {
  const { reposter, post } = repost
  const author = post.post_author
  return (
    <article
      style={{
        background: 'var(--color-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-lg)',
      }}
    >
      {/* Reshared-by row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        <Link href={`/profile/${reposter.slug}`} style={{ display: 'inline-flex', flexShrink: 0 }}>
          <Avatar name={reposter.display_name} avatarUrl={reposter.avatar_url} size={18} />
        </Link>
        <Link href={`/profile/${reposter.slug}`} style={{ fontSize: '12px', color: 'var(--color-secondary)', fontWeight: 500 }}>
          {reposter.display_name}
        </Link>
        <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>reshared</span>
      </div>

      {/* Optional comment */}
      {repost.comment && (
        <p style={{ fontSize: '14px', color: 'var(--color-text)', marginBottom: 'var(--space-md)', fontStyle: 'italic' }}>
          &ldquo;{repost.comment}&rdquo;
        </p>
      )}

      {/* Original post */}
      <div style={{
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        padding: 'var(--space-md)',
        background: 'var(--color-bg)',
      }}>
        {/* Original author row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
          <Link href={`/profile/${author.slug}`} style={{ display: 'inline-flex', flexShrink: 0 }}>
            <Avatar name={author.display_name} avatarUrl={author.avatar_url} size={24} />
          </Link>
          <Link href={`/profile/${author.slug}`} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>
            {author.display_name}
          </Link>
        </div>

        {post.title && (
          <Link href={`/profile/${author.slug}/post/${post.slug}`}>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.1rem',
              color: 'var(--color-ink)',
              lineHeight: 1.35,
              marginBottom: 'var(--space-xs)',
            }}>
              {post.title}
            </h3>
          </Link>
        )}
        <p style={{ fontSize: '13px', color: 'var(--color-secondary)', lineHeight: 1.5, marginBottom: 'var(--space-sm)' }}>
          {post.markdown_content.replace(/^#{1,6}\s+/gm, '').replace(/\*\*?([^*]+)\*\*?/g, '$1').trim().slice(0, 120).trimEnd()}…
        </p>
        <Link href={`/profile/${author.slug}/post/${post.slug}`} style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-primary)' }}>
          Read →
        </Link>
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
  let feedJobs: FeedJobListing[] = []
  let feedReposts: FeedRepost[] = []
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
      const posts = mergeFeedItems(
        (followedPosts ?? []) as FeedPost[],
        (ownPosts ?? []) as FeedPost[],
      ).slice(0, 20)

      if (posts.length > 0) {
        const postIds = posts.map((p) => p.id)
        const [{ data: reactCounts }, { data: commentCounts }, { data: repostCounts }, { data: myRepostRows }] = await Promise.all([
          supabase.from('reactions').select('post_id').in('post_id', postIds).eq('type', 'like'),
          supabase.from('comments').select('post_id').in('post_id', postIds),
          supabase.from('reposts').select('original_post_id').in('original_post_id', postIds),
          supabase.from('reposts').select('original_post_id').eq('profile_id', myProfileId).in('original_post_id', postIds),
        ])
        const likeMap = new Map<string, number>()
        for (const r of reactCounts ?? []) likeMap.set(r.post_id, (likeMap.get(r.post_id) ?? 0) + 1)
        const commentMap = new Map<string, number>()
        for (const c of commentCounts ?? []) commentMap.set(c.post_id, (commentMap.get(c.post_id) ?? 0) + 1)
        const repostMap = new Map<string, number>()
        for (const r of repostCounts ?? []) repostMap.set(r.original_post_id, (repostMap.get(r.original_post_id) ?? 0) + 1)
        const myRepostSet = new Set((myRepostRows ?? []).map((r: { original_post_id: string }) => r.original_post_id))
        for (const post of posts) {
          post.likeCount = likeMap.get(post.id) ?? 0
          post.commentCount = commentMap.get(post.id) ?? 0
          post.repostCount = repostMap.get(post.id) ?? 0
          post.viewerHasReposted = myRepostSet.has(post.id)
        }
      }

      feedPosts = posts

      // Fetch job listings from followed companies (90-day window)
      const { data: companyFollowRows } = await supabase
        .from('company_follows')
        .select('company_id')
        .eq('follower_id', myProfileId)
      const followedCompanyIds = (companyFollowRows ?? []).map((r: { company_id: string }) => r.company_id)

      if (followedCompanyIds.length > 0) {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        const { data: jobRows } = await supabase
          .from('job_listings')
          .select('*, company:companies!company_id(id, name, slug)')
          .in('company_id', followedCompanyIds)
          .eq('active', true)
          .gte('created_at', ninetyDaysAgo)
          .order('created_at', { ascending: false })
          .limit(10)
        feedJobs = ((jobRows ?? []) as FeedJobListing[]).map((j) => ({ ...j, feed_type: 'job' as const }))
      }

      // Fetch reposts from followed profiles
      if (followeeIds.length > 0) {
        const { data: repostRows } = await supabase
          .from('reposts')
          .select(`
            *,
            reposter:profiles!profile_id(slug, display_name, avatar_url),
            post:posts!original_post_id(*, post_author:profiles!profile_id(slug, display_name, avatar_url, bio))
          `)
          .in('profile_id', followeeIds)
          .order('created_at', { ascending: false })
          .limit(20)
        feedReposts = ((repostRows ?? []) as FeedRepost[]).map((r) => ({ ...r, feed_type: 'repost' as const }))
      }

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

          {(() => {
            const feedItems: Array<FeedPost | FeedJobListing | FeedRepost> = [
              ...feedPosts,
              ...feedJobs,
              ...feedReposts,
            ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            return feedItems.length === 0 ? (
              <EmptyFeed isLoggedIn={isLoggedIn} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {feedItems.map((item) => {
                  if ('feed_type' in item) {
                    if (item.feed_type === 'job') return <JobCard key={`job-${item.id}`} job={item as FeedJobListing} />
                    if (item.feed_type === 'repost') return <RepostCard key={`repost-${item.id}`} repost={item as FeedRepost} myProfileId={myProfileId} />
                  }
                  return <PostCard key={item.id} post={item as FeedPost} myProfileId={myProfileId} />
                })}
              </div>
            )
          })()}
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
