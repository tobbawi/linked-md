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
    <section className="relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-[40px] py-[100px] pb-[80px] grid grid-cols-1 md:grid-cols-2 gap-[60px] items-center">
        {/* Left: content */}
        <div className="relative z-[2]">
          {/* Hero tag pill */}
          <div className="inline-flex items-center gap-[8px] font-mono text-[13px] font-medium text-primary bg-primary-light py-[7px] px-[16px] rounded-full mb-[28px]">
            <span className="w-[7px] h-[7px] bg-primary rounded-full animate-pulse" />
            Open network &middot; AI-readable
          </div>

          {/* H1 */}
          <h1
            className="font-serif text-[64px] font-normal text-ink leading-[1.05] tracking-[-0.035em] mb-[24px]"
            style={{ fontVariationSettings: "'opsz' 72" }}
          >
            Your profile<br />is a <em className="italic text-primary">markdown</em><br />file.
          </h1>

          {/* Subtitle */}
          <p className="text-[18px] text-secondary leading-[1.6] max-w-[440px] mb-[36px]">
            The professional network where every profile, post, and company is a{' '}
            <code className="font-mono text-[16px] text-primary bg-primary-light px-[8px] py-[2px] rounded-[5px]">
              .md
            </code>{' '}
            file. Open. Portable. Yours.
          </p>

          {/* Action buttons */}
          <div className="flex gap-[12px] mb-[32px]">
            <Link
              href="/auth"
              className="inline-flex items-center py-[14px] px-[32px] bg-ink text-white rounded-[12px] font-semibold text-[16px] hover:bg-text hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all"
            >
              Create your profile
            </Link>
            <Link
              href="/auth?tab=login"
              className="inline-flex items-center py-[14px] px-[32px] bg-transparent text-secondary rounded-[12px] font-semibold text-[16px] border-[1.5px] border-border hover:text-ink hover:border-secondary transition-all"
            >
              Sign in
            </Link>
          </div>

          {/* Filepath line */}
          <div className="font-mono text-[14px] text-faint">
            Your profile lives at{' '}
            <span className="text-primary bg-primary-light py-[4px] px-[12px] rounded-[6px] ml-[4px]">
              /profile/your-name.md
            </span>
          </div>
        </div>

        {/* Right: decorative profile card */}
        <div className="relative hidden md:block">
          <div
            className="bg-white border-[1.5px] border-border rounded-[20px] p-[32px] shadow-[0_24px_48px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)] -rotate-2 hover:rotate-0 transition-transform duration-300"
          >
            <div
              className="font-serif text-[28px] text-ink mb-[4px]"
              style={{ fontVariationSettings: "'opsz' 32" }}
            >
              Wim Tobback
            </div>
            <div className="font-mono text-[13px] text-primary bg-primary-light py-[4px] px-[12px] rounded-[6px] inline-block mb-[16px]">
              /profile/wim-tobback.md
            </div>
            <div className="text-[15px] text-secondary font-medium mb-[4px]">AIGENEER</div>
            <div className="text-[14px] text-muted mb-[16px]">Belgium</div>
            <div className="text-[14px] text-secondary leading-[1.6] pt-[16px] border-t border-border">
              Embracing the era of the AIGENEER. Building at the intersection of AI and entrepreneurship. Three roles, one mission.
            </div>
          </div>
          {/* Floating badges */}
          <div className="absolute top-[-10px] right-[-20px] bg-white border-[1.5px] border-border rounded-[14px] py-[14px] px-[18px] shadow-[0_12px_32px_rgba(0,0,0,0.06)] font-mono text-[12px] text-primary rotate-3">
            llm.txt available
          </div>
          <div className="absolute bottom-[20px] left-[-30px] bg-white border-[1.5px] border-border rounded-[14px] py-[14px] px-[18px] shadow-[0_12px_32px_rgba(0,0,0,0.06)] font-mono text-[12px] text-primary -rotate-3">
            graph.json
          </div>
        </div>
      </div>
    </section>
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
    <div className="bg-card border border-border rounded-lg overflow-hidden sticky top-[72px]">
      {/* Emerald header strip */}
      <div
        className="h-[48px]"
        style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #0B7D62 100%)' }}
      />

      {/* Avatar + info */}
      <div className="px-lg pb-lg pt-0 mt-[-24px]">
        {/* Avatar */}
        <Link href={`/profile/${profile.slug}`} className="inline-block mb-sm">
          <div className="outline-3 outline-card rounded-full inline-flex" style={{ outlineStyle: 'solid' }}>
            <Avatar name={profile.display_name} avatarUrl={profile.avatar_url} size={52} />
          </div>
        </Link>

        {/* Name */}
        <Link
          href={`/profile/${profile.slug}`}
          className="no-underline"
        >
          <span className="block font-serif text-[1.0625rem] font-normal text-ink leading-[1.3] mb-2xs">
            {profile.display_name}
          </span>
        </Link>

        {/* Title */}
        {profile.title && (
          <p
            className="text-[12px] text-secondary leading-[1.4]"
            style={{ marginBottom: profile.location ? '1px' : 'var(--space-sm)' }}
          >
            {profile.title}
          </p>
        )}

        {/* Location */}
        {profile.location && (
          <p className="text-[12px] text-muted mb-sm">
            {profile.location}
          </p>
        )}

        {/* View profile link */}
        <Link
          href={`/profile/${profile.slug}`}
          className="block text-[12px] font-medium text-primary mb-md"
        >
          View profile →
        </Link>

        {/* Divider */}
        <div className="border-t border-border mb-md" />

        {/* Stats — profile views + post impressions */}
        <div className="bg-bg border border-border rounded-md p-md mb-md flex flex-col gap-sm">
          {/* Profile views */}
          <div>
            <div className="font-mono text-[10px] font-semibold text-muted uppercase tracking-[0.06em] mb-2xs">
              Profile views
            </div>
            <div className="flex items-baseline gap-[6px]">
              <span className="font-serif text-[1.5rem] font-normal text-primary leading-none">
                {profileViews}
              </span>
              <span className="text-[11px] text-muted">
                last 7 days
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Post impressions */}
          <div>
            <div className="font-mono text-[10px] font-semibold text-muted uppercase tracking-[0.06em] mb-2xs">
              Post impressions
            </div>
            <div className="flex items-baseline gap-[6px]">
              <span className="font-serif text-[1.5rem] font-normal text-primary leading-none">
                {postImpressions}
              </span>
              <span className="text-[11px] text-muted">
                last 7 days
              </span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-col gap-xs mb-md">
          <a
            href={`/profile/${profile.slug}/llm.txt`}
            className="llm-badge self-start"
            title="AI-readable profile summary"
          >
            llm.txt available
          </a>
          <span className="md-url self-start text-[11px]">
            /profile/{profile.slug}.md
          </span>
        </div>

        {/* Write a post CTA */}
        <Link
          href="/post/new"
          className="block text-center py-sm bg-primary text-white rounded-sm font-semibold text-[13px]"
        >
          + Write a post
        </Link>
      </div>
    </div>
  )
}

// ── Post card ───────────────────────────────────────────────────────────────

function PostCard({ post, myProfileId, featured }: { post: FeedPost; myProfileId?: string | null; featured?: boolean }) {
  const mdUrl = `/profile/${post.profile.slug}/post/${post.slug}.md`

  return (
    <article
      className={
        featured
          ? 'col-span-1 md:col-span-2 md:row-span-2 bg-primary-deep border-primary-deep text-white rounded-[20px] p-[48px] transition-all duration-250 hover:-translate-y-[4px] hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:border-primary relative overflow-hidden border-[1.5px]'
          : 'bg-card border-[1.5px] border-border rounded-[20px] p-[32px] transition-all duration-250 hover:border-primary hover:-translate-y-[4px] hover:shadow-hover relative overflow-hidden'
      }
    >
      {/* Author row */}
      <div className="flex items-center gap-[12px] mb-[20px]">
        <Link href={`/profile/${post.profile.slug}`} className="inline-flex shrink-0">
          <Avatar name={post.profile.display_name} avatarUrl={post.profile.avatar_url} size={40} />
        </Link>
        <div>
          <Link
            href={`/profile/${post.profile.slug}`}
            className={`text-[14px] font-semibold ${featured ? 'text-white' : 'text-ink'}`}
          >
            {post.profile.display_name}
          </Link>
          <div className={`text-[12px] ${featured ? 'text-white/60' : 'text-muted'}`}>
            {formatDate(post.created_at)}
          </div>
        </div>
      </div>

      {/* Title */}
      {post.title && (
        <Link href={`/profile/${post.profile.slug}/post/${post.slug}`}>
          <h3
            className={`font-serif leading-[1.25] mb-[12px] font-normal tracking-[-0.01em] ${featured ? 'text-white text-[32px]' : 'text-ink text-[22px]'}`}
            style={{ fontVariationSettings: "'opsz' 32" }}
          >
            {post.title}
          </h3>
        </Link>
      )}

      {/* Preview */}
      <p
        className={`text-[14px] leading-[1.65] mb-[20px] ${featured ? 'text-white/70 text-[16px]' : 'text-secondary'}`}
      >
        {postPreview(post)}
      </p>

      {/* Footer: tags + md URL */}
      <div className="flex items-center justify-between flex-wrap gap-[10px]">
        {/* Tags */}
        <div className="flex flex-wrap gap-[6px]">
          {(post.tags ?? []).slice(0, 4).map((tag) => (
            <Link
              key={tag}
              href={`/tags/${tag}`}
              className={`font-mono text-[11px] py-[4px] px-[12px] rounded-full border inline-flex items-center transition-all duration-150 ${
                featured
                  ? 'text-white/80 bg-white/[0.12] border-white/20 hover:text-white hover:border-white/40'
                  : 'text-secondary bg-bg border-border hover:text-primary hover:border-primary hover:bg-primary-light'
              }`}
            >
              #{tag}
            </Link>
          ))}
        </div>

        <span className={`md-url text-[11px] font-mono ${featured ? 'text-white/40' : 'text-muted'}`}>
          {mdUrl}
        </span>
      </div>

      {/* Engagement row — below footer */}
      <div className="flex items-center gap-md mt-[12px]">
        <Link
          href={`/profile/${post.profile.slug}/post/${post.slug}`}
          className={`text-[13px] font-medium ${featured ? 'text-white/80 hover:text-white' : 'text-primary'}`}
        >
          Read →
        </Link>
        {(post.likeCount ?? 0) > 0 && (
          <span className={`text-[12px] ${featured ? 'text-white/50' : 'text-muted'}`}>
            {post.likeCount} likes
          </span>
        )}
        {(post.commentCount ?? 0) > 0 && (
          <span className={`text-[12px] ${featured ? 'text-white/50' : 'text-muted'}`}>
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
    <article className="bg-card border border-border rounded-md p-lg border-l-[3px] border-l-primary">
      {/* Company row */}
      <div className="flex items-center gap-sm mb-sm">
        <Link href={`/company/${job.company.slug}`} className="inline-flex shrink-0">
          <Avatar name={job.company.name} size={24} shape="square" />
        </Link>
        <Link href={`/company/${job.company.slug}`} className="text-[13px] font-medium text-secondary">
          {job.company.name}
        </Link>
        <span className="text-border">·</span>
        <span className="text-[11px] text-muted font-mono">
          {JOB_TYPE_LABELS[job.type] ?? job.type}
        </span>
      </div>

      {/* Title */}
      <Link href={`/company/${job.company.slug}`}>
        <h3
          className="font-serif text-[1.1rem] text-ink leading-[1.35]"
          style={{ marginBottom: job.location ? 'var(--space-xs)' : 'var(--space-md)' }}
        >
          {job.title}
        </h3>
      </Link>

      {job.location && (
        <p className="text-[13px] text-muted mb-md">
          {job.location}
        </p>
      )}

      <Link
        href={`/company/${job.company.slug}`}
        className="text-[13px] font-medium text-primary"
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
    <article className="bg-card border border-border rounded-md p-lg hover:shadow-sm transition-all">
      {/* Reshared-by row */}
      <div className="flex items-center gap-sm mb-md">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
          stroke="var(--color-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M17 1l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <path d="M7 23l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        <Link href={`/profile/${reposter.slug}`} className="inline-flex shrink-0">
          <Avatar name={reposter.display_name} avatarUrl={reposter.avatar_url} size={18} />
        </Link>
        <Link href={`/profile/${reposter.slug}`} className="text-[12px] text-secondary font-medium">
          {reposter.display_name}
        </Link>
        <span className="text-[12px] text-muted">reshared</span>
      </div>

      {/* Optional comment */}
      {repost.comment && (
        <p className="text-[14px] text-text mb-md italic">
          &ldquo;{repost.comment}&rdquo;
        </p>
      )}

      {/* Original post */}
      <div className="border border-border rounded-sm p-md bg-bg">
        {/* Original author row */}
        <div className="flex items-center gap-sm mb-sm">
          <Link href={`/profile/${author.slug}`} className="inline-flex shrink-0">
            <Avatar name={author.display_name} avatarUrl={author.avatar_url} size={24} />
          </Link>
          <Link href={`/profile/${author.slug}`} className="text-[13px] font-medium text-text">
            {author.display_name}
          </Link>
        </div>

        {post.title && (
          <Link href={`/profile/${author.slug}/post/${post.slug}`}>
            <h3 className="font-serif text-[1.1rem] text-ink leading-[1.35] mb-xs">
              {post.title}
            </h3>
          </Link>
        )}
        <p className="text-[13px] text-secondary leading-[1.5] mb-sm">
          {(post.markdown_content ?? '').replace(/^#{1,6}\s+/gm, '').replace(/\*\*?([^*]+)\*\*?/g, '$1').trim().slice(0, 120).trimEnd()}…
        </p>
        <Link href={`/profile/${author.slug}/post/${post.slug}`} className="text-[12px] font-medium text-primary">
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
    <div className="flex flex-col gap-lg">
      {/* People to follow */}
      {suggestedProfiles.length > 0 && (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="py-sm px-md border-b border-border">
            <span className="font-mono text-[10px] font-semibold text-muted uppercase tracking-[0.06em]">
              People to follow
            </span>
          </div>
          <div className="py-sm">
            {suggestedProfiles.map((p) => (
              <div
                key={p.slug}
                className="flex items-center gap-sm py-xs px-md"
              >
                <Link href={`/profile/${p.slug}`} className="inline-flex shrink-0">
                  <Avatar name={p.display_name} size={28} />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/profile/${p.slug}`}
                    className="block text-[12px] font-medium text-ink whitespace-nowrap overflow-hidden text-ellipsis"
                  >
                    {p.display_name}
                  </Link>
                  {p.title && (
                    <span className="block text-[11px] text-muted whitespace-nowrap overflow-hidden text-ellipsis">
                      {p.title}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="py-xs px-md border-t border-border">
            <Link
              href="/people"
              className="text-[11px] text-primary font-medium"
            >
              See all →
            </Link>
          </div>
        </div>
      )}

      {/* Trending tags */}
      {trendingTags.length > 0 && (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="py-sm px-md border-b border-border">
            <span className="font-mono text-[10px] font-semibold text-muted uppercase tracking-[0.06em]">
              Trending tags
            </span>
          </div>
          <div className="py-sm px-md flex flex-wrap gap-xs">
            {trendingTags.map((tag) => (
              <Link
                key={tag}
                href={`/tags/${tag}`}
                className="font-mono text-[11px] text-primary bg-primary-light rounded-sm py-2xs px-[7px]"
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
    <div className="text-center py-3xl text-muted">
      {isLoggedIn ? (
        <>
          <p className="text-[15px] mb-sm text-ink">
            Your feed is empty.
          </p>
          <p className="text-[14px] text-secondary mb-lg">
            Follow people to see their posts here.
          </p>
          <Link
            href="/people"
            className="inline-block py-[10px] px-lg bg-primary text-white rounded-sm font-semibold text-[14px]"
          >
            Discover people →
          </Link>
        </>
      ) : (
        <>
          <p className="text-[15px] mb-md">
            No posts yet. Be the first.
          </p>
          <Link
            href="/auth"
            className="inline-block py-[10px] px-lg bg-primary text-white rounded-sm font-semibold text-[14px]"
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

      hasFollows = followeeIds.length > 0

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
        <div className="mt-xl p-lg bg-primary-light border border-primary rounded-md flex items-center justify-between gap-md flex-wrap">
          <div>
            <p className="font-semibold text-ink mb-2xs">
              Welcome to linked.md!
            </p>
            <p className="text-[14px] text-secondary">
              Set up your profile to get started. Your profile will live at{' '}
              <span className="font-mono text-primary">
                /profile/your-name.md
              </span>
            </p>
          </div>
          <Link
            href="/editor"
            className="py-sm px-[20px] bg-primary text-white rounded-sm font-semibold text-[14px] shrink-0"
          >
            Create your profile →
          </Link>
        </div>
      )}

      {/* Feed layout: sidebar + posts (+ right widgets when logged in) */}
      <div
        className="flex gap-xl items-start"
        style={{ paddingTop: isLoggedIn ? 'var(--space-xl)' : 0 }}
      >
        {/* Left sidebar — only for logged-in users with a profile */}
        {isLoggedIn && currentProfile && (
          <aside
            className="home-sidebar w-[220px] shrink-0 hidden"
          >
            <UserSidebar
              profile={currentProfile}
              profileViews={profileViews}
              postImpressions={postImpressions}
            />
          </aside>
        )}

        {/* Main feed */}
        <main className="flex-1 min-w-0">
          {/* Write a post button — visible on mobile or when no sidebar */}
          {isLoggedIn && (
            <div
              className="feed-write-btn flex justify-end mb-lg border-b border-border pb-lg"
            >
              <Link
                href="/post/new"
                className="text-[13px] font-medium text-primary py-[6px] px-[14px] rounded-sm bg-primary-light border border-primary"
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
            if (feedItems.length === 0) return <EmptyFeed isLoggedIn={isLoggedIn} />

            // Logged-out: bento grid layout
            if (!isLoggedIn) {
              let firstPostIndex = 0
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-[20px]">
                  {feedItems.map((item) => {
                    if ('feed_type' in item) {
                      if (item.feed_type === 'job') return <JobCard key={`job-${item.id}`} job={item as FeedJobListing} />
                      if (item.feed_type === 'repost') return <RepostCard key={`repost-${item.id}`} repost={item as FeedRepost} myProfileId={myProfileId} />
                    }
                    const isFeatured = firstPostIndex === 0
                    firstPostIndex++
                    return <PostCard key={item.id} post={item as FeedPost} myProfileId={myProfileId} featured={isFeatured} />
                  })}
                </div>
              )
            }

            // Logged-in: keep linear feed
            return (
              <div className="flex flex-col gap-lg">
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
            className="home-sidebar w-[200px] shrink-0 hidden sticky top-[72px]"
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
