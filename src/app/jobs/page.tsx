import Link from 'next/link'
import type { Metadata } from 'next'
import { createServerClient } from '@/lib/supabase'
import type { JobListing, Company } from '@/types'

export const metadata: Metadata = {
  title: 'Jobs — linked.md',
  description: 'Open roles at companies on linked.md',
}

const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  'contract': 'Contract',
  'internship': 'Internship',
}

type JobWithCompany = JobListing & {
  company: Pick<Company, 'name' | 'slug'>
}

export default async function JobsPage() {
  const supabase = createServerClient()

  const { data: jobs } = await supabase
    .from('job_listings')
    .select('*, company:companies!company_id(name, slug)')
    .eq('active', true)
    .order('created_at', { ascending: false })
    .returns<JobWithCompany[]>()

  const allJobs = jobs ?? []

  return (
    <div style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
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
            Open Roles
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--color-secondary)' }}>
            {allJobs.length} role{allJobs.length !== 1 ? 's' : ''} at companies on linked.md
          </p>
        </div>

        {/* Job list */}
        {allJobs.length === 0 ? (
          <p style={{ color: 'var(--color-muted)', fontSize: '15px' }}>
            No open roles yet.{' '}
            <Link href="/companies" style={{ color: 'var(--color-primary)' }}>
              Browse companies →
            </Link>
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {allJobs.map((job) => (
              <Link
                key={job.id}
                href={`/company/${job.company.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <div
                  style={{
                    padding: 'var(--space-lg)',
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    transition: 'border-color 150ms ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 'var(--space-md)',
                      marginBottom: 'var(--space-xs)',
                    }}
                  >
                    <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {job.title}
                    </h2>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        color: 'var(--color-secondary)',
                        background: 'var(--color-bg)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '2px 8px',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {JOB_TYPE_LABELS[job.type] ?? job.type}
                    </span>
                  </div>

                  <p style={{ fontSize: '13px', color: 'var(--color-primary)', marginBottom: job.location ? 'var(--space-xs)' : 0 }}>
                    {job.company.name}
                  </p>

                  {job.location && (
                    <p style={{ fontSize: '13px', color: 'var(--color-secondary)', marginBottom: job.description_md ? 'var(--space-sm)' : 0 }}>
                      {job.location}
                    </p>
                  )}

                  {job.description_md && (
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-muted)',
                        lineHeight: 1.5,
                        marginTop: 'var(--space-xs)',
                      }}
                    >
                      {job.description_md.length > 200
                        ? job.description_md.slice(0, 200) + '…'
                        : job.description_md}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
    </div>
  )
}
