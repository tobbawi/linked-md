'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { toSlug } from '@/lib/wikilinks'
import type { Company } from '@/types'

function CompanyEditorInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editSlug = searchParams.get('slug')
  const isEditing = !!editSlug

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [tagline, setTagline] = useState('')
  const [website, setWebsite] = useState('')
  const [bio, setBio] = useState('')
  const [content, setContent] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(isEditing)

  // Load existing company if editing
  useEffect(() => {
    if (!editSlug) return

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const res = await fetch(`/api/raw/company/${editSlug}`)
      if (!res.ok) { setLoading(false); return }

      // Fetch the full JSON via Supabase directly
      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('slug', editSlug)
        .single()

      if (company) {
        setName((company as Company).name)
        setSlug((company as Company).slug)
        setTagline((company as Company).tagline ?? '')
        setWebsite((company as Company).website ?? '')
        setBio((company as Company).bio ?? '')
        setContent((company as Company).markdown_content ?? '')
        setSlugManuallyEdited(true)
      }
      setLoading(false)
    }
    load()
  }, [editSlug, router])

  // Auto-derive slug from name
  useEffect(() => {
    if (!slugManuallyEdited && name) {
      setSlug(toSlug(name))
    }
  }, [name, slugManuallyEdited])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch('/api/company/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          tagline: tagline.trim() || undefined,
          website: website.trim() || undefined,
          bio: bio.trim() || undefined,
          markdown_content: content,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to save')
      } else {
        router.push(`/company/${data.company.slug}`)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-3xl)', textAlign: 'center', color: 'var(--color-muted)' }}>
        Loading…
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 'var(--space-sm) var(--space-md)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontFamily: 'var(--font-sans)',
    color: 'var(--color-text)',
    background: 'var(--color-card)',
    boxSizing: 'border-box',
    outline: 'none',
  }

  function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.target.style.borderColor = 'var(--color-primary)'
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.target.style.borderColor = 'var(--color-border)'
  }

  return (
    <div style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              color: 'var(--color-ink)',
            }}
          >
            {isEditing ? 'Edit company' : 'Add a company'}
          </h1>
          <a
            href="/companies"
            style={{ fontSize: '13px', color: 'var(--color-secondary)' }}
          >
            ← Companies
          </a>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-secondary)', marginBottom: '4px' }}>
              Company name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              required
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* Slug */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-secondary)', marginBottom: '4px' }}>
              URL slug *
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)' }}>
              <span style={{ fontSize: '13px', color: 'var(--color-muted)', flexShrink: 0 }}>
                /company/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => { setSlug(e.target.value); setSlugManuallyEdited(true) }}
                placeholder="acme-corp"
                required
                disabled={isEditing}
                style={{ ...inputStyle, opacity: isEditing ? 0.6 : 1 }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
              Your company profile will be at{' '}
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                /company/{slug || 'your-company'}.md
              </span>
            </p>
          </div>

          {/* Tagline */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-secondary)', marginBottom: '4px' }}>
              Tagline
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="One line about the company"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* Website */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-secondary)', marginBottom: '4px' }}>
              Website
            </label>
            <input
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* Bio */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-secondary)', marginBottom: '4px' }}>
              Short bio
            </label>
            <input
              type="text"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short description shown in the sidebar"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* Content */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-secondary)', marginBottom: '4px' }}>
              About (markdown)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Write about the company in markdown.\n\nYou can link to team members with [[Their Name]] and other companies with [[company:Partner Corp]].`}
              rows={12}
              style={{
                ...inputStyle,
                resize: 'vertical',
                lineHeight: 1.6,
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
              }}
              onFocus={onFocus}
              onBlur={onBlur}
            />
            <p style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '4px' }}>
              Use{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>[[Name]]</span> to link to profiles,{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>[[company:Name]]</span> to link to companies.
            </p>
          </div>

          {error && (
            <p style={{ color: '#dc2626', fontSize: '13px' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={saving || !name.trim() || !slug.trim()}
              style={{
                padding: '9px 24px',
                background: saving || !name.trim() || !slug.trim() ? 'var(--color-border)' : 'var(--color-primary)',
                color: '#fff',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                fontSize: '14px',
                fontWeight: 600,
                cursor: saving || !name.trim() || !slug.trim() ? 'default' : 'pointer',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create company'}
            </button>
            {isEditing && (
              <a
                href={`/company/${editSlug}`}
                style={{ fontSize: '13px', color: 'var(--color-secondary)' }}
              >
                Cancel
              </a>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CompanyEditorPage() {
  return (
    <Suspense>
      <CompanyEditorInner />
    </Suspense>
  )
}
