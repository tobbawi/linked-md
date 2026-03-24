import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'
import { renderWikilinks } from '@/lib/wikilinks'
import Avatar from '@/components/Avatar'
import { CompanyFollowButton } from '@/components/CompanyFollowButton'
import type { Company, Profile, ExperienceEntry, JobListing } from '@/types'

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

  // Check ownership + viewer's follow state
  let isOwner = false
  let myProfileId: string | null = null
  let viewerFollowing = false
  try {
    const authClient = createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    isOwner = !!user && user.id === company.user_id
    if (user) {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
      myProfileId = myProfile?.id ?? null
      if (myProfileId) {
        const { data: followRow } = await supabase
          .from('company_follows')
          .select('company_id')
          .eq('follower_id', myProfileId)
          .eq('company_id', company.id)
          .maybeSingle()
        viewerFollowing = !!followRow
      }
    }
  } catch {
    // not logged in
  }

  // People + jobs + follower count in parallel
  const [{ data: experienceRows }, { data: jobRows }, { count: followerCount }] = await Promise.all([
    supabase
      .from('experience')
      .select('*, profile:profiles!profile_id(slug, display_name)')
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

  type ExperienceWithProfile = ExperienceEntry & {
    profile: Pick<Profile, 'slug' | 'display_name'>
  }
  const people = (experienceRows ?? []) as ExperienceWithProfile[]
  const jobs = (jobRows ?? []) as JobListing[]
  const companyFollowerCount = followerCount ?? 0

  // Wikilink resolution
  const [{ data: profileSlugs }, { data: companySlugs }] = await Promise.all([
    supabase.from('profiles').select('slug'),
    supabase.from('companies').select('slug'),
  ])
  const resolvedProfiles = new Set<string>((profileSlugs ?? []).map((p: { slug: string }) => p.slug))
  const resolvedCompanies = new Set<string>((companySlugs ?? []).map((c: { slug: string }) => c.slug))

  // Render markdown content
  const { remark } = await import('remark')
  const remarkRehype = (await import('remark-rehype')).default
  const rehypeSanitize = (await import('rehype-sanitize')).default
  const rehypeStringify = (await import('rehype-stringify')).default
  const withLinks = renderWikilinks(company.markdown_content, resolvedProfiles, resolvedCompanies)
  const result = await remark().use(remarkRehype).use(rehypeSanitize).use(rehypeStringify).process(withLinks)
  const contentHtml = String(result)

  const mdUrl = `/company/${company.slug}.md`

  return (
    <div style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-xl)', alignItems: 'flex-start' }}>
        {/* Left sidebar */}
        <aside style={{ width: '240px', flexShrink: 0 }}>
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
            {/* Company avatar */}
            <div style={{ marginBottom: 'var(--space-md)' }}>
              <Avatar name={company.name} size={64} shape="square" />
            </div>

            {/* Name + edit */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 'var(--space-sm)',
                marginBottom: company.tagline ? 'var(--space-xs)' : 'var(--space-md)',
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
                {company.name}
              </h1>
              {isOwner && (
                <Link
                  href={`/editor/company?slug=${company.slug}`}
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

            {/* Tagline */}
            {company.tagline && (
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--color-secondary)',
                  lineHeight: 1.4,
                  marginBottom: 'var(--space-md)',
                  fontStyle: 'italic',
                }}
              >
                {company.tagline}
              </p>
            )}

            {/* Website */}
            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  fontSize: '12px',
                  color: 'var(--color-primary)',
                  marginBottom: 'var(--space-md)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {company.website.replace(/^https?:\/\//, '')}
              </a>
            )}

            {/* Jobs badge */}
            {jobs.length > 0 && (
              <div style={{ marginBottom: 'var(--space-sm)' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--color-primary)',
                    background: 'var(--color-primary-light)',
                    border: '1px solid var(--color-primary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 8px',
                  }}
                >
                  {jobs.length} open role{jobs.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}

            {/* Follow button — shown to non-owners who are logged in */}
            {myProfileId && !isOwner && (
              <div style={{ marginBottom: 'var(--space-md)' }}>
                <CompanyFollowButton
                  companySlug={company.slug}
                  initialFollowing={viewerFollowing}
                  followerCount={companyFollowerCount}
                />
              </div>
            )}

            {/* Follower count — shown to owners instead of button */}
            {isOwner && companyFollowerCount > 0 && (
              <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginBottom: 'var(--space-md)' }}>
                {companyFollowerCount} {companyFollowerCount === 1 ? 'follower' : 'followers'}
              </p>
            )}

            {/* Badges */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-xs)',
                marginBottom: people.length > 0 ? 'var(--space-md)' : 0,
              }}
            >
              <a
                href={`/company/${company.slug}/llm.txt`}
                className="llm-badge"
                style={{ alignSelf: 'flex-start' }}
                title="AI-readable company profile summary"
              >
                llm.txt available
              </a>
              <a
                href={`/company/${company.slug}/llm-full.txt`}
                className="llm-badge"
                style={{ alignSelf: 'flex-start' }}
                title="Full AI-readable company profile with all people"
              >
                llm-full.txt
              </a>
              <span className="md-url" style={{ alignSelf: 'flex-start' }}>
                /company/{company.slug}.md
              </span>
            </div>

            {/* People */}
            {people.length > 0 && (
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--color-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: 'var(--space-sm)',
                  }}
                >
                  People ({people.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {people.map((e) => (
                    <div key={e.id}>
                      <Link
                        href={`/profile/${e.profile.slug}`}
                        style={{ fontSize: '13px', color: 'var(--color-text)', fontWeight: 500 }}
                      >
                        {e.profile.display_name}
                      </Link>
                      <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '1px' }}>
                        {e.title}
                        {e.is_current && (
                          <span style={{ marginLeft: '4px', color: 'var(--color-primary)', fontWeight: 500 }}>· now</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Bio */}
          {company.bio && (
            <p
              style={{
                fontSize: '15px',
                color: 'var(--color-secondary)',
                lineHeight: 1.6,
                marginBottom: 'var(--space-xl)',
                paddingBottom: 'var(--space-lg)',
                borderBottom: (company.markdown_content || jobs.length > 0) ? '1px solid var(--color-border)' : 'none',
              }}
            >
              {company.bio}
            </p>
          )}

          {/* Markdown content */}
          {company.markdown_content && (
            <article
              className="prose"
              style={{ fontSize: '16px', lineHeight: 1.75, color: 'var(--color-text)', marginBottom: jobs.length > 0 ? 'var(--space-3xl)' : 0 }}
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
          )}

          {/* Open Roles */}
          {jobs.length > 0 && (
            <section>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-lg)',
                paddingBottom: 'var(--space-md)',
                borderBottom: '1px solid var(--color-border)',
              }}>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--color-ink)' }}>
                  Open Roles
                </h2>
                {isOwner && (
                  <Link
                    href={`/editor/jobs?company=${company.slug}`}
                    style={{
                      fontSize: '12px',
                      color: 'var(--color-secondary)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    Manage jobs
                  </Link>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    style={{
                      padding: 'var(--space-lg)',
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-ink)' }}>
                        {job.title}
                      </h3>
                      <div style={{ display: 'flex', gap: 'var(--space-xs)', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 500,
                          color: 'var(--color-secondary)',
                          background: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '2px 8px',
                        }}>
                          {JOB_TYPE_LABELS[job.type] ?? job.type}
                        </span>
                      </div>
                    </div>
                    {job.location && (
                      <p style={{ fontSize: '13px', color: 'var(--color-secondary)', marginBottom: 'var(--space-sm)' }}>
                        {job.location}
                      </p>
                    )}
                    {job.description_md && (
                      <p style={{ fontSize: '14px', color: 'var(--color-text)', lineHeight: 1.6, marginTop: 'var(--space-sm)' }}>
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

          {isOwner && jobs.length === 0 && (
            <div style={{ marginTop: 'var(--space-xl)', padding: 'var(--space-lg)', background: 'var(--color-card)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '14px', color: 'var(--color-muted)', marginBottom: 'var(--space-sm)' }}>
                No open roles yet.
              </p>
              <Link href={`/editor/jobs?company=${company.slug}`} style={{ fontSize: '13px', color: 'var(--color-primary)' }}>
                Post your first role →
              </Link>
            </div>
          )}

          {!company.bio && !company.markdown_content && jobs.length === 0 && (
            <p style={{ color: 'var(--color-muted)', fontSize: '15px', paddingTop: 'var(--space-lg)' }}>
              No description yet.
              {isOwner && (
                <> <Link href={`/editor/company?slug=${company.slug}`} style={{ color: 'var(--color-primary)' }}>Add one →</Link></>
              )}
            </p>
          )}

          {/* Footer */}
          <div
            style={{
              marginTop: 'var(--space-3xl)',
              paddingTop: 'var(--space-lg)',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 'var(--space-sm)',
            }}
          >
            <Link href="/companies" style={{ fontSize: '13px', color: 'var(--color-secondary)' }}>
              ← All companies
            </Link>
            <a href={mdUrl} className="llm-badge" title="Raw markdown source">
              view .md source
            </a>
          </div>
        </main>
      </div>
    </div>
  )
}
