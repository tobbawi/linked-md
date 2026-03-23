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
        Skills
      </h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
        {skills.map(skill => {
          const endorsed = skill.viewer_has_endorsed ?? false
          const count = skill.endorsement_count ?? 0
          const isError = errorSkillId === skill.id
          const canEndorse = isLoggedIn && !isOwner

          return (
            <div
              key={skill.id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0,
                borderRadius: 'var(--radius-full)',
                border: `1px solid ${endorsed ? 'var(--color-primary)' : 'var(--color-border)'}`,
                background: endorsed ? 'var(--color-primary-light)' : 'var(--color-card)',
                fontSize: '13px',
                fontWeight: 500,
                color: endorsed ? 'var(--color-primary)' : 'var(--color-text)',
                minHeight: '32px',
                opacity: isPending && canEndorse ? 0.6 : 1,
                transition: 'opacity 150ms ease, border-color 150ms ease, background 150ms ease',
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
                  style={{
                    minWidth: '32px',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    borderRadius: 'var(--radius-full) 0 0 var(--radius-full)',
                    cursor: 'pointer',
                    padding: '0 8px 0 10px',
                    color: 'inherit',
                    fontSize: '13px',
                    fontWeight: 500,
                  }}
                >
                  {endorsed ? '✓' : '+'}
                </button>
              )}

              <span
                aria-hidden={canEndorse}
                style={{
                  padding: canEndorse ? '4px 12px 4px 0' : '4px 12px',
                  cursor: isOwner ? 'default' : undefined,
                }}
              >
                {skill.name}
                {count > 0 && (
                  <span
                    style={{
                      marginLeft: '6px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--color-muted)',
                    }}
                  >
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
