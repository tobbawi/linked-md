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
      className="block overflow-visible"
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
  // Distinct viewer_hash for 7d (same dedup methodology as 30d total)
  const profileViews7d = new Set(profileViewsRows.filter(r => r.created_at >= sevenDaysAgoStr).map(r => r.viewer_hash as string)).size

  // Distinct (post_id, viewer_hash) for post impressions
  const pvPostSet = new Set(postViewRows.map(r => `${r.post_id}::${r.viewer_hash}`))
  const totalPostViews30d = pvPostSet.size
  // Distinct (post_id, viewer_hash) for 7d (same dedup methodology as 30d total)
  const postViews7d = new Set(postViewRows.filter(r => r.created_at >= sevenDaysAgoStr).map(r => `${r.post_id}::${r.viewer_hash}`)).size

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
    <div className="pt-xl pb-3xl">
      <div>
        {/* Header */}
        <div className="mb-xl">
          <h1 className="font-serif text-[1.25rem] text-ink mb-xs">
            Analytics
          </h1>
          <p className="text-[14px] text-secondary">
            Last 30 days ·{' '}
            <Link href={`/profile/${profile.slug}`} className="text-primary">
              {profile.display_name}
            </Link>
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-md mb-xl">
          {[
            { label: 'Profile views', value: totalProfileViews30d, delta: profileViews7d, unit: 'last 7d' },
            { label: 'Post impressions', value: totalPostViews30d, delta: postViews7d, unit: 'last 7d' },
            { label: 'Followers', value: followerCount ?? 0, delta: null, unit: 'total' },
          ].map(stat => (
            <div
              key={stat.label}
              className="p-lg bg-card border border-border rounded-md"
            >
              <p className="text-[11px] font-medium text-muted uppercase tracking-[0.05em] mb-xs">
                {stat.label}
              </p>
              <p className="font-serif text-[2rem] font-bold text-ink leading-none mb-xs">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-[12px] text-muted">
                {stat.delta !== null ? (
                  <><strong className="text-primary">{stat.delta}</strong> {stat.unit}</>
                ) : stat.unit}
              </p>
            </div>
          ))}
        </div>

        {/* Profile views chart */}
        <div className="p-lg bg-card border border-border rounded-md mb-lg">
          <div className="flex justify-between items-center mb-md">
            <h2 className="text-[13px] font-semibold text-ink">Profile views</h2>
            <span className="text-[11px] text-muted">30 days</span>
          </div>
          <div className="overflow-x-auto">
            <Sparkline buckets={profileViewBuckets} />
          </div>
          <div className="flex justify-between mt-[4px]">
            <span className="text-[10px] text-muted">{profileViewBuckets[0]?.label}</span>
            <span className="text-[10px] text-muted">{profileViewBuckets[profileViewBuckets.length - 1]?.label}</span>
          </div>
        </div>

        {/* Post impressions chart */}
        <div className="p-lg bg-card border border-border rounded-md mb-xl">
          <div className="flex justify-between items-center mb-md">
            <h2 className="text-[13px] font-semibold text-ink">Post impressions</h2>
            <span className="text-[11px] text-muted">30 days</span>
          </div>
          <div className="overflow-x-auto">
            <Sparkline buckets={postViewBuckets} />
          </div>
          <div className="flex justify-between mt-[4px]">
            <span className="text-[10px] text-muted">{postViewBuckets[0]?.label}</span>
            <span className="text-[10px] text-muted">{postViewBuckets[postViewBuckets.length - 1]?.label}</span>
          </div>
        </div>

        {/* Top posts */}
        {topPosts.length > 0 && (
          <div className="bg-card border border-border rounded-md overflow-hidden">
            <div className="py-sm px-lg border-b border-border">
              <span className="text-[13px] font-semibold text-ink">Posts (30 days)</span>
            </div>
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  {['Title', 'Views', 'Likes', 'Comments', 'Reposts'].map(h => (
                    <th key={h} className="py-[8px] px-[16px] text-[11px] font-mono font-semibold text-muted uppercase tracking-[0.06em]" style={{ textAlign: h === 'Title' ? 'left' : 'right' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topPosts.map((post, i) => (
                  <tr key={post.id} style={{ borderBottom: i < topPosts.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                    <td className="py-[10px] px-[16px] max-w-[260px]">
                      <Link
                        href={`/profile/${profile.slug}/post/${post.slug}`}
                        className="text-text font-medium overflow-hidden text-ellipsis whitespace-nowrap block"
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
                      <td key={j} className="py-[10px] px-[16px] text-right tabular-nums" style={{ color: v > 0 ? 'var(--color-ink)' : 'var(--color-muted)' }}>
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
          <p className="text-[14px] text-muted">
            No views recorded yet. Share your profile to get started.
          </p>
        )}
      </div>
    </div>
  )
}
