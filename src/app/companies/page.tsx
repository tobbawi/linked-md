import Link from 'next/link'
import { createServerClient, createAuthServerClient } from '@/lib/supabase'
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
          Companies
        </h1>
        {isLoggedIn && (
          <Link
            href="/editor/company"
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
            + Add company
          </Link>
        )}
      </div>

      {allCompanies.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: 'var(--space-3xl) 0',
            color: 'var(--color-muted)',
          }}
        >
          <p style={{ fontSize: '15px', marginBottom: 'var(--space-sm)' }}>
            No companies yet. Be the first.
          </p>
          {isLoggedIn && (
            <Link
              href="/editor/company"
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              Add a company
            </Link>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 'var(--space-md)',
          }}
        >
          {allCompanies.map((company) => {
            const empCount = employeeCountMap.get(company.slug) ?? 0
            return (
              <Link
                key={company.id}
                href={`/company/${company.slug}`}
                style={{ textDecoration: 'none' }}
              >
                <div className="company-card">
                  {/* Avatar */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-primary-light)',
                      border: '1px solid var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 700,
                      color: 'var(--color-primary)',
                      fontFamily: 'var(--font-serif)',
                      marginBottom: 'var(--space-sm)',
                    }}
                  >
                    {company.name.charAt(0).toUpperCase()}
                  </div>

                  <h2
                    style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1rem',
                      color: 'var(--color-ink)',
                      marginBottom: company.tagline ? 'var(--space-xs)' : 'var(--space-sm)',
                      lineHeight: 1.3,
                    }}
                  >
                    {company.name}
                  </h2>

                  {company.tagline && (
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-secondary)',
                        lineHeight: 1.4,
                        marginBottom: 'var(--space-sm)',
                      }}
                    >
                      {company.tagline}
                    </p>
                  )}

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 'auto',
                    }}
                  >
                    <span className="md-url" style={{ fontSize: '11px' }}>
                      /company/{company.slug}.md
                    </span>
                    {empCount > 0 && (
                      <span style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
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
