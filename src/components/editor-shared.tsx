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
    <div className="mb-md">
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-medium text-text mb-xs"
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
      className={`w-full py-[9px] px-[12px] text-[15px] text-text bg-bg border border-border rounded-sm outline-none transition-[border-color] duration-150 focus:border-primary ${
        mono ? 'font-mono' : 'font-sans'
      }`}
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
      className={`mb-md py-[10px] px-[12px] rounded-sm text-[13px] flex items-center justify-between gap-sm ${
        isSuccess
          ? 'bg-primary-light border border-primary text-primary'
          : 'bg-[#FEF2F2] border border-[#FECACA] text-error'
      }`}
    >
      <span>{status.message}</span>
      {!isSuccess && (
        <button
          onClick={() => window.location.reload()}
          className="bg-none border-none text-error font-sans text-[13px] font-medium cursor-pointer p-0 shrink-0"
        >
          Retry
        </button>
      )}
    </div>
  )
}

export function PreviewPanel({ html, label }: { html: string; label: string }) {
  return (
    <div className="flex-1 min-w-0 sticky top-[72px]">
      <div className="text-[11px] font-medium text-muted uppercase tracking-[0.05em] mb-sm">
        {label}
      </div>
      <div
        className="prose bg-card border border-border rounded-md p-lg min-h-[200px] text-[15px] leading-[1.7] text-text"
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
      className="absolute left-0 right-0 top-full z-[100] bg-bg border border-border rounded-md overflow-hidden mt-[2px]"
      style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
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
          className={`py-[8px] px-[12px] cursor-pointer flex items-center gap-sm transition-[background] duration-100 ${
            i === selectedIdx ? 'bg-primary-light' : 'bg-transparent'
          }`}
        >
          <span className="text-[14px] text-text">
            {r.display_name}
          </span>
          <span className="text-[11px] font-mono text-muted">
            {r.slug}
          </span>
        </div>
      ))}
    </div>
  )
}
