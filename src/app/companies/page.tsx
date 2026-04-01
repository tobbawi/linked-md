import Link from 'next/link'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'
import Avatar from '@/components/Avatar'
import type { Company } from '@/types'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default async function CompaniesPage() {
  const supabase = createServerClient()

  let isLoggedIn = false
  try {
    const authClient = createAuthServerClient()
    const { data: { user } } = await authClient.auth.getUser()
    isLoggedIn = !!user
  } catch {
    // not logged in
  }

  const { data: companies } = await supabase
    .from('companies')
    .select('*')
    .order('created_at', { ascending: false })
    .returns<Company[]>()

  // Count employees per company
  const { data: profileLinks } = await supabase
    .from('profiles')
    .select('company_links')
  const employeeCountMap = new Map<string, number>()
  for (const row of profileLinks ?? []) {
    for (const slug of (row.company_links ?? []) as string[]) {
      employeeCountMap.set(slug, (employeeCountMap.get(slug) ?? 0) + 1)
    }
  }

  const allCompanies = companies ?? []

  return (
    <div className="pt-xl pb-3xl">
      <div className="flex items-center justify-between pb-lg border-b border-border mb-lg">
        <h1 className="font-serif text-[1.25rem] text-ink">
          Companies
        </h1>
        {isLoggedIn && (
          <Link
            href="/editor/company"
            className="text-[13px] font-medium text-primary py-[6px] px-[14px] rounded-sm bg-primary-light border border-primary"
          >
            + Add company
          </Link>
        )}
      </div>

      {allCompanies.length === 0 ? (
        <div className="text-center py-3xl text-muted">
          <p className="text-[15px] mb-sm">
            No companies yet. Be the first.
          </p>
          {isLoggedIn && (
            <Link
              href="/editor/company"
              className="inline-block py-[10px] px-[24px] bg-primary text-white rounded-sm font-semibold text-[14px]"
            >
              Add a company
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-md">
          {allCompanies.map((company) => {
            const empCount = employeeCountMap.get(company.slug) ?? 0
            return (
              <Link
                key={company.id}
                href={`/company/${company.slug}`}
                className="no-underline"
              >
                <div className="company-card">
                  {/* Avatar */}
                  <div className="mb-sm">
                    <Avatar name={company.name} size={40} shape="square" />
                  </div>

                  <h2
                    className="font-serif text-[1rem] text-ink leading-[1.3]"
                    style={{
                      marginBottom: company.tagline ? 'var(--space-xs)' : 'var(--space-sm)',
                    }}
                  >
                    {company.name}
                  </h2>

                  {company.tagline && (
                    <p className="text-[13px] text-secondary leading-[1.4] mb-sm">
                      {company.tagline}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-auto">
                    <span className="md-url text-[11px]">
                      /company/{company.slug}.md
                    </span>
                    {empCount > 0 && (
                      <span className="text-[12px] text-muted">
                        {empCount} {empCount === 1 ? 'person' : 'people'}
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
