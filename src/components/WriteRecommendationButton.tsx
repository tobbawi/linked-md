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
      <p className="text-[14px] text-primary mt-sm">
        Recommendation submitted
      </p>
    )
  }

  return (
    <div className="mt-sm">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[13px] font-medium text-text py-[6px] px-[14px] rounded-sm border border-border bg-none cursor-pointer transition-[border-color] duration-150 hover:border-primary"
        >
          Write a recommendation
        </button>
      ) : (
        <div className="border border-border rounded-md p-lg overflow-hidden">
          <div className="relative">
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
              className={`absolute bottom-[8px] right-[10px] font-mono text-[11px] pointer-events-none ${
                charCount > 500 ? 'text-error' : 'text-muted'
              }`}
            >
              {charCount}/500
            </span>
          </div>

          {error && (
            <p className="text-[13px] text-error mt-xs">
              {error}
            </p>
          )}

          <div className="flex gap-sm mt-sm justify-end">
            <button
              type="button"
              onClick={() => { setOpen(false); setBody(''); setError(null) }}
              className="text-[13px] text-secondary bg-none border-none cursor-pointer py-[6px] px-[12px]"
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
