'use client'

import { useState, useEffect, useRef, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import {
  renderMarkdown,
  useWikilinkAutocomplete,
  FieldGroup,
  Input,
  textareaStyle,
  saveButtonStyle,
  StatusMessage,
  PreviewPanel,
  AutocompleteDropdown,
} from '@/components/editor-shared'
import type { ExperienceEntry, EducationEntry } from '@/types'
import { computeCompleteness } from '@/lib/completeness'

// ── Profile markdown template ──────────────────────────────────────────────

function buildProfileMarkdown(displayName: string, bio: string): string {
  const lines: string[] = []
  if (displayName) {
    lines.push(`# ${displayName}`)
    lines.push('')
  }
  if (bio) {
    lines.push(bio)
    lines.push('')
  }
  return lines.join('\n')
}

// ── Experience entry type ──────────────────────────────────────────────────

type ExperienceInput = Omit<ExperienceEntry, 'id' | 'profile_id' | 'created_at' | 'updated_at'> & { id?: string }

function emptyEntry(): ExperienceInput {
  return {
    company_name: '',
    company_slug: null,
    title: '',
    start_year: new Date().getFullYear(),
    start_month: null,
    end_year: null,
    end_month: null,
    is_current: true,
    description: null,
    sort_order: 0,
  }
}

// ── Company autocomplete hook ──────────────────────────────────────────────

function useCompanyAutocomplete(query: string, onSelect: (slug: string, name: string) => void) {
  const [results, setResults] = useState<Array<{ slug: string; display_name: string }>>([])
  const [selectedIdx, setSelectedIdx] = useState(0)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const tid = setTimeout(async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=company`)
      if (res.ok) setResults(await res.json())
    }, 200)
    return () => clearTimeout(tid)
  }, [query])

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (!results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && results[selectedIdx]) {
      e.preventDefault()
      const r = results[selectedIdx]
      onSelect(r.slug, r.display_name)
      setResults([])
    }
    if (e.key === 'Escape') setResults([])
  }, [results, selectedIdx, onSelect])

  const selectResult = useCallback((r: { slug: string; display_name: string }) => {
    onSelect(r.slug, r.display_name)
    setResults([])
  }, [onSelect])

  return { results, selectedIdx, handleKey, selectResult }
}

// ── Experience entry row ────────────────────────────────────────────────────

interface EntryRowProps {
  entry: ExperienceInput
  index: number
  total: number
  onChange: (idx: number, patch: Partial<ExperienceInput>) => void
  onRemove: (idx: number) => void
  onMove: (idx: number, dir: -1 | 1) => void
}

function ExperienceEntryRow({ entry, index, total, onChange, onRemove, onMove }: EntryRowProps) {
  const [companyQuery, setCompanyQuery] = useState(entry.company_name)

  const autocomplete = useCompanyAutocomplete(
    companyQuery,
    (slug, name) => {
      setCompanyQuery(name)
      onChange(index, { company_name: name, company_slug: slug })
    }
  )

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i)
  const months = [
    { v: 1, l: 'Jan' }, { v: 2, l: 'Feb' }, { v: 3, l: 'Mar' },
    { v: 4, l: 'Apr' }, { v: 5, l: 'May' }, { v: 6, l: 'Jun' },
    { v: 7, l: 'Jul' }, { v: 8, l: 'Aug' }, { v: 9, l: 'Sep' },
    { v: 10, l: 'Oct' }, { v: 11, l: 'Nov' }, { v: 12, l: 'Dec' },
  ]

  const fieldStyle: React.CSSProperties = {
    padding: '6px 10px',
    fontSize: '13px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    width: '100%',
  }

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', background: 'var(--color-bg)', marginBottom: 'var(--space-sm)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
          {/* Title */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-muted)', display: 'block', marginBottom: '3px' }}>Job title</label>
            <input
              value={entry.title}
              onChange={e => onChange(index, { title: e.target.value })}
              placeholder="Software Engineer"
              style={fieldStyle}
            />
          </div>

          {/* Company */}
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-muted)', display: 'block', marginBottom: '3px' }}>Company</label>
            <input
              value={companyQuery}
              onChange={e => {
                setCompanyQuery(e.target.value)
                onChange(index, { company_name: e.target.value, company_slug: null })
              }}
              onKeyDown={autocomplete.handleKey}
              placeholder="Acme Corp"
              style={fieldStyle}
              autoComplete="off"
            />
            {autocomplete.results.length > 0 && (
              <AutocompleteDropdown
                results={autocomplete.results}
                selectedIdx={autocomplete.selectedIdx}
                onSelect={autocomplete.selectResult}
              />
            )}
            {entry.company_slug && (
              <span style={{ fontSize: '10px', color: 'var(--color-primary)', marginTop: '2px', display: 'block' }}>
                linked to /company/{entry.company_slug}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            title="Move up"
            style={{ padding: '3px 6px', fontSize: '11px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}
          >↑</button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            title="Move down"
            style={{ padding: '3px 6px', fontSize: '11px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: index === total - 1 ? 'default' : 'pointer', opacity: index === total - 1 ? 0.3 : 1 }}
          >↓</button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            title="Remove"
            style={{ padding: '3px 6px', fontSize: '11px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', color: 'var(--color-error, #dc2626)' }}
          >✕</button>
        </div>
      </div>

      {/* Dates row */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>From</span>
          <select value={entry.start_month ?? ''} onChange={e => onChange(index, { start_month: e.target.value ? Number(e.target.value) : null })} style={{ ...fieldStyle, width: 'auto' }}>
            <option value="">–</option>
            {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          <select value={entry.start_year} onChange={e => onChange(index, { start_year: Number(e.target.value) })} style={{ ...fieldStyle, width: 'auto' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-text)', cursor: 'pointer', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={entry.is_current}
            onChange={e => onChange(index, { is_current: e.target.checked, end_year: null, end_month: null })}
          />
          Current
        </label>

        {!entry.is_current && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>To</span>
            <select value={entry.end_month ?? ''} onChange={e => onChange(index, { end_month: e.target.value ? Number(e.target.value) : null })} style={{ ...fieldStyle, width: 'auto' }}>
              <option value="">–</option>
              {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select value={entry.end_year ?? ''} onChange={e => onChange(index, { end_year: e.target.value ? Number(e.target.value) : null })} style={{ ...fieldStyle, width: 'auto' }}>
              <option value="">–</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Description */}
      <div style={{ marginTop: 'var(--space-sm)' }}>
        <input
          value={entry.description ?? ''}
          onChange={e => onChange(index, { description: e.target.value || null })}
          placeholder="Description (optional)"
          style={fieldStyle}
        />
      </div>
    </div>
  )
}

// ── Education entry type + row ─────────────────────────────────────────────

type EducationInput = Omit<EducationEntry, 'id' | 'profile_id' | 'created_at' | 'updated_at'> & { id?: string }

function emptyEducation(): EducationInput {
  return {
    school: '',
    degree: null,
    field_of_study: null,
    start_year: new Date().getFullYear(),
    start_month: null,
    end_year: null,
    end_month: null,
    is_current: false,
    sort_order: 0,
  }
}

interface EduRowProps {
  entry: EducationInput
  index: number
  total: number
  onChange: (idx: number, patch: Partial<EducationInput>) => void
  onRemove: (idx: number) => void
  onMove: (idx: number, dir: -1 | 1) => void
}

function EducationEntryRow({ entry, index, total, onChange, onRemove, onMove }: EduRowProps) {
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 1899 }, (_, i) => currentYear - i)
  const months = [
    { v: 1, l: 'Jan' }, { v: 2, l: 'Feb' }, { v: 3, l: 'Mar' },
    { v: 4, l: 'Apr' }, { v: 5, l: 'May' }, { v: 6, l: 'Jun' },
    { v: 7, l: 'Jul' }, { v: 8, l: 'Aug' }, { v: 9, l: 'Sep' },
    { v: 10, l: 'Oct' }, { v: 11, l: 'Nov' }, { v: 12, l: 'Dec' },
  ]
  const fieldStyle: React.CSSProperties = {
    padding: '6px 10px',
    fontSize: '13px',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-bg)',
    color: 'var(--color-text)',
    width: '100%',
  }

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)', background: 'var(--color-bg)', marginBottom: 'var(--space-sm)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-muted)', display: 'block', marginBottom: '3px' }}>School</label>
            <input
              value={entry.school}
              onChange={e => onChange(index, { school: e.target.value })}
              placeholder="MIT"
              style={fieldStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--color-muted)', display: 'block', marginBottom: '3px' }}>Degree</label>
            <input
              value={entry.degree ?? ''}
              onChange={e => onChange(index, { degree: e.target.value || null })}
              placeholder="BS, MS, PhD…"
              style={fieldStyle}
            />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
          <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} title="Move up" style={{ padding: '3px 6px', fontSize: '11px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: index === 0 ? 'default' : 'pointer', opacity: index === 0 ? 0.3 : 1 }}>↑</button>
          <button type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1} title="Move down" style={{ padding: '3px 6px', fontSize: '11px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: index === total - 1 ? 'default' : 'pointer', opacity: index === total - 1 ? 0.3 : 1 }}>↓</button>
          <button type="button" onClick={() => onRemove(index)} title="Remove" style={{ padding: '3px 6px', fontSize: '11px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'none', cursor: 'pointer', color: 'var(--color-error, #dc2626)' }}>✕</button>
        </div>
      </div>

      <div style={{ marginBottom: 'var(--space-sm)' }}>
        <input
          value={entry.field_of_study ?? ''}
          onChange={e => onChange(index, { field_of_study: e.target.value || null })}
          placeholder="Field of study (optional)"
          style={fieldStyle}
        />
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>From</span>
          <select value={entry.start_month ?? ''} onChange={e => onChange(index, { start_month: e.target.value ? Number(e.target.value) : null })} style={{ ...fieldStyle, width: 'auto' }}>
            <option value="">–</option>
            {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          <select value={entry.start_year} onChange={e => onChange(index, { start_year: Number(e.target.value) })} style={{ ...fieldStyle, width: 'auto' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-text)', cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={entry.is_current} onChange={e => onChange(index, { is_current: e.target.checked, end_year: null, end_month: null })} />
          Current
        </label>

        {!entry.is_current && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>To</span>
            <select value={entry.end_month ?? ''} onChange={e => onChange(index, { end_month: e.target.value ? Number(e.target.value) : null })} style={{ ...fieldStyle, width: 'auto' }}>
              <option value="">–</option>
              {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
            <select value={entry.end_year ?? ''} onChange={e => onChange(index, { end_year: e.target.value ? Number(e.target.value) : null })} style={{ ...fieldStyle, width: 'auto' }}>
              <option value="">–</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function EditorPage() {
  const router = useRouter()

  const [authChecked, setAuthChecked] = useState(false)
  const [isNewProfile, setIsNewProfile] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [displayName, setDisplayName] = useState('')
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [website, setWebsite] = useState('')
  const [bio, setBio] = useState('')
  const [content, setContent] = useState('')
  const [slug, setSlug] = useState('')
  const [experience, setExperience] = useState<ExperienceInput[]>([])
  const [education, setEducation] = useState<EducationInput[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState('')
  const [postCount, setPostCount] = useState(0)
  const [previewHtml, setPreviewHtml] = useState('')
  const [status, setStatus] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const [contentCursor, setContentCursor] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auth guard + load existing profile + experience
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/auth')
        return
      }

      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
        .then(async ({ data: profileData }) => {
          if (profileData) {
            setDisplayName(profileData.display_name ?? '')
            setTitle(profileData.title ?? '')
            setLocation(profileData.location ?? '')
            setWebsite(profileData.website ?? '')
            setBio(profileData.bio ?? '')
            setContent(profileData.markdown_content ?? '')
            setSlug(profileData.slug ?? '')

            // Load experience, education, skills, post count in parallel
            const [{ data: expRows }, { data: eduRows }, { data: skillRows }, { count: pCount }] = await Promise.all([
              supabase.from('experience').select('*').eq('profile_id', profileData.id).order('sort_order', { ascending: true }),
              supabase.from('education_entries').select('*').eq('profile_id', profileData.id).order('sort_order', { ascending: true }),
              supabase.from('profile_skills').select('name').eq('profile_id', profileData.id).order('sort_order', { ascending: true }),
              supabase.from('posts').select('*', { count: 'exact', head: true }).eq('profile_id', profileData.id),
            ])
            setExperience((expRows ?? []) as ExperienceInput[])
            setEducation((eduRows ?? []) as EducationInput[])
            setSkills((skillRows ?? []).map((s: { name: string }) => s.name))
            setPostCount(pCount ?? 0)
          } else {
            setIsNewProfile(true)
          }
          setAuthChecked(true)
        })
    })
  }, [router])

  // Markdown preview
  useEffect(() => {
    const md = buildProfileMarkdown(displayName, bio) + '\n' + content
    renderMarkdown(md).then(setPreviewHtml)
  }, [displayName, bio, content])

  // Wikilink autocomplete
  const autocomplete = useWikilinkAutocomplete(
    content,
    contentCursor,
    (result, start, end) => {
      const before = content.slice(0, start)
      const after = content.slice(end)
      const insertion = `[[${result.display_name}]]`
      const next = before + insertion + after
      setContent(next)
      const newCursor = start + insertion.length
      setContentCursor(newCursor)
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(newCursor, newCursor)
        textareaRef.current?.focus()
      }, 0)
    }
  )

  // Experience handlers
  const handleEntryChange = useCallback((idx: number, patch: Partial<ExperienceInput>) => {
    setExperience(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e))
  }, [])

  const handleEntryRemove = useCallback((idx: number) => {
    setExperience(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const handleEntryMove = useCallback((idx: number, dir: -1 | 1) => {
    setExperience(prev => {
      const next = [...prev]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }, [])

  // Education handlers
  const handleEduChange = useCallback((idx: number, patch: Partial<EducationInput>) => {
    setEducation(prev => prev.map((e, i) => i === idx ? { ...e, ...patch } : e))
  }, [])

  const handleEduRemove = useCallback((idx: number) => {
    setEducation(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const handleEduMove = useCallback((idx: number, dir: -1 | 1) => {
    setEducation(prev => {
      const next = [...prev]
      const swap = idx + dir
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }, [])

  async function handleSave() {
    if (!displayName.trim() || !slug.trim()) {
      setStatus({ type: 'error', message: 'Display name and slug are required.' })
      return
    }
    setStatus(null)
    startTransition(async () => {
      // Save profile + experience (one call), education, and skills in parallel
      const [profileRes, educationRes, skillsRes] = await Promise.all([
        fetch('/api/profile/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            display_name: displayName,
            title: title || undefined,
            location: location || undefined,
            website: website || undefined,
            bio,
            markdown_content: content,
            slug,
            experience,
          }),
        }),
        fetch('/api/education/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ education }),
        }),
        fetch('/api/skills/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skills }),
        }),
      ])

      if (profileRes.ok && educationRes.ok && skillsRes.ok) {
        router.push(`/profile/${slug}`)
        router.refresh()
      } else {
        const failedRes = !profileRes.ok ? profileRes : !educationRes.ok ? educationRes : skillsRes
        const data = await failedRes.json()
        setStatus({ type: 'error', message: data.error ?? 'Save failed.' })
      }
    })
  }

  if (!authChecked) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 56px)',
          color: 'var(--color-muted)',
          fontSize: '15px',
        }}
      >
        Loading…
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 'var(--space-lg)', paddingBottom: 'var(--space-3xl)' }}>
      {isNewProfile && (
        <div
          style={{
            marginBottom: 'var(--space-lg)',
            padding: 'var(--space-md) var(--space-lg)',
            background: 'var(--color-primary-light)',
            border: '1px solid var(--color-primary)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <p style={{ fontWeight: 600, color: 'var(--color-ink)', marginBottom: '2px' }}>
            Welcome to linked.md!
          </p>
          <p style={{ fontSize: '14px', color: 'var(--color-secondary)' }}>
            Fill in your display name and slug to create your profile. Your profile will be
            publicly visible at{' '}
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
              /profile/your-slug.md
            </span>
          </p>
        </div>
      )}

      <h1
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--color-ink)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        Edit profile
      </h1>

      <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'flex-start' }}>
        {/* Left — form */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-lg)',
              marginBottom: 'var(--space-lg)',
            }}
          >
            <FieldGroup label="Display name" htmlFor="display-name">
              <Input
                id="display-name"
                value={displayName}
                onChange={setDisplayName}
                placeholder="Jane Doe"
              />
            </FieldGroup>

            <FieldGroup label="Title / role" htmlFor="profile-title">
              <Input
                id="profile-title"
                value={title}
                onChange={setTitle}
                placeholder="Software Engineer at Acme"
              />
            </FieldGroup>

            <FieldGroup label="Location" htmlFor="profile-location">
              <Input
                id="profile-location"
                value={location}
                onChange={setLocation}
                placeholder="San Francisco, CA"
              />
            </FieldGroup>

            <FieldGroup label="Website" htmlFor="profile-website">
              <Input
                id="profile-website"
                value={website}
                onChange={setWebsite}
                placeholder="https://yoursite.com"
              />
            </FieldGroup>

            <FieldGroup label="Profile slug" htmlFor="profile-slug">
              <Input
                id="profile-slug"
                value={slug}
                onChange={setSlug}
                placeholder="jane-doe"
                mono
              />
            </FieldGroup>

            <FieldGroup label="Bio (one line)" htmlFor="bio">
              <Input
                id="bio"
                value={bio}
                onChange={setBio}
                placeholder="Engineer at Acme. Building things."
              />
            </FieldGroup>

            <FieldGroup label="Profile content (markdown)" htmlFor="profile-content">
              <div style={{ position: 'relative' }}>
                <textarea
                  id="profile-content"
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value)
                    setContentCursor(e.target.selectionStart)
                  }}
                  onKeyDown={(e) => {
                    autocomplete.handleKey(e)
                    setContentCursor((e.target as HTMLTextAreaElement).selectionStart)
                  }}
                  onSelect={(e) =>
                    setContentCursor((e.target as HTMLTextAreaElement).selectionStart)
                  }
                  placeholder="Tell your story... Use [[Name]] to link people."
                  rows={12}
                  style={textareaStyle}
                />
                {autocomplete.results.length > 0 && (
                  <AutocompleteDropdown
                    results={autocomplete.results}
                    selectedIdx={autocomplete.selectedIdx}
                    onSelect={autocomplete.selectResult}
                  />
                )}
              </div>
            </FieldGroup>
          </div>

          {/* Experience section */}
          <div
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-lg)',
              marginBottom: 'var(--space-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>Experience</h2>
              <button
                type="button"
                onClick={() => setExperience(prev => [...prev, emptyEntry()])}
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-primary)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-primary-light)',
                  border: '1px solid var(--color-primary)',
                  cursor: 'pointer',
                }}
              >
                + Add position
              </button>
            </div>

            {experience.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', fontStyle: 'italic' }}>
                No experience entries yet.
              </p>
            ) : (
              experience.map((entry, idx) => (
                <ExperienceEntryRow
                  key={idx}
                  entry={entry}
                  index={idx}
                  total={experience.length}
                  onChange={handleEntryChange}
                  onRemove={handleEntryRemove}
                  onMove={handleEntryMove}
                />
              ))
            )}
          </div>

          {/* Education section */}
          <div
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-lg)',
              marginBottom: 'var(--space-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)' }}>Education</h2>
              <button
                type="button"
                onClick={() => setEducation(prev => [...prev, emptyEducation()])}
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-primary)',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-primary-light)',
                  border: '1px solid var(--color-primary)',
                  cursor: 'pointer',
                }}
              >
                + Add school
              </button>
            </div>

            {education.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--color-muted)', fontStyle: 'italic' }}>
                No education entries yet.
              </p>
            ) : (
              education.map((entry, idx) => (
                <EducationEntryRow
                  key={idx}
                  entry={entry}
                  index={idx}
                  total={education.length}
                  onChange={handleEduChange}
                  onRemove={handleEduRemove}
                  onMove={handleEduMove}
                />
              ))
            )}
          </div>

          {/* Skills section */}
          <div
            style={{
              background: 'var(--color-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-lg)',
              marginBottom: 'var(--space-lg)',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-ink)', marginBottom: 'var(--space-md)' }}>Skills</h2>

            {/* Existing skills */}
            {skills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-xs)', marginBottom: 'var(--space-md)' }}>
                {skills.map((skill, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: 'var(--color-primary-light)',
                      border: '1px solid var(--color-primary)',
                      borderRadius: 'var(--radius-full)',
                      padding: '3px 10px 3px 10px',
                      fontSize: '12px',
                      color: 'var(--color-primary)',
                      fontWeight: 500,
                    }}
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => setSkills(prev => prev.filter((_, i) => i !== idx))}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--color-primary)',
                        fontSize: '12px',
                        lineHeight: 1,
                        padding: '0 0 0 2px',
                      }}
                      title="Remove skill"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add skill input */}
            <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
              <input
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={e => {
                  if ((e.key === 'Enter' || e.key === ',') && skillInput.trim()) {
                    e.preventDefault()
                    const name = skillInput.trim().replace(/,+$/, '')
                    if (name && !skills.includes(name)) {
                      setSkills(prev => [...prev, name])
                    }
                    setSkillInput('')
                  }
                }}
                placeholder="Type a skill and press Enter"
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  fontSize: '13px',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const name = skillInput.trim().replace(/,+$/, '')
                  if (name && !skills.includes(name)) {
                    setSkills(prev => [...prev, name])
                  }
                  setSkillInput('')
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--color-primary)',
                  background: 'var(--color-primary-light)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                }}
              >
                Add
              </button>
            </div>
          </div>

          <StatusMessage status={status} />

          <button onClick={handleSave} disabled={isPending} style={saveButtonStyle(isPending)}>
            {isPending ? 'Saving…' : 'Save profile'}
          </button>
        </div>

        {/* Right — completeness + preview */}
        <div style={{ width: '220px', flexShrink: 0 }}>
          {(() => {
            const { score, hints } = computeCompleteness({
              has_avatar: false, // avatar upload deferred to M2.2
              has_bio: bio.trim().length > 0,
              has_experience: experience.length > 0,
              has_education: education.length > 0,
              has_skills: skills.length > 0,
              has_2plus_posts: postCount >= 2,
              has_website: website.trim().length > 0,
            })
            const barColor = score >= 80 ? 'var(--color-primary)' : score >= 50 ? '#f59e0b' : '#ef4444'
            return (
              <div
                style={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-md)',
                  marginBottom: 'var(--space-md)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink)' }}>Profile strength</span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: barColor,
                    }}
                  >
                    {score}%
                  </span>
                </div>
                <div
                  style={{
                    height: '6px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-border)',
                    overflow: 'hidden',
                    marginBottom: hints.length > 0 ? '12px' : 0,
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${score}%`,
                      background: barColor,
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 300ms ease',
                    }}
                  />
                </div>
                {hints.length > 0 && (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {hints.map(h => (
                      <li
                        key={h.label}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '11px',
                          color: 'var(--color-muted)',
                          padding: '3px 0',
                          borderBottom: '1px solid var(--color-border)',
                        }}
                      >
                        <span>{h.label}</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>+{h.pts}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })()}
          <PreviewPanel html={previewHtml} label="Profile preview" />
        </div>
      </div>
    </div>
  )
}
