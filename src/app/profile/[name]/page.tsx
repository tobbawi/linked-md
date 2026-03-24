import Link from 'next/link'
import type { Metadata } from 'next'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'
import { renderWikilinks, extractWikilinks, toSlug } from '@/lib/wikilinks'
import { FollowButton } from '@/components/FollowButton'
import { MessageButton } from '@/components/MessageButton'
import ExperienceSection from '@/components/ExperienceSection'
import EducationSection from '@/components/EducationSection'
import SkillsSection from '@/components/SkillsSection'
import RecommendationsSection from '@/components/RecommendationsSection'
import WriteRecommendationButton from '@/components/WriteRecommendationButton'
import ProfileViewTracker from '@/components/ProfileViewTracker'
import type { Profile, Post, ExperienceEntry, EducationEntry, ProfileSkill, Recommendation } from '@/types'

interface PageProps {
  params: { name: string }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen).trimEnd() + '…'
}

function postPreview(post: Post): string {
  const raw = post.markdown_content
  const stripped = raw
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*?([^*]+)\*\*?/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
  return truncate(stripped, 140)
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createServerClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('slug, display_name, bio')
    .eq('slug', params.name)
    .single<Pick<Profile, 'slug' | 'display_name' | 'bio'>>()

  if (!profile) return { title: 'Profile not found — linked.md' }

  return {
    title: `${profile.display_name} — linked.md`,
    description: profile.bio ?? `${profile.display_name}'s profile on linked.md`,
    openGraph: {
      title: profile.display_name,
      description: profile.bio ?? `${profile.display_name}'s profile on linked.md`,
      url: `https://linked.md/profile/${profile.slug}`,
      type: 'profile',
    },
  }
}

export default async function ProfilePage({ params }: PageProps) {
  const { name } = params
  const supabase = createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', name)
    .single<Profile>()

  if (!profile) {
    return (
      <div style={{ padding: 'var(--space-3xl) var(--space-md)', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.5rem',
            color: 'var(--color-ink)',
            marginBottom: 'var(--space-sm)',
          }}
        >
          Profile not found.
        </h1>
        <p style={{ color: 'var(--color-secondary)', fontSize: '15px' }}>
          <Link href="/" style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
            Go to feed →
          </Link>
        </p>
      </div>
    )
  }

  // Check ownership + viewer identity
  let isOwner = false
  let viewerProfileId: string | null = null
  try {
    const authClient = createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    isOwner = !!user && user.id === profile.user_id
    if (user && !isOwner) {
      const { data: vp } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single<Pick<Profile, 'id'>>()
      viewerProfileId = vp?.id ?? null
    }
  } catch {
    // not logged in
  }

  // Fetch posts, experience, education, skills, recommendations in parallel
  const [
    { data: posts },
    { data: experienceRows },
    { data: educationRows },
    { data: skillRows },
    { data: recommendationRows },
  ] = await Promise.all([
    supabase
      .from('posts')
      .select('*')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .returns<Post[]>(),
    supabase
      .from('experience')
      .select('*')
      .eq('profile_id', profile.id)
      .order('sort_order', { ascending: true })
      .returns<ExperienceEntry[]>(),
    supabase
      .from('education_entries')
      .select('*')
      .eq('profile_id', profile.id)
      .order('sort_order', { ascending: true })
      .returns<EducationEntry[]>(),
    supabase
      .from('profile_skills')
      .select('*, endorsement_count:skill_endorsements(count)')
      .eq('profile_id', profile.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('recommendations')
      .select('*, author:profiles!author_id(slug, display_name)')
      .eq('recipient_id', profile.id)
      .eq('visible', true)
      .order('created_at', { ascending: false })
      .returns<Recommendation[]>(),
  ])

  const allPosts = posts ?? []
  const experience = experienceRows ?? []
  const education = educationRows ?? []
  const recommendations = recommendationRows ?? []

  // Build skills with endorsement counts + viewer endorsement state
  const rawSkills = (skillRows ?? []) as Array<{
    id: string
    name: string
    sort_order: number
    endorsement_count: Array<{ count: number }>
  }>

  // Fetch viewer's endorsements if logged in and not owner
  let viewerEndorsedSkillIds = new Set<string>()
  if (viewerProfileId) {
    const { data: endorsements } = await supabase
      .from('skill_endorsements')
      .select('skill_id')
      .eq('endorser_id', viewerProfileId)
      .in('skill_id', rawSkills.map(s => s.id))
    viewerEndorsedSkillIds = new Set((endorsements ?? []).map(e => e.skill_id))
  }

  const skills: ProfileSkill[] = rawSkills.map(s => ({
    id: s.id,
    profile_id: profile.id,
    name: s.name,
    sort_order: s.sort_order,
    created_at: '',
    endorsement_count: s.endorsement_count[0]?.count ?? 0,
    viewer_has_endorsed: viewerEndorsedSkillIds.has(s.id),
  }))

  // Fetch all profile + company slugs for wikilink resolution
  const [{ data: profileSlugs }, { data: companySlugsData }] = await Promise.all([
    supabase.from('profiles').select('slug'),
    supabase.from('companies').select('slug'),
  ])
  const resolvedSlugs = new Set<string>(
    (profileSlugs ?? []).map((p: { slug: string }) => p.slug)
  )
  const resolvedCompanySlugs = new Set<string>(
    (companySlugsData ?? []).map((c: { slug: string }) => c.slug)
  )

  // Collect outbound wikilinks from profile content
  const profileWikilinks = profile.markdown_content
    ? extractWikilinks(profile.markdown_content)
    : []
  const outboundLinks = Array.from(
    new Set(profileWikilinks.map((n) => JSON.stringify({ name: n, slug: toSlug(n) })))
  ).map((s) => JSON.parse(s) as { name: string; slug: string })

  // Fetch backlinks — profiles that mention this profile via wikilinks
  const { data: backlinkProfiles } = await supabase
    .from('profiles')
    .select('slug, display_name')
    .contains('outbound_links', [profile.slug])
    .neq('slug', profile.slug)

  const backlinks = backlinkProfiles ?? []

  // Social counts + follow state
  const [{ count: followerCount }, { count: followingCount }, followRow] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('followee_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    viewerProfileId
      ? supabase.from('follows').select('id').eq('follower_id', viewerProfileId).eq('followee_id', profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const isFollowing = !!followRow.data

  return (
    <div style={{ padding: 'var(--space-xl) 0' }}>
      <ProfileViewTracker profileSlug={name} />
      <div className="sidebar-layout" style={{ display: 'flex', gap: 'var(--space-xl)', alignItems: 'flex-start' }}>
        {/* Left column — profile card */}
        <aside className="sidebar" style={{ width: '240px', flexShrink: 0 }}>
          <div
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-lg)',
              position: 'sticky',
              top: '72px',
            }}
          >
            {/* Avatar */}
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-primary-light)',
                border: '2px solid var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--color-primary)',
                fontFamily: 'var(--font-serif)',
                marginBottom: 'var(--space-md)',
              }}
            >
              {profile.display_name.charAt(0).toUpperCase()}
            </div>

            {/* Display name + edit button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 'var(--space-sm)',
                marginBottom: profile.bio ? 'var(--space-sm)' : 'var(--space-md)',
              }}
            >
              <h1
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.125rem',
                  color: 'var(--color-ink)',
                  lineHeight: 1.3,
                }}
              >
                {profile.display_name}
              </h1>
              {isOwner && (
                <Link
                  href="/editor"
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--color-secondary)',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Edit
                </Link>
              )}
            </div>

            {/* Title */}
            {profile.title && (
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--color-text)',
                  fontWeight: 500,
                  marginBottom: 'var(--space-xs)',
                }}
              >
                {profile.title}
              </p>
            )}

            {/* Location */}
            {profile.location && (
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--color-muted)',
                  marginBottom: profile.website || profile.bio ? 'var(--space-xs)' : 'var(--space-md)',
                }}
              >
                {profile.location}
              </p>
            )}

            {/* Website */}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  fontSize: '13px',
                  color: 'var(--color-primary)',
                  marginBottom: profile.bio ? 'var(--space-xs)' : 'var(--space-md)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}

            {/* Bio */}
            {profile.bio && (
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--color-secondary)',
                  lineHeight: 1.5,
                  marginBottom: 'var(--space-md)',
                }}
              >
                {profile.bio}
              </p>
            )}

            {/* Follow button (non-owners) + follower/following counts */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              {!isOwner && viewerProfileId && (
                <div style={{ marginBottom: 'var(--space-sm)', display: 'flex', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
                  <FollowButton
                    followeeSlug={name}
                    initialFollowing={isFollowing}
                    followerCount={followerCount ?? 0}
                  />
                  <MessageButton recipientSlug={name} />
                </div>
              )}
              {(isOwner || !viewerProfileId) && (
                <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                    <strong style={{ color: 'var(--color-text)' }}>{followerCount ?? 0}</strong>{' '}
                    {(followerCount ?? 0) === 1 ? 'follower' : 'followers'}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
                    <strong style={{ color: 'var(--color-text)' }}>{followingCount ?? 0}</strong>{' '}
                    following
                  </span>
                </div>
              )}
            </div>

            {/* Badges */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-xs)',
                marginBottom:
                  outboundLinks.length > 0 || backlinks.length > 0 ? 'var(--space-md)' : 0,
              }}
            >
              <a
                href={`/profile/${name}/llm.txt`}
                className="llm-badge"
                style={{ alignSelf: 'flex-start' }}
                title="AI-readable profile summary"
              >
                llm.txt available
              </a>
              <a
                href={`/profile/${name}/llm-full.txt`}
                className="llm-badge"
                style={{ alignSelf: 'flex-start' }}
                title="Full AI-readable profile with experience + posts"
              >
                llm-full.txt
              </a>
              <span className="md-url" style={{ alignSelf: 'flex-start' }}>
                /profile/{name}.md
              </span>
            </div>

            {/* Outbound wikilinks */}
            {(outboundLinks.length > 0 || (profile.company_links ?? []).length > 0) && (
              <div style={{ marginBottom: backlinks.length > 0 ? 'var(--space-md)' : 0 }}>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--color-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 'var(--space-xs)',
                  }}
                >
                  Links to
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                  {outboundLinks.map(({ name: linkName, slug: linkSlug }) =>
                    resolvedSlugs.has(linkSlug) ? (
                      <Link
                        key={`p:${linkSlug}`}
                        href={`/profile/${linkSlug}`}
                        className="wikilink-resolved"
                        style={{ fontSize: '13px' }}
                      >
                        {linkName}
                      </Link>
                    ) : (
                      <span
                        key={`p:${linkSlug}`}
                        className="wikilink-unresolved"
                        style={{ fontSize: '13px' }}
                        title="Profile not found"
                      >
                        {linkName}
                      </span>
                    )
                  )}
                  {(profile.company_links ?? []).map((companySlug) => (
                    <Link
                      key={`c:${companySlug}`}
                      href={`/company/${companySlug}`}
                      className="wikilink-resolved"
                      style={{ fontSize: '12px' }}
                    >
                      {companySlug}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Backlinks */}
            {backlinks.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--color-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 'var(--space-xs)',
                  }}
                >
                  Mentioned by
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)' }}>
                  {backlinks.map((b) => (
                    <Link
                      key={b.slug}
                      href={`/profile/${b.slug}`}
                      className="wikilink-resolved"
                      style={{ fontSize: '12px' }}
                    >
                      {b.display_name}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right column — experience, education, skills, recommendations, posts */}
        <main style={{ flex: 1, minWidth: 0 }}>
          <ExperienceSection experience={experience} />
          <EducationSection education={education} />
          <SkillsSection
            skills={skills}
            isOwner={isOwner}
            isLoggedIn={isOwner || !!viewerProfileId}
          />
          <RecommendationsSection
            recommendations={recommendations}
            isOwner={isOwner}
          />

          {/* Write recommendation — visible to logged-in non-owners */}
          {!isOwner && viewerProfileId && (
            <WriteRecommendationButton
              recipientId={profile.id}
              recipientName={profile.display_name}
            />
          )}

          {isOwner && (
            <div style={{ marginBottom: 'var(--space-md)', textAlign: 'right' }}>
              <Link
                href="/editor?mode=post"
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
                + New post
              </Link>
            </div>
          )}

          {allPosts.length === 0 ? (
            <p style={{ color: 'var(--color-muted)', fontSize: '15px', paddingTop: 'var(--space-lg)' }}>
              {isOwner ? (
                <>No posts yet. <Link href="/editor?mode=post" style={{ color: 'var(--color-primary)' }}>Write your first post →</Link></>
              ) : (
                'No posts yet.'
              )}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {allPosts.map((post) => {
                const rawPreview = postPreview(post).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]!))
                const postWikilinksHtml = renderWikilinks(rawPreview, resolvedSlugs, resolvedCompanySlugs)
                return (
                  <article
                    key={post.id}
                    style={{
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-lg)',
                    }}
                  >
                    {post.title && (
                      <Link href={`/profile/${name}/post/${post.slug}`}>
                        <h2
                          style={{
                            fontFamily: 'var(--font-serif)',
                            fontSize: '1.125rem',
                            color: 'var(--color-ink)',
                            marginBottom: 'var(--space-xs)',
                            lineHeight: 1.35,
                          }}
                        >
                          {post.title}
                        </h2>
                      </Link>
                    )}

                    <p
                      className="prose"
                      style={{
                        fontSize: '15px',
                        color: 'var(--color-text)',
                        lineHeight: 1.6,
                        marginBottom: 'var(--space-md)',
                      }}
                      dangerouslySetInnerHTML={{ __html: postWikilinksHtml }}
                    />

                    {(post.tags ?? []).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: 'var(--space-sm)' }}>
                        {post.tags.map((tag) => (
                          <a
                            key={tag}
                            href={`/tag/${tag}`}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              background: 'var(--color-primary-light)',
                              color: 'var(--color-primary)',
                              borderRadius: 'var(--radius-sm)',
                              fontWeight: 500,
                            }}
                          >
                            {tag}
                          </a>
                        ))}
                      </div>
                    )}
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
                        <time
                          dateTime={post.created_at}
                          style={{ fontSize: '13px', color: 'var(--color-muted)' }}
                        >
                          {formatDate(post.created_at)}
                        </time>
                        <Link
                          href={`/profile/${name}/post/${post.slug}`}
                          style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-primary)' }}
                        >
                          Read →
                        </Link>
                      </div>
                      <span className="md-url">
                        /profile/{name}/post/{post.slug}.md
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
