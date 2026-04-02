'use client'

import { useState, useTransition } from 'react'
import type { ProfileSkill } from '@/types'

interface Props {
  skills: ProfileSkill[]
  isOwner: boolean
  isLoggedIn: boolean
}

export default function SkillsSection({ skills: initialSkills, isOwner, isLoggedIn }: Props) {
  const [skills, setSkills] = useState(initialSkills)
  const [isPending, startTransition] = useTransition()
  const [errorSkillId, setErrorSkillId] = useState<string | null>(null)

  if (skills.length === 0) return null

  function handleEndorse(skill: ProfileSkill) {
    if (!isLoggedIn || isOwner || isPending) return

    startTransition(async () => {
      const method = skill.viewer_has_endorsed ? 'DELETE' : 'POST'
      const res = await fetch('/api/skills/endorse', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skill_id: skill.id }),
      })

      if (res.ok) {
        setSkills(prev => prev.map(s =>
          s.id === skill.id
            ? {
                ...s,
                viewer_has_endorsed: !s.viewer_has_endorsed,
                endorsement_count: (s.endorsement_count ?? 0) + (s.viewer_has_endorsed ? -1 : 1),
              }
            : s
        ))
        setErrorSkillId(null)
      } else {
        setErrorSkillId(skill.id)
        setTimeout(() => setErrorSkillId(null), 600)
      }
    })
  }

  return (
    <section className="mb-[2rem]">
      <h2 className="font-serif text-[1.25rem] font-semibold text-ink mb-[1rem] tracking-[-0.01em]">
        Skills
      </h2>

      <div className="flex flex-wrap gap-sm">
        {skills.map(skill => {
          const endorsed = skill.viewer_has_endorsed ?? false
          const count = skill.endorsement_count ?? 0
          const isError = errorSkillId === skill.id
          const canEndorse = isLoggedIn && !isOwner

          return (
            <div
              key={skill.id}
              className={`inline-flex items-center gap-0 rounded-full text-[13px] font-medium min-h-[32px] transition-[opacity,border-color,background] duration-150 ${
                endorsed
                  ? 'border border-primary bg-primary-light text-primary'
                  : 'border border-border bg-card text-text'
              }`}
              style={{
                opacity: isPending && canEndorse ? 0.6 : 1,
                animation: isError ? 'shake 150ms ease' : undefined,
              }}
            >
              {canEndorse && (
                <button
                  type="button"
                  onClick={() => handleEndorse(skill)}
                  aria-label={endorsed
                    ? `Remove endorsement for ${skill.name}`
                    : `Endorse ${skill.name} — ${count} endorsement${count !== 1 ? 's' : ''}`}
                  className="min-w-[32px] min-h-[32px] flex items-center justify-center bg-none border-none rounded-l-full cursor-pointer py-0 pl-[10px] pr-[8px] text-inherit text-[13px] font-medium"
                >
                  {endorsed ? '✓' : '+'}
                </button>
              )}

              <span
                aria-hidden={canEndorse}
                className={isOwner ? 'cursor-default' : ''}
                style={{
                  padding: canEndorse ? '4px 12px 4px 0' : '4px 12px',
                }}
              >
                {skill.name}
                {count > 0 && (
                  <span className="ml-[6px] font-mono text-[11px] text-muted">
                    · {count}
                  </span>
                )}
              </span>
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        @media (prefers-reduced-motion: reduce) {
          @keyframes shake { 0%, 100% { transform: none; } }
        }
      `}</style>
    </section>
  )
}
