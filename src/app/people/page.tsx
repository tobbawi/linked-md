import Link from 'next/link'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import type { Profile } from '@/types'

export const revalidate = 120 // ISR: revalidate every 2 minutes

export default async function PeoplePage() {
  const supabase = createServerClient()

  let isLoggedIn = false
  try {
    const authClient = createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    isLoggedIn = !!user
  } catch {
    // not logged in
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Profile[]>()

  // Follower counts per profile
  const { data: followRows } = await supabase.from('follows').select('followee_id')
  const followerMap = new Map<string, number>()
  for (const row of followRows ?? []) {
    followerMap.set(row.followee_id, (followerMap.get(row.followee_id) ?? 0) + 1)
  }

  const allProfiles = profiles ?? []

  return (
    <div className="pt-xl pb-3xl">
      <div className="flex items-center justify-between pb-lg border-b border-border mb-lg">
        <h1 className="font-serif text-[1.25rem] text-ink">
          People
        </h1>
        {isLoggedIn && (
          <Link
            href="/editor"
            className="text-[13px] font-medium text-primary py-[6px] px-[14px] rounded-sm bg-primary-light border border-primary"
          >
            Edit your profile
          </Link>
        )}
      </div>

      {allProfiles.length === 0 ? (
        <div className="text-center py-3xl text-muted">
          <p className="text-[15px]">No profiles yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-md">
          {allProfiles.map((profile) => {
            const followers = followerMap.get(profile.id) ?? 0
            return (
              <Link
                key={profile.id}
                href={`/profile/${profile.slug}`}
                className="no-underline"
              >
                <div className="company-card">
                  {/* Avatar */}
                  <div className="mb-sm">
                    <Avatar name={profile.display_name} avatarUrl={profile.avatar_url} size={40} />
                  </div>

                  <h2
                    className="font-serif text-[1rem] text-ink leading-[1.3]"
                    style={{
                      marginBottom: profile.title ? '2px' : 'var(--space-xs)',
                    }}
                  >
                    {profile.display_name}
                  </h2>

                  {profile.title && (
                    <p className="text-[12px] text-text font-medium mb-[2px]">
                      {profile.title}
                    </p>
                  )}

                  {profile.location && (
                    <p className="text-[11px] text-muted mb-xs">
                      {profile.location}
                    </p>
                  )}

                  {profile.bio && !profile.title && (
                    <p className="text-[13px] text-secondary leading-[1.4] mb-sm">
                      {profile.bio}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-sm">
                    <span className="md-url text-[11px]">
                      /profile/{profile.slug}.md
                    </span>
                    {followers > 0 && (
                      <span className="text-[12px] text-muted">
                        {followers} {followers === 1 ? 'follower' : 'followers'}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
