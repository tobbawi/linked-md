'use client'

import { useState, useTransition } from 'react'
import { textareaStyle, saveButtonStyle } from '@/components/editor-shared'

interface Props {
  recipientId: string
  recipientName: string
}

export default function WriteRecommendationButton({ recipientId, recipientName }: Props) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const charCount = body.length
  const canSubmit = charCount >= 20 && charCount <= 500

  function handleSubmit() {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: recipientId, body }),
      })
      if (res.ok) {
        setSubmitted(true)
        setOpen(false)
        setTimeout(() => setSubmitted(false), 2000)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Failed to submit recommendation.')
      }
    })
  }

  if (submitted) {
    return (
      <p style={{ fontSize: '14px', color: 'var(--color-primary)', marginTop: 'var(--space-sm)' }}>
        Recommendation submitted
      </p>
    )
  }

  return (
    <div style={{ marginTop: 'var(--space-sm)' }}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--color-text)',
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'none',
            cursor: 'pointer',
            transition: 'border-color 150ms ease',
          }}
          onMouseEnter={e => { ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-primary)' }}
          onMouseLeave={e => { ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)' }}
        >
          Write a recommendation
        </button>
      ) : (
        <div
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-lg)',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'relative' }}>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={`Write a recommendation for ${recipientName}`}
              aria-label={`Write a recommendation for ${recipientName}`}
              rows={4}
              maxLength={500}
              style={textareaStyle}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '10px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: charCount > 500 ? 'var(--color-error, #dc2626)' : 'var(--color-muted)',
                pointerEvents: 'none',
              }}
            >
              {charCount}/500
            </span>
          </div>

          {error && (
            <p style={{ fontSize: '13px', color: 'var(--color-error, #dc2626)', marginTop: 'var(--space-xs)' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => { setOpen(false); setBody(''); setError(null) }}
              style={{
                fontSize: '13px',
                color: 'var(--color-secondary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 12px',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isPending}
              style={saveButtonStyle(!canSubmit || isPending)}
            >
              {isPending ? 'Submitting…' : 'Submit recommendation'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
