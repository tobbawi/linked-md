import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'
import type { Profile, Post } from '@/types'

export const metadata: Metadata = {
  title: 'Analytics — linked.md',
}

function formatDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildDailyBuckets(rows: { created_at: string }[], days: number): { label: string; count: number }[] {
  const buckets: Record<string, number> = {}
  const now = new Date()

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    buckets[key] = 0
  }

  for (const row of rows) {
    const key = row.created_at.slice(0, 10)
    if (key in buckets) {
      buckets[key]++
    }
  }

  return Object.entries(buckets).map(([key, count]) => ({
    label: formatDay(key + 'T12:00:00Z'),
    count,
  }))
}

function Sparkline({ buckets }: { buckets: { label: string; count: number }[] }) {
  const max = Math.max(...buckets.map(b => b.count), 1)
  const height = 48
  const width = buckets.length * 16

  const points = buckets.map((b, i) => {
    const x = i * 16 + 8
    const y = height - (b.count / max) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  return (
    <svg
      width={width}
      height={height}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {buckets.map((b, i) => (
        <circle
          key={i}
          cx={i * 16 + 8}
          cy={height - (b.count / max) * (height - 4) - 2}
          r="2.5"
          fill="var(--color-primary)"
        />
      ))}
    </svg>
  )
}

export default async function AnalyticsPage() {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/auth')

  const supabase = createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single<Profile>()

  if (!profile) redirect('/')

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const [
    { data: profileViewRows },
    { data: posts },
    { count: followerCount },
  ] = await Promise.all([
    supabase
      .from('profile_views')
      .select('created_at, viewer_profile_id')
      .eq('profile_id', profile.id)
      .gte('created_at', thirtyDaysAgo.toISOString()),
    supabase
      .from('posts')
      .select('id, title, slug, created_at')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .returns<Pick<Post, 'id' | 'title' | 'slug' | 'created_at'>[]>(),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('followee_id', profile.id),
  ])

  // Post views in parallel
  const allPosts = posts ?? []
  const postIds = allPosts.map(p => p.id)

  const postViewRows = postIds.length > 0
    ? (await supabase
        .from('post_views')
        .select('post_id, created_at')
        .in('post_id', postIds)
        .gte('created_at', thirtyDaysAgo.toISOString())).data ?? []
    : []

  // Unique profile views (by viewer_hash concept — here we count by viewer_profile_id or total)
  const profileViewsRows = profileViewRows ?? []
  const totalProfileViews30d = profileViewsRows.length
  const profileViews7d = profileViewsRows.filter(r => new Date(r.created_at) >= sevenDaysAgo).length

  // Total post impressions
  const totalPostViews30d = postViewRows.length
  const postViews7d = postViewRows.filter(r => new Date(r.created_at) >= sevenDaysAgo).length

  // Daily buckets for charts
  const profileViewBuckets = buildDailyBuckets(profileViewsRows, 30)
  const postViewBuckets = buildDailyBuckets(postViewRows, 30)

  // Per-post view counts
  const viewsByPostId: Record<string, number> = {}
  for (const r of postViewRows) {
    viewsByPostId[r.post_id] = (viewsByPostId[r.post_id] ?? 0) + 1
  }
  const topPosts = [...allPosts]
    .sort((a, b) => (viewsByPostId[b.id] ?? 0) - (viewsByPostId[a.id] ?? 0))
    .slice(0, 5)

  return (
    <div style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.75rem',
              color: 'var(--color-ink)',
              marginBottom: 'var(--space-xs)',
            }}
          >
            Analytics
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-secondary)' }}>
            Last 30 days ·{' '}
            <Link href={`/profile/${profile.slug}`} style={{ color: 'var(--color-primary)' }}>
              {profile.display_name}
            </Link>
          </p>
        </div>

        {/* Stat cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--space-md)',
            marginBottom: 'var(--space-xl)',
          }}
        >
          {[
            { label: 'Profile views', value: totalProfileViews30d, delta: profileViews7d, unit: 'last 7d' },
            { label: 'Post impressions', value: totalPostViews30d, delta: postViews7d, unit: 'last 7d' },
            { label: 'Followers', value: followerCount ?? 0, delta: null, unit: 'total' },
          ].map(stat => (
            <div
              key={stat.label}
              style={{
                padding: 'var(--space-lg)',
                background: 'var(--color-card)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <p style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-xs)' }}>
                {stat.label}
              </p>
              <p
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: 'var(--color-ink)',
                  lineHeight: 1,
                  marginBottom: 'var(--space-xs)',
                }}
              >
                {stat.value.toLocaleString()}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
                {stat.delta !== null ? (
                  <><strong style={{ color: 'var(--color-primary)' }}>{stat.delta}</strong> {stat.unit}</>
                ) : stat.unit}
              </p>
            </div>
          ))}
        </div>

        {/* Profile views chart */}
        <div
          style={{
            padding: 'var(--space-lg)',
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-lg)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Profile views</h2>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>30 days</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <Sparkline buckets={profileViewBuckets} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>{profileViewBuckets[0]?.label}</span>
            <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>{profileViewBuckets[profileViewBuckets.length - 1]?.label}</span>
          </div>
        </div>

        {/* Post impressions chart */}
        <div
          style={{
            padding: 'var(--space-lg)',
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Post impressions</h2>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>30 days</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <Sparkline buckets={postViewBuckets} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>{postViewBuckets[0]?.label}</span>
            <span style={{ fontSize: '10px', color: 'var(--color-muted)' }}>{postViewBuckets[postViewBuckets.length - 1]?.label}</span>
          </div>
        </div>

        {/* Top posts */}
        {topPosts.length > 0 && (
          <div>
            <h2
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--color-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: 'var(--space-md)',
              }}
            >
              Top posts (30 days)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {topPosts.map((post, i) => (
                <div
                  key={post.id}
                  style={{
                    padding: 'var(--space-sm) 0',
                    borderBottom: i < topPosts.length - 1 ? '1px solid var(--color-border)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-md)',
                  }}
                >
                  <Link
                    href={`/profile/${profile.slug}/post/${post.slug}`}
                    style={{ fontSize: '14px', color: 'var(--color-ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {post.title ?? post.slug}
                  </Link>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-primary)', flexShrink: 0 }}>
                    {(viewsByPostId[post.id] ?? 0).toLocaleString()} views
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalProfileViews30d === 0 && totalPostViews30d === 0 && (
          <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
            No views recorded yet. Share your profile to get started.
          </p>
        )}
      </div>
    </div>
  )
}
