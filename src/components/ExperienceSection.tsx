'use client'

import Link from 'next/link'
import type { ExperienceEntry } from '@/types'

interface Props {
  experience: ExperienceEntry[]
}

function formatPeriod(entry: ExperienceEntry): string {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const startMonth = entry.start_month ? `${monthNames[entry.start_month - 1]} ` : ''
  const start = `${startMonth}${entry.start_year}`
  if (entry.is_current) return `${start} – present`
  if (!entry.end_year) return start
  const endMonth = entry.end_month ? `${monthNames[entry.end_month - 1]} ` : ''
  return `${start} – ${endMonth}${entry.end_year}`
}

function getDuration(entry: ExperienceEntry): string {
  const endYear = entry.is_current ? new Date().getFullYear() : (entry.end_year ?? entry.start_year)
  const endMonth = entry.is_current ? new Date().getMonth() + 1 : (entry.end_month ?? entry.start_month ?? 1)
  const startMonth = entry.start_month ?? 1
  const totalMonths = (endYear - entry.start_year) * 12 + (endMonth - startMonth)
  if (totalMonths < 1) return ''
  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  const parts: string[] = []
  if (years > 0) parts.push(`${years}y`)
  if (months > 0 || years === 0) parts.push(`${months}mo`)
  return parts.join(' ')
}

export default function ExperienceSection({ experience }: Props) {
  if (experience.length === 0) return null

  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.125rem',
          fontWeight: 400,
          color: 'var(--color-ink)',
          marginBottom: '1.25rem',
          letterSpacing: '-0.01em',
        }}
      >
        Experience
      </h2>

      {/* Timeline */}
      <div style={{ position: 'relative', paddingLeft: '20px' }}>
        {/* Vertical spine */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            left: '6px',
            top: '8px',
            bottom: '8px',
            width: '1px',
            background: 'linear-gradient(to bottom, var(--color-primary), var(--color-border))',
          }}
        />

        {experience.map((entry, idx) => {
          const duration = getDuration(entry)
          const isLast = idx === experience.length - 1

          return (
            <div
              key={entry.id}
              style={{
                position: 'relative',
                paddingBottom: isLast ? 0 : '1.5rem',
              }}
            >
              {/* Timeline dot */}
              <div
                aria-hidden
                style={{
                  position: 'absolute',
                  left: '-20px',
                  top: '7px',
                  width: '13px',
                  height: '13px',
                  borderRadius: '50%',
                  background: entry.is_current ? 'var(--color-primary)' : 'var(--color-card)',
                  border: `2px solid ${entry.is_current ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  transition: 'border-color 150ms ease',
                  zIndex: 1,
                }}
              />

              {/* Entry card */}
              <div
                style={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  transition: 'border-color 150ms ease',
                }}
                onMouseEnter={e => {
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-primary)'
                }}
                onMouseLeave={e => {
                  ;(e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-border)'
                }}
              >
                {/* Top row: title + current badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.9375rem',
                      fontWeight: 600,
                      color: 'var(--color-ink)',
                      lineHeight: 1.3,
                    }}
                  >
                    {entry.title}
                  </span>
                  {entry.is_current && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: '10px',
                        fontWeight: 600,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--color-primary)',
                        background: 'var(--color-primary-light)',
                        padding: '2px 7px',
                        borderRadius: 'var(--radius-full)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        border: '1px solid var(--color-primary)',
                      }}
                    >
                      now
                    </span>
                  )}
                </div>

                {/* Company + period row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '8px',
                    flexWrap: 'wrap',
                    marginBottom: entry.description ? '10px' : 0,
                  }}
                >
                  {entry.company_slug ? (
                    <Link
                      href={`/company/${entry.company_slug}`}
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontStyle: 'italic',
                        fontSize: '0.9375rem',
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        lineHeight: 1.3,
                      }}
                      onMouseEnter={e => { ;(e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline' }}
                      onMouseLeave={e => { ;(e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none' }}
                    >
                      {entry.company_name}
                    </Link>
                  ) : (
                    <span
                      style={{
                        fontFamily: 'var(--font-serif)',
                        fontStyle: 'italic',
                        fontSize: '0.9375rem',
                        color: 'var(--color-secondary)',
                        lineHeight: 1.3,
                      }}
                    >
                      {entry.company_name}
                    </span>
                  )}

                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--color-muted)',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {formatPeriod(entry)}
                    {duration && (
                      <span
                        style={{
                          marginLeft: '5px',
                          padding: '1px 5px',
                          background: 'var(--color-bg)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                        }}
                      >
                        {duration}
                      </span>
                    )}
                  </span>
                </div>

                {/* Description */}
                {entry.description && (
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--color-secondary)',
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {entry.description}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
