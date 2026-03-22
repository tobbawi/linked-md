import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'
import type { Profile, Notification } from '@/types'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function notificationText(n: Notification): string {
  const actor = n.actor?.display_name ?? 'Someone'
  switch (n.type) {
    case 'follow': return `${actor} followed you`
    case 'like': return `${actor} liked your post${n.post?.title ? ` "${n.post.title}"` : ''}`
    case 'comment': return `${actor} commented on your post${n.post?.title ? ` "${n.post.title}"` : ''}`
    default: return 'New notification'
  }
}

function notificationHref(n: Notification, mySlug: string): string {
  if (n.type === 'follow' && n.actor) return `/profile/${n.actor.slug}`
  if ((n.type === 'like' || n.type === 'comment') && n.post) {
    return `/profile/${mySlug}/post/${n.post.slug}`
  }
  return '/notifications'
}

export default async function NotificationsPage() {
  const authClient = createAuthServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/auth')

  const supabase = createServerClient()

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('id, slug')
    .eq('user_id', user.id)
    .single<Pick<Profile, 'id' | 'slug'>>()

  if (!myProfile) redirect('/editor')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*, actor:profiles!actor_id(slug, display_name), post:posts!post_id(slug, title)')
    .eq('recipient_id', myProfile.id)
    .order('created_at', { ascending: false })
    .limit(100)
    .returns<Notification[]>()

  // Mark all read
  if (notifications && notifications.some((n) => !n.read)) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', myProfile.id)
  }

  const allNotifications = notifications ?? []

  return (
    <div style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
      <div style={{ maxWidth: '600px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.5rem',
              color: 'var(--color-ink)',
            }}
          >
            Notifications
          </h1>
          <Link
            href={`/profile/${myProfile.slug}`}
            style={{ fontSize: '13px', color: 'var(--color-secondary)' }}
          >
            ← My profile
          </Link>
        </div>

        {allNotifications.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-3xl) 0',
              color: 'var(--color-muted)',
            }}
          >
            <p style={{ fontSize: '15px', marginBottom: 'var(--space-sm)' }}>
              No notifications yet.
            </p>
            <p style={{ fontSize: '13px' }}>
              When someone follows you, likes a post, or comments — it shows up here.
            </p>
          </div>
        ) : (
          <div
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
            }}
          >
            {allNotifications.map((n, i) => (
              <Link
                key={n.id}
                href={notificationHref(n, myProfile.slug)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-md)',
                  padding: 'var(--space-md) var(--space-lg)',
                  borderBottom:
                    i < allNotifications.length - 1 ? '1px solid var(--color-border)' : 'none',
                  textDecoration: 'none',
                  background: n.read ? 'transparent' : 'var(--color-primary-light)',
                  transition: 'background 150ms ease',
                }}
              >
                {/* Type icon */}
                <span
                  style={{
                    fontSize: '16px',
                    lineHeight: 1,
                    marginTop: '2px',
                    flexShrink: 0,
                  }}
                >
                  {n.type === 'follow' ? '👋' : n.type === 'like' ? '♥' : '💬'}
                </span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: '14px',
                      color: 'var(--color-text)',
                      margin: '0 0 2px',
                      lineHeight: 1.4,
                    }}
                  >
                    {notificationText(n)}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--color-muted)', margin: 0 }}>
                    {formatDate(n.created_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
