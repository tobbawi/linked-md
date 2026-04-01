'use client'

import { useState, useTransition } from 'react'
import type { Recommendation } from '@/types'

interface Props {
  recommendations: Recommendation[]
  isOwner: boolean
}

export default function RecommendationsSection({ recommendations: initialRecs, isOwner }: Props) {
  const [recs, setRecs] = useState(initialRecs)
  const [isPending, startTransition] = useTransition()

  if (recs.length === 0) return null

  function handleHide(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/recommendations/${id}/hide`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        setRecs(prev => prev.filter(r => r.id !== id))
      }
    })
  }

  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--color-ink)',
          marginBottom: '1rem',
          letterSpacing: '-0.01em',
        }}
      >
        Recommendations
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {recs.map((rec) => (
          <div
            key={rec.id}
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              position: 'relative',
            }}
          >
            {/* Author */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--color-ink)',
                }}
              >
                {rec.author?.display_name ?? 'Someone'}
              </span>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleHide(rec.id)}
                  disabled={isPending}
                  title="Hide this recommendation"
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-muted)',
                    background: 'none',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 8px',
                    cursor: 'pointer',
                    opacity: isPending ? 0.5 : 1,
                  }}
                >
                  Hide
                </button>
              )}
            </div>

            {/* Body */}
            <p
              style={{
                fontSize: '14px',
                color: 'var(--color-text)',
                lineHeight: 1.6,
                margin: 0,
                fontStyle: 'italic',
              }}
            >
              &ldquo;{rec.body}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
