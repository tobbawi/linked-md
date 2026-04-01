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
    <div className="pt-xl pb-3xl">
      <div>
        <div className="flex items-center justify-between mb-xl">
          <h1 className="font-serif text-[1.25rem] text-ink">
            Notifications
          </h1>
          <Link
            href={`/profile/${myProfile.slug}`}
            className="text-[13px] text-secondary"
          >
            ← My profile
          </Link>
        </div>

        {allNotifications.length === 0 ? (
          <div className="text-center py-3xl text-muted">
            <p className="text-[15px] mb-sm">
              No notifications yet.
            </p>
            <p className="text-[13px]">
              When someone follows you, likes a post, or comments — it shows up here.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-md overflow-hidden">
            {allNotifications.map((n, i) => (
              <Link
                key={n.id}
                href={notificationHref(n, myProfile.slug)}
                className="flex items-start gap-md px-lg py-md no-underline transition-colors duration-150"
                style={{
                  borderBottom:
                    i < allNotifications.length - 1 ? '1px solid var(--color-border)' : 'none',
                  background: n.read ? 'transparent' : 'var(--color-primary-light)',
                }}
              >
                {/* Type icon */}
                <span className="text-[16px] leading-none mt-[2px] shrink-0">
                  {n.type === 'follow' ? '👋' : n.type === 'like' ? '♥' : '💬'}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-[14px] text-text leading-[1.4] mb-[2px]">
                    {notificationText(n)}
                  </p>
                  <p className="text-[12px] text-muted m-0">
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
