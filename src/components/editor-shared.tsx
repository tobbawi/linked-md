'use client'

import { useState, useEffect, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  slug: string
  display_name: string
}

// ── Markdown rendering ─────────────────────────────────────────────────────

export async function renderMarkdown(content: string): Promise<string> {
  const { remark } = await import('remark')
  const remarkHtml = (await import('remark-html')).default
  const result = await remark().use(remarkHtml).process(content)
  return String(result)
}

// ── Slug generation ────────────────────────────────────────────────────────

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

// ── Wikilink autocomplete hook ─────────────────────────────────────────────

export function useWikilinkAutocomplete(
  value: string,
  cursorPos: number,
  onSelect: (result: SearchResult, start: number, end: number) => void
) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [query, setQuery] = useState<string | null>(null)
  const [matchStart, setMatchStart] = useState(0)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const before = value.slice(0, cursorPos)
    const openBracket = before.lastIndexOf('[[')
    const closeBracket = before.lastIndexOf(']]')

    if (openBracket !== -1 && openBracket > closeBracket) {
      const q = before.slice(openBracket + 2)
      setQuery(q)
      setMatchStart(openBracket)
      setSelectedIdx(0)
    } else {
      setQuery(null)
      setResults([])
    }
  }, [value, cursorPos])

  useEffect(() => {
    if (query === null) return

    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    if (!query.trim()) {
      setResults([])
      return
    }

    fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data: SearchResult[]) => {
        if (!ctrl.signal.aborted) setResults(data)
      })
      .catch(() => {})
  }, [query])

  function handleKey(e: React.KeyboardEvent) {
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      const end = value.indexOf(']]', matchStart)
      const endPos = end !== -1 ? end + 2 : cursorPos
      onSelect(results[selectedIdx], matchStart, endPos)
    } else if (e.key === 'Escape') {
      setResults([])
      setQuery(null)
    }
  }

  function selectResult(r: SearchResult) {
    const end = value.indexOf(']]', matchStart)
    const endPos = end !== -1 ? end + 2 : cursorPos
    onSelect(r, matchStart, endPos)
    setResults([])
    setQuery(null)
  }

  return { results, selectedIdx, query, handleKey, selectResult }
}

// ── Shared UI helpers ──────────────────────────────────────────────────────

export function FieldGroup({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 'var(--space-md)' }}>
      <label
        htmlFor={htmlFor}
        style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--color-text)',
          marginBottom: 'var(--space-xs)',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

export function Input({
  id,
  value,
  onChange,
  placeholder,
  mono = false,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  mono?: boolean
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '9px 12px',
        fontSize: '15px',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        color: 'var(--color-text)',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        outline: 'none',
        transition: 'border-color 150ms ease',
      }}
      onFocus={(e) => (e.target.style.borderColor = 'var(--color-primary)')}
      onBlur={(e) => (e.target.style.borderColor = 'var(--color-border)')}
    />
  )
}

export const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontSize: '14px',
  fontFamily: 'var(--font-mono)',
  color: 'var(--color-text)',
  background: 'var(--color-bg)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  outline: 'none',
  resize: 'vertical',
  lineHeight: 1.6,
  transition: 'border-color 150ms ease',
}

export function saveButtonStyle(isPending: boolean): React.CSSProperties {
  return {
    padding: '10px 24px',
    background: isPending ? 'var(--color-muted)' : 'var(--color-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: '15px',
    fontWeight: 600,
    fontFamily: 'var(--font-sans)',
    cursor: isPending ? 'not-allowed' : 'pointer',
    transition: 'background 150ms ease',
  }
}

export function StatusMessage({
  status,
}: {
  status: { type: 'success' | 'error'; message: string; url?: string } | null
}) {
  if (!status) return null
  const isSuccess = status.type === 'success'
  return (
    <div
      role={isSuccess ? 'status' : 'alert'}
      style={{
        marginBottom: 'var(--space-md)',
        padding: '10px 12px',
        background: isSuccess ? 'var(--color-primary-light)' : '#FEF2F2',
        border: `1px solid ${isSuccess ? 'var(--color-primary)' : '#FECACA'}`,
        borderRadius: 'var(--radius-sm)',
        fontSize: '13px',
        color: isSuccess ? 'var(--color-primary)' : 'var(--color-error)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 'var(--space-sm)',
      }}
    >
      <span>{status.message}</span>
      {!isSuccess && (
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-error)',
            fontFamily: 'var(--font-sans)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        >
          Retry
        </button>
      )}
    </div>
  )
}

export function PreviewPanel({ html, label }: { html: string; label: string }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        position: 'sticky',
        top: '72px',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          fontWeight: 500,
          color: 'var(--color-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: 'var(--space-sm)',
        }}
      >
        {label}
      </div>
      <div
        className="prose"
        style={{
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-lg)',
          minHeight: '200px',
          fontSize: '15px',
          lineHeight: 1.7,
          color: 'var(--color-text)',
        }}
        dangerouslySetInnerHTML={{
          __html:
            html ||
            '<p style="color: var(--color-muted); font-style: italic;">Preview will appear here…</p>',
        }}
      />
    </div>
  )
}

export function AutocompleteDropdown({
  results,
  selectedIdx,
  onSelect,
}: {
  results: SearchResult[]
  selectedIdx: number
  onSelect: (r: SearchResult) => void
}) {
  return (
    <div
      role="listbox"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: '100%',
        zIndex: 100,
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        marginTop: '2px',
      }}
    >
      {results.map((r, i) => (
        <div
          key={r.slug}
          role="option"
          aria-selected={i === selectedIdx}
          onMouseDown={(e) => {
            e.preventDefault()
            onSelect(r)
          }}
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            background:
              i === selectedIdx ? 'var(--color-primary-light)' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
            transition: 'background 100ms ease',
          }}
        >
          <span style={{ fontSize: '14px', color: 'var(--color-text)' }}>
            {r.display_name}
          </span>
          <span
            style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-muted)',
            }}
          >
            {r.slug}
          </span>
        </div>
      ))}
    </div>
  )
}
