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
    <div style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: 'var(--space-lg)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.25rem',
            color: 'var(--color-ink)',
          }}
        >
          People
        </h1>
        {isLoggedIn && (
          <Link
            href="/editor"
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
            Edit your profile
          </Link>
        )}
      </div>

      {allProfiles.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-3xl) 0', color: 'var(--color-muted)' }}>
          <p style={{ fontSize: '15px' }}>No profiles yet.</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--space-md)',
          }}
        >
          {allProfiles.map((profile) => {
            const followers = followerMap.get(profile.id) ?? 0
            return (
              <Link
                key={profile.id}
                href={`/profile/${profile.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="company-card">
                  {/* Avatar */}
                  <div style={{ marginBottom: 'var(--space-sm)' }}>
                    <Avatar name={profile.display_name} avatarUrl={profile.avatar_url} size={40} />
                  </div>

                  <h2
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1rem',
                      color: 'var(--color-ink)',
                      marginBottom: profile.title ? '2px' : 'var(--space-xs)',
                      lineHeight: 1.3,
                    }}
                  >
                    {profile.display_name}
                  </h2>

                  {profile.title && (
                    <p style={{ fontSize: '12px', color: 'var(--color-text)', fontWeight: 500, marginBottom: '2px' }}>
                      {profile.title}
                    </p>
                  )}

                  {profile.location && (
                    <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginBottom: 'var(--space-xs)' }}>
                      {profile.location}
                    </p>
                  )}

                  {profile.bio && !profile.title && (
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-secondary)',
                        lineHeight: 1.4,
                        marginBottom: 'var(--space-sm)',
                      }}
                    >
                      {profile.bio}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'var(--space-sm)',
                    }}
                  >
                    <span className="md-url" style={{ fontSize: '11px' }}>
                      /profile/{profile.slug}.md
                    </span>
                    {followers > 0 && (
                      <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
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
