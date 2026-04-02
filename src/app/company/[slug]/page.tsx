import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'
import { renderWikilinks } from '@/lib/wikilinks'
import Avatar from '@/components/Avatar'
import { CompanyFollowButton } from '@/components/CompanyFollowButton'
import { FilepathBar } from '@/components/ui'
import type { Company, Profile, ExperienceEntry, JobListing, CompanyMember } from '@/types'

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createServerClient()
  const { data: company } = await supabase
    .from('companies')
    .select('name, tagline, slug')
    .eq('slug', params.slug)
    .single<Pick<Company, 'name' | 'tagline' | 'slug'>>()

  if (!company) return { title: 'Company not found — linked.md' }

  return {
    title: `${company.name} — linked.md`,
    description: company.tagline ?? `${company.name} on linked.md`,
    openGraph: {
      title: company.name,
      description: company.tagline ?? `${company.name} on linked.md`,
      url: `https://linked.md/company/${company.slug}`,
      type: 'website',
    },
  }
}

const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  'contract': 'Contract',
  'internship': 'Internship',
}

export default async function CompanyPage({ params }: PageProps) {
  const supabase = createServerClient()

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', params.slug)
    .single<Company>()

  if (!company) notFound()

  // ── Viewer auth + admin check ─────────────────────────────────────────────
  let isAdmin = false
  let isOriginalCreator = false
  let myProfileId: string | null = null
  let viewerFollowing = false
  try {
    const authClient = createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (user) {
      isOriginalCreator = user.id === company.user_id
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      myProfileId = myProfile?.id ?? null

      if (myProfileId) {
        // Check admin membership
        const { data: membership } = await supabase
          .from('company_members')
          .select('role')
          .eq('company_id', company.id)
          .eq('profile_id', myProfileId)
          .maybeSingle()
        isAdmin = !!membership

        // Follow state (for non-original-creators)
        if (!isOriginalCreator) {
          const { data: followRow } = await supabase
            .from('company_follows')
            .select('company_id')
            .eq('follower_id', myProfileId)
            .eq('company_id', company.id)
            .maybeSingle()
          viewerFollowing = !!followRow
        }
      }
    }
  } catch {
    // not logged in
  }

  // ── Data fetching ─────────────────────────────────────────────────────────
  type MemberWithProfile = CompanyMember & {
    profile: Pick<Profile, 'id' | 'slug' | 'display_name' | 'user_id' | 'avatar_url'>
  }

  // Fetch company_members separately so a missing table (migration not yet applied)
  // degrades gracefully to an empty list rather than crashing the whole page.
  const memberRowsResult = await supabase
    .from('company_members')
    .select('*, profile:profiles!profile_id(id, slug, display_name, user_id, avatar_url)')
    .eq('company_id', company.id)
    .order('created_at', { ascending: true })
    .returns<MemberWithProfile[]>()

  const [
    { data: experienceRows },
    { data: jobRows },
    { count: followerCount },
  ] = await Promise.all([
    supabase
      .from('experience')
      .select('*, profile:profiles!profile_id(id, slug, display_name)')
      .eq('company_slug', company.slug)
      .order('is_current', { ascending: false })
      .order('end_year', { ascending: false, nullsFirst: true }),
    supabase
      .from('job_listings')
      .select('*')
      .eq('company_id', company.id)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .returns<JobListing[]>(),
    supabase
      .from('company_follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('company_id', company.id),
  ])

  const memberRows = memberRowsResult.error ? null : memberRowsResult.data

  type ExperienceWithProfile = ExperienceEntry & {
    profile: Pick<Profile, 'id' | 'slug' | 'display_name'>
  }
  const people = (experienceRows ?? []) as ExperienceWithProfile[]
  const jobs = (jobRows ?? []) as JobListing[]
  const members = (memberRows ?? []) as MemberWithProfile[]
  const companyFollowerCount = followerCount ?? 0

  // Build a set of admin profile_ids for O(1) badge lookup (keyed by UUID, not slug, to avoid false positives on slug reuse)
  const adminProfileIds = new Set(members.map(m => m.profile_id).filter(Boolean))
  // Build a map of slug → user_id for owner chip detection without repeated .find()
  const memberSlugToUserId = new Map(
    members.filter(m => m.profile).map(m => [m.profile!.slug, m.profile!.user_id])
  )
  // My slug (for "you" chip)
  const myProfileSlug = members.find(m => m.profile_id === myProfileId)?.profile?.slug ?? null

  // ── Wikilink resolution + markdown render ─────────────────────────────────
  const [{ data: profileSlugs }, { data: companySlugs }] = await Promise.all([
    supabase.from('profiles').select('slug'),
    supabase.from('companies').select('slug'),
  ])
  const resolvedProfiles = new Set<string>((profileSlugs ?? []).map((p: { slug: string }) => p.slug))
  const resolvedCompanies = new Set<string>((companySlugs ?? []).map((c: { slug: string }) => c.slug))

  const { remark } = await import('remark')
  const remarkRehype = (await import('remark-rehype')).default
  const rehypeSanitize = (await import('rehype-sanitize')).default
  const rehypeStringify = (await import('rehype-stringify')).default
  const withLinks = renderWikilinks(company.markdown_content, resolvedProfiles, resolvedCompanies)
  const result = await remark().use(remarkRehype).use(rehypeSanitize).use(rehypeStringify).process(withLinks)
  const contentHtml = String(result)

  const mdUrl = `/company/${company.slug}.md`
  const slug = params.slug

  return (
    <div>
      <FilepathBar path={"/company/" + slug + ".md"} href={"/company/" + slug + ".md"} />
      <div className="pt-xl pb-3xl">
      <div className="flex gap-xl items-start">
        {/* Left sidebar */}
        <aside className="w-[240px] shrink-0">
          <div className="bg-card border border-border rounded-lg p-lg sticky top-[72px]">
            {/* Company avatar */}
            <div className="mb-md">
              <Avatar name={company.name} size={64} shape="square" />
            </div>

            {/* Name + edit */}
            <div
              className="flex items-start justify-between gap-sm"
              style={{
                marginBottom: company.tagline ? 'var(--space-xs)' : 'var(--space-md)',
              }}
            >
              <h1 className="font-serif text-[1.125rem] text-ink leading-[1.3]">
                {company.name}
              </h1>
              {isAdmin && (
                <Link
                  href={`/editor/company?slug=${company.slug}`}
                  className="text-[11px] font-medium text-secondary py-[3px] px-[8px] rounded-sm border border-border shrink-0 whitespace-nowrap"
                >
                  Edit
                </Link>
              )}
            </div>

            {/* Tagline */}
            {company.tagline && (
              <p className="text-[13px] text-secondary leading-[1.4] mb-md italic">
                {company.tagline}
              </p>
            )}

            {/* Website */}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[12px] text-primary mb-md overflow-hidden text-ellipsis whitespace-nowrap"
              >
                {company.website.replace(/^https?:\/\//, '')}
              </a>
            )}

            {/* Jobs badge */}
            {jobs.length > 0 && (
              <div className="mb-sm">
                <span className="inline-flex items-center gap-[4px] text-[11px] font-medium text-primary bg-primary-light border border-primary rounded-sm py-[2px] px-[8px]">
                  {jobs.length} open role{jobs.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Follow button — for logged-in non-creators (co-admins can follow too) */}
            {myProfileId && !isOriginalCreator && (
              <div className="mb-md">
                <CompanyFollowButton
                  companySlug={company.slug}
                  initialFollowing={viewerFollowing}
                  followerCount={companyFollowerCount}
                />
              </div>
            )}

            {/* Follower count — shown to original creator only */}
            {isOriginalCreator && companyFollowerCount > 0 && (
              <p className="text-[12px] text-muted mb-md">
                {companyFollowerCount} {companyFollowerCount === 1 ? 'follower' : 'followers'}
              </p>
            )}

            {/* Badges */}
            <div
              className="flex flex-col gap-xs"
              style={{ marginBottom: people.length > 0 ? 'var(--space-md)' : 0 }}
            >
              <a
                href={`/company/${company.slug}/llm.txt`}
                className="llm-badge self-start"
                title="AI-readable company profile summary"
              >
                llm.txt available
              </a>
              <a
                href={`/company/${company.slug}/llm-full.txt`}
                className="llm-badge self-start"
                title="Full AI-readable company profile with all people"
              >
                llm-full.txt
              </a>
              <span className="md-url self-start">
                /company/{company.slug}.md
              </span>
            </div>

            {/* Admins not visible in People — show "Managed by" fallback */}
            {(() => {
              const peopleProfileIds = new Set(people.map(e => e.profile.id))
              const hiddenAdmins = members.filter(m => m.profile && !peopleProfileIds.has(m.profile_id))
              if (hiddenAdmins.length === 0) return null
              return (
                <div className="mb-md">
                  <p className="text-[11px] font-medium text-muted uppercase tracking-[0.05em] mb-sm">
                    Managed by
                  </p>
                  {hiddenAdmins.map(m => (
                    <div key={m.profile_id} className="flex items-center gap-[6px] mb-[4px]">
                      <Link href={`/profile/${m.profile!.slug}`} className="text-[13px] text-text font-medium">
                        {m.profile!.display_name}
                      </Link>
                      <span className="inline-flex items-center text-[10px] font-semibold tracking-[0.04em] uppercase text-secondary bg-bg border border-border rounded-sm py-[1px] px-[6px]">
                        {m.profile!.user_id === company.user_id ? 'owner' : 'admin'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}

            {/* People — with admin badges */}
            {people.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-muted uppercase tracking-[0.05em] mb-sm">
                  People ({people.length})
                </p>
                <div className="flex flex-col gap-sm">
                  {people.map((e) => {
                    const isPersonAdmin = adminProfileIds.has(e.profile.id)
                    const isYou = myProfileSlug === e.profile.slug
                    return (
                      <div key={e.id}>
                        <div className="flex items-center gap-[6px] flex-wrap">
                          <Link
                            href={`/profile/${e.profile.slug}`}
                            className="text-[13px] text-text font-medium"
                          >
                            {e.profile.display_name}
                          </Link>
                          {isPersonAdmin && (
                            <span className="inline-flex items-center text-[10px] font-semibold tracking-[0.04em] uppercase text-secondary bg-bg border border-border rounded-sm py-[1px] px-[6px]">
                              {memberSlugToUserId.get(e.profile.slug) === company.user_id ? 'owner' : 'admin'}
                            </span>
                          )}
                          {isYou && <span className="inline-flex items-center text-[10px] font-semibold tracking-[0.04em] uppercase text-primary bg-primary-light border border-primary/20 rounded-sm py-[1px] px-[6px]">you</span>}
                        </div>
                        <div className="text-[11px] text-muted mt-[1px]">
                          {e.title}
                          {e.is_current && (
                            <span className="ml-[4px] text-primary font-medium">· now</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Manage admins link — visible to admins only */}
                {isAdmin && (
                  <Link
                    href={`/editor/company?slug=${company.slug}&tab=team`}
                    className="block mt-md text-[12px] text-primary"
                  >
                    Manage admins →
                  </Link>
                )}
              </div>
            )}

            {/* Show manage link even if no people yet */}
            {isAdmin && people.length === 0 && (
              <Link
                href={`/editor/company?slug=${company.slug}&tab=team`}
                className="block text-[12px] text-primary mt-xs"
              >
                Manage admins →
              </Link>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Bio */}
          {company.bio && (
            <p
              className="text-[15px] text-secondary leading-[1.6] mb-xl pb-lg"
              style={{
                borderBottom: (company.markdown_content || jobs.length > 0) ? '1px solid var(--color-border)' : 'none',
              }}
            >
              {company.bio}
            </p>
          )}

          {/* Markdown content */}
          {company.markdown_content && (
            <article
              className="prose text-[16px] leading-[1.75] text-text"
              style={{ marginBottom: jobs.length > 0 ? 'var(--space-3xl)' : 0 }}
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          )}

          {/* Open Roles */}
          {jobs.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-lg pb-md border-b border-border">
                <h2 className="font-serif text-[1.25rem] text-ink">
                  Open Roles
                </h2>
                {/* REGRESSION: co-admin can manage jobs (company_admins policy) */}
                {isAdmin && (
                  <Link
                    href={`/editor/jobs?company=${company.slug}`}
                    className="text-[12px] text-secondary py-[4px] px-[10px] rounded-sm border border-border"
                  >
                    Manage jobs
                  </Link>
                )}
              </div>
              <div className="flex flex-col gap-lg">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="p-lg bg-card border border-border rounded-md"
                  >
                    <div className="flex items-start justify-between gap-md mb-sm">
                      <h3 className="text-[16px] font-semibold text-ink">
                        {job.title}
                      </h3>
                      <div className="flex gap-xs shrink-0">
                        <span className="text-[11px] font-medium text-secondary bg-bg border border-border rounded-sm py-[2px] px-[8px]">
                          {JOB_TYPE_LABELS[job.type] ?? job.type}
                        </span>
                      </div>
                    </div>
                    {job.location && (
                      <p className="text-[13px] text-secondary mb-sm">
                        {job.location}
                      </p>
                    )}
                    {job.description_md && (
                      <p className="text-[14px] text-text leading-[1.6] mt-sm">
                        {job.description_md.length > 300
                          ? job.description_md.slice(0, 300) + '…'
                          : job.description_md}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {isAdmin && jobs.length === 0 && (
            <div className="mt-xl p-lg bg-card border border-dashed border-border rounded-md">
              <p className="text-[14px] text-muted mb-sm">
                No open roles yet.
              </p>
              <Link href={`/editor/jobs?company=${company.slug}`} className="text-[13px] text-primary">
                Post your first role →
              </Link>
            </div>
          )}

          {!company.bio && !company.markdown_content && jobs.length === 0 && (
            <p className="text-muted text-[15px] pt-lg">
              No description yet.
              {isAdmin && (
                <> <Link href={`/editor/company?slug=${company.slug}`} className="text-primary">Add one →</Link></>
              )}
            </p>
          )}

          {/* Footer */}
          <div className="mt-3xl pt-lg border-t border-border flex items-center justify-between flex-wrap gap-sm">
            <Link href="/companies" className="text-[13px] text-secondary">
              ← All companies
            </Link>
            <a href={mdUrl} className="llm-badge" title="Raw markdown source">
              view .md source
            </a>
          </div>
        </main>
      </div>
      </div>
    </div>
  )
}
