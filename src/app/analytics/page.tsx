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
      .select('created_at, viewer_hash')
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

  // Post views + social stats in parallel
  const allPosts = posts ?? []
  const postIds = allPosts.map(p => p.id)

  const [postViewRowsData, likeRowsData, commentRowsData, repostRowsData] = postIds.length > 0
    ? await Promise.all([
        supabase.from('post_views').select('post_id, viewer_hash, created_at').in('post_id', postIds).gte('created_at', thirtyDaysAgo.toISOString()).then(r => r.data ?? []),
        supabase.from('reactions').select('post_id').in('post_id', postIds).eq('type', 'like').then(r => r.data ?? []),
        supabase.from('comments').select('post_id').in('post_id', postIds).then(r => r.data ?? []),
        supabase.from('reposts').select('original_post_id').in('original_post_id', postIds).then(r => r.data ?? []),
      ])
    : [[], [], [], []]

  const postViewRows = postViewRowsData as { post_id: string; viewer_hash: string; created_at: string }[]

  // Distinct viewer hashes for profile views (accurate unique visitor count)
  const profileViewsRows = profileViewRows ?? []
  const pvByDay = new Map<string, Set<string>>()
  for (const r of profileViewsRows) {
    const day = r.created_at.slice(0, 10)
    if (!pvByDay.has(day)) pvByDay.set(day, new Set())
    pvByDay.get(day)!.add(r.viewer_hash as string)
  }
  const totalProfileViews30d = Array.from(pvByDay.values()).reduce((s, set) => s + set.size, 0)
  const sevenDaysAgoStr = sevenDaysAgo.toISOString()
  const profileViews7d = profileViewsRows.filter(r => r.created_at >= sevenDaysAgoStr).length

  // Distinct (post_id, viewer_hash) for post impressions
  const pvPostSet = new Set(postViewRows.map(r => `${r.post_id}::${r.viewer_hash}`))
  const totalPostViews30d = pvPostSet.size
  const postViews7d = postViewRows.filter(r => r.created_at >= sevenDaysAgoStr).length

  // Daily buckets for charts (use raw rows — buildDailyBuckets counts rows per day)
  const profileViewBuckets = buildDailyBuckets(profileViewsRows, 30)
  const postViewBuckets = buildDailyBuckets(postViewRows, 30)

  // Per-post stats
  const viewsByPostId: Record<string, Set<string>> = {}
  for (const r of postViewRows) {
    if (!viewsByPostId[r.post_id]) viewsByPostId[r.post_id] = new Set()
    viewsByPostId[r.post_id].add(r.viewer_hash)
  }
  const likesByPostId: Record<string, number> = {}
  for (const r of likeRowsData as { post_id: string }[]) likesByPostId[r.post_id] = (likesByPostId[r.post_id] ?? 0) + 1
  const commentsByPostId: Record<string, number> = {}
  for (const r of commentRowsData as { post_id: string }[]) commentsByPostId[r.post_id] = (commentsByPostId[r.post_id] ?? 0) + 1
  const repostsByPostId: Record<string, number> = {}
  for (const r of repostRowsData as { original_post_id: string }[]) repostsByPostId[r.original_post_id] = (repostsByPostId[r.original_post_id] ?? 0) + 1

  const topPosts = [...allPosts]
    .sort((a, b) => (viewsByPostId[b.id]?.size ?? 0) - (viewsByPostId[a.id]?.size ?? 0))
    .slice(0, 10)

  return (
    <div style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
      <div>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
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
          <div
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: 'var(--space-sm) var(--space-lg)', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>Posts (30 days)</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Title', 'Views', 'Likes', 'Comments', 'Reposts'].map(h => (
                    <th key={h} style={{ padding: '8px 16px', textAlign: h === 'Title' ? 'left' : 'right', fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topPosts.map((post, i) => (
                  <tr key={post.id} style={{ borderBottom: i < topPosts.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <td style={{ padding: '10px 16px', maxWidth: '260px' }}>
                      <Link
                        href={`/profile/${profile.slug}/post/${post.slug}`}
                        style={{ color: 'var(--color-text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}
                      >
                        {post.title ?? post.slug}
                      </Link>
                    </td>
                    {[
                      viewsByPostId[post.id]?.size ?? 0,
                      likesByPostId[post.id] ?? 0,
                      commentsByPostId[post.id] ?? 0,
                      repostsByPostId[post.id] ?? 0,
                    ].map((v, j) => (
                      <td key={j} style={{ padding: '10px 16px', textAlign: 'right', color: v > 0 ? 'var(--color-ink)' : 'var(--color-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
