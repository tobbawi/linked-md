'use client'

import Link from 'next/link'
import type { ExperienceEntry } from '@/types'
import { formatPeriod, getDuration } from '@/lib/dateUtils'

type Props = { experience: ExperienceEntry[] }

export default function ExperienceSection({ experience }: Props) {
  if (experience.length === 0) return null

  return (
    <section className="mb-[2rem]">
      <h2 className="font-serif text-[1.25rem] font-semibold text-ink mb-[1.25rem] tracking-[-0.01em]">
        Experience
      </h2>

      {/* Timeline */}
      <div className="relative pl-[20px]">
        {/* Vertical spine */}
        <div
          aria-hidden
          className="absolute left-[6px] top-[8px] bottom-[8px] w-px"
          style={{ background: 'linear-gradient(to bottom, var(--color-primary), var(--color-border))' }}
        />

        {experience.map((entry, idx) => {
          const duration = getDuration(entry)
          const isLast = idx === experience.length - 1

          return (
            <div
              key={entry.id}
              className="relative"
              style={{ paddingBottom: isLast ? 0 : '1.5rem' }}
            >
              {/* Timeline dot */}
              <div
                aria-hidden
                className="absolute left-[-20px] top-[7px] w-[13px] h-[13px] rounded-full transition-[border-color] duration-150 z-[1]"
                style={{
                  background: entry.is_current ? 'var(--color-primary)' : 'var(--color-card)',
                  border: `2px solid ${entry.is_current ? 'var(--color-primary)' : 'var(--color-border)'}`,
                }}
              />

              {/* Entry card */}
              <div
                className="bg-card border border-border rounded-md py-[14px] px-[16px] transition-[border-color] duration-150 hover:border-primary"
              >
                {/* Top row: title + current badge */}
                <div className="flex items-start justify-between gap-[8px] mb-[4px]">
                  <span className="text-[0.9375rem] font-semibold text-ink leading-[1.3]">
                    {entry.title}
                  </span>
                  {entry.is_current && (
                    <span className="shrink-0 text-[10px] font-semibold font-mono text-primary bg-primary-light py-[2px] px-[7px] rounded-full tracking-[0.04em] uppercase border border-primary">
                      now
                    </span>
                  )}
                </div>

                {/* Company + period row */}
                <div
                  className="flex items-baseline gap-[8px] flex-wrap"
                  style={{ marginBottom: entry.description ? '10px' : 0 }}
                >
                  {entry.company_slug ? (
                    <Link
                      href={`/company/${entry.company_slug}`}
                      className="font-serif italic text-[0.9375rem] text-primary no-underline leading-[1.3] hover:underline"
                    >
                      {entry.company_name}
                    </Link>
                  ) : (
                    <span className="font-serif italic text-[0.9375rem] text-secondary leading-[1.3]">
                      {entry.company_name}
                    </span>
                  )}

                  <span className="font-mono text-[11px] text-muted tracking-[0.01em]">
                    {formatPeriod(entry)}
                    {duration && (
                      <span className="ml-[5px] py-[1px] px-[5px] bg-bg rounded-sm border border-border">
                        {duration}
                      </span>
                    )}
                  </span>
                </div>

                {/* Description */}
                {entry.description && (
                  <p className="text-[13px] text-secondary leading-[1.6] m-0">
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
