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
    <div className="pt-xl pb-3xl">
        {/* Header */}
        <div className="mb-xl">
          <h1 className="font-serif text-[1.25rem] text-ink mb-xs">
            Open Roles
          </h1>
          <p className="text-[14px] text-secondary">
            {allJobs.length} role{allJobs.length !== 1 ? 's' : ''} at companies on linked.md
          </p>
        </div>

        {/* Job list */}
        {allJobs.length === 0 ? (
          <p className="text-muted text-[15px]">
            No open roles yet.{' '}
            <Link href="/companies" className="text-primary">
              Browse companies →
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-md">
            {allJobs.map((job) => (
              <Link
                key={job.id}
                href={`/company/${job.company.slug}`}
                className="no-underline"
              >
                <div className="p-lg bg-card border border-border rounded-md transition-colors duration-150">
                  <div className="flex items-start justify-between gap-md mb-xs">
                    <h2 className="text-[15px] font-semibold text-ink">
                      {job.title}
                    </h2>
                    <span className="text-[11px] font-medium text-secondary bg-bg border border-border rounded-sm py-[2px] px-[8px] shrink-0 whitespace-nowrap">
                      {JOB_TYPE_LABELS[job.type] ?? job.type}
                    </span>
                  </div>

                  <p
                    className="text-[13px] text-primary"
                    style={{ marginBottom: job.location ? 'var(--space-xs)' : 0 }}
                  >
                    {job.company.name}
                  </p>

                  {job.location && (
                    <p
                      className="text-[13px] text-secondary"
                      style={{ marginBottom: job.description_md ? 'var(--space-sm)' : 0 }}
                    >
                      {job.location}
                    </p>
                  )}

                  {job.description_md && (
                    <p className="text-[13px] text-muted leading-[1.5] mt-xs">
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
