import Link from 'next/link'
import type { Metadata } from 'next'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'
import { renderWikilinks, extractWikilinks, toSlug } from '@/lib/wikilinks'
import Avatar from '@/components/Avatar'
import { FollowButton } from '@/components/FollowButton'
import { MessageButton } from '@/components/MessageButton'
import ExperienceSection from '@/components/ExperienceSection'
import EducationSection from '@/components/EducationSection'
import SkillsSection from '@/components/SkillsSection'
import RecommendationsSection from '@/components/RecommendationsSection'
import WriteRecommendationButton from '@/components/WriteRecommendationButton'
import ProfileViewTracker from '@/components/ProfileViewTracker'
import { FilepathBar } from '@/components/ui'
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
      <div className="py-3xl px-md text-center">
        <h1 className="font-serif text-xl text-ink mb-sm">Profile not found.</h1>
        <p className="text-secondary text-[15px]">
          <Link href="/" className="text-primary font-medium">Go to feed →</Link>
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
    <div>
      {/* Document metaphor: filepath bar */}
      <FilepathBar path={`/profile/${name}.md`} href={`/profile/${name}.md`} />

      <div className="py-xl">
        <ProfileViewTracker profileSlug={name} />
        <div className="sidebar-layout flex gap-xl items-start">
          {/* Left column — profile card */}
          <aside className="sidebar w-[260px] shrink-0">
            <div className="bg-card border border-border rounded-lg p-lg sticky top-[72px]">
              {/* Avatar */}
              <div className="mb-md">
                <Avatar name={profile.display_name} avatarUrl={profile.avatar_url} size={72} />
              </div>

              {/* Display name + .md badge (promoted to name-level) */}
              <div className="flex items-start justify-between gap-sm mb-xs">
                <h1 className="font-serif text-lg text-ink leading-tight">
                  {profile.display_name}
                </h1>
                {isOwner && (
                  <Link
                    href="/editor"
                    className="text-[11px] font-medium text-secondary px-2 py-0.5 rounded-sm border border-border shrink-0 whitespace-nowrap hover:border-primary transition-colors"
                  >
                    Edit
                  </Link>
                )}
              </div>

              {/* .md URL badge — promoted to just below name */}
              <span className="md-url mb-sm block w-fit">
                /profile/{name}.md
              </span>

              {/* Title */}
              {profile.title && (
                <p className="text-[13px] text-text font-medium mb-xs">
                  {profile.title}
                </p>
              )}

              {/* Location */}
              {profile.location && (
                <p className="text-[13px] text-muted mb-xs">
                  {profile.location}
                </p>
              )}

              {/* Website */}
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[13px] text-primary mb-xs overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}

              {/* Bio */}
              {profile.bio && (
                <p className="text-[13px] text-secondary leading-relaxed mb-md">
                  {profile.bio}
                </p>
              )}

              {/* Follow button (non-owners) + follower/following counts */}
              <div className="mb-md">
                {!isOwner && viewerProfileId && (
                  <div className="mb-sm flex gap-xs flex-wrap">
                    <FollowButton
                      followeeSlug={name}
                      initialFollowing={isFollowing}
                      followerCount={followerCount ?? 0}
                    />
                    <MessageButton recipientSlug={name} />
                  </div>
                )}
                {(isOwner || !viewerProfileId) && (
                  <div className="flex gap-md">
                    <span className="text-[13px] text-muted">
                      <strong className="text-text">{followerCount ?? 0}</strong>{' '}
                      {(followerCount ?? 0) === 1 ? 'follower' : 'followers'}
                    </span>
                    <span className="text-[13px] text-muted">
                      <strong className="text-text">{followingCount ?? 0}</strong>{' '}
                      following
                    </span>
                  </div>
                )}
              </div>

              {/* LLM badges */}
              <div className="flex flex-col gap-xs mb-md">
                <a
                  href={`/profile/${name}/llm.txt`}
                  className="llm-badge self-start"
                  title="AI-readable profile summary"
                >
                  llm.txt available
                </a>
                <a
                  href={`/profile/${name}/llm-full.txt`}
                  className="llm-badge self-start"
                  title="Full AI-readable profile with experience + posts"
                >
                  llm-full.txt
                </a>
              </div>

              {/* Outbound wikilinks */}
              {(outboundLinks.length > 0 || (profile.company_links ?? []).length > 0) && (
                <div className={backlinks.length > 0 ? 'mb-md' : ''}>
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-xs">
                    Links to
                  </p>
                  <div className="flex flex-wrap gap-xs">
                    {outboundLinks.map(({ name: linkName, slug: linkSlug }) =>
                      resolvedSlugs.has(linkSlug) ? (
                        <Link
                          key={`p:${linkSlug}`}
                          href={`/profile/${linkSlug}`}
                          className="wikilink-resolved text-[13px]"
                        >
                          {linkName}
                        </Link>
                      ) : (
                        <span
                          key={`p:${linkSlug}`}
                          className="wikilink-unresolved text-[13px]"
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
                        className="wikilink-resolved text-[12px]"
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
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-xs">
                    Mentioned by
                  </p>
                  <div className="flex flex-wrap gap-xs">
                    {backlinks.map((b) => (
                      <Link
                        key={b.slug}
                        href={`/profile/${b.slug}`}
                        className="wikilink-resolved text-[12px]"
                      >
                        {b.display_name}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Right column — document gutter + content */}
          <main className="flex-1 min-w-0 border-l-2 border-border pl-lg">
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
              <div className="mb-md text-right">
                <Link
                  href="/editor?mode=post"
                  className="text-[13px] font-medium text-primary px-3.5 py-1.5 rounded-sm bg-primary-light border border-primary hover:bg-primary hover:text-white transition-colors"
                >
                  + New post
                </Link>
              </div>
            )}

            {allPosts.length === 0 ? (
              <p className="text-muted text-[15px] pt-lg">
                {isOwner ? (
                  <>No posts yet. <Link href="/editor?mode=post" className="text-primary">Write your first post →</Link></>
                ) : (
                  'No posts yet.'
                )}
              </p>
            ) : (
              <div className="flex flex-col gap-md">
                {allPosts.map((post) => {
                  const rawPreview = postPreview(post).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]!))
                  const postWikilinksHtml = renderWikilinks(rawPreview, resolvedSlugs, resolvedCompanySlugs)
                  return (
                    <article
                      key={post.id}
                      className="bg-card border border-border rounded-md p-lg hover:border-primary hover:shadow-sm transition-all"
                    >
                      {post.title && (
                        <Link href={`/profile/${name}/post/${post.slug}`}>
                          <h2 className="font-serif text-lg text-ink mb-xs leading-snug hover:text-primary transition-colors">
                            {post.title}
                          </h2>
                        </Link>
                      )}

                      <p
                        className="prose text-[15px] text-text leading-relaxed mb-md"
                        dangerouslySetInnerHTML={{ __html: postWikilinksHtml }}
                      />

                      {(post.tags ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-sm">
                          {post.tags.map((tag) => (
                            <a
                              key={tag}
                              href={`/tag/${tag}`}
                              className="text-[11px] px-sm py-xs bg-primary-light text-primary rounded-sm font-medium hover:bg-primary hover:text-white transition-colors min-h-[28px] inline-flex items-center"
                            >
                              {tag}
                            </a>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between flex-wrap gap-sm">
                        <div className="flex items-center gap-md">
                          <time dateTime={post.created_at} className="text-[13px] text-muted">
                            {formatDate(post.created_at)}
                          </time>
                          <Link
                            href={`/profile/${name}/post/${post.slug}`}
                            className="text-[13px] font-medium text-primary hover:underline"
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
    </div>
  )
}
