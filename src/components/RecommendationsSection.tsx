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
    <section className="mb-[2rem]">
      <h2 className="font-serif text-[1.25rem] font-semibold text-ink mb-[1rem] tracking-[-0.01em]">
        Recommendations
      </h2>

      <div className="flex flex-col gap-md">
        {recs.map((rec) => (
          <div
            key={rec.id}
            className="bg-card border border-border rounded-md py-[14px] px-[16px] relative"
          >
            {/* Author */}
            <div className="flex items-center justify-between mb-[8px]">
              <span className="text-[13px] font-semibold text-ink">
                {rec.author?.display_name ?? 'Someone'}
              </span>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleHide(rec.id)}
                  disabled={isPending}
                  title="Hide this recommendation"
                  className="text-[11px] text-muted bg-none border border-border rounded-sm py-[2px] px-[8px] cursor-pointer"
                  style={{ opacity: isPending ? 0.5 : 1 }}
                >
                  Hide
                </button>
              )}
            </div>

            {/* Body */}
            <p className="text-[14px] text-text leading-[1.6] m-0 italic">
              &ldquo;{rec.body}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
