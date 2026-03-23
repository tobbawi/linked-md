'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import type { JobListing, Company } from '@/types'

const JOB_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
]

function JobsEditorInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const companySlug = searchParams.get('company')

  const [company, setCompany] = useState<Company | null>(null)
  const [jobs, setJobs] = useState<JobListing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [type, setType] = useState<JobListing['type']>('full-time')
  const [descriptionMd, setDescriptionMd] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      if (!companySlug) {
        // Find user's company
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', session.user.id)
          .single()

        if (profile) {
          const { data: co } = await supabase
            .from('companies')
            .select('*')
            .eq('user_id', session.user.id)
            .single()

          if (!co) {
            setError('No company found. Create a company first.')
            setLoading(false)
            return
          }
          setCompany(co as Company)
          await loadJobs(co.id)
        }
      } else {
        const { data: co } = await supabase
          .from('companies')
          .select('*')
          .eq('slug', companySlug)
          .single()

        if (!co) {
          setError('Company not found.')
          setLoading(false)
          return
        }

        if ((co as Company).user_id !== session.user.id) {
          setError('You do not own this company.')
          setLoading(false)
          return
        }

        setCompany(co as Company)
        await loadJobs(co.id)
      }

      setLoading(false)
    }

    load()
  }, [companySlug, router])

  async function loadJobs(companyId: string) {
    const { data } = await supabase
      .from('job_listings')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    setJobs((data ?? []) as JobListing[])
  }

  function startNew() {
    setEditingId(null)
    setTitle('')
    setLocation('')
    setType('full-time')
    setDescriptionMd('')
    setFormError('')
  }

  function startEdit(job: JobListing) {
    setEditingId(job.id)
    setTitle(job.title)
    setLocation(job.location ?? '')
    setType(job.type)
    setDescriptionMd(job.description_md)
    setFormError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!company) return
    if (!title.trim()) { setFormError('Title is required.'); return }

    setSaving(true)
    setFormError('')

    const res = await fetch('/api/jobs/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingId,
        company_slug: company.slug,
        title: title.trim(),
        location: location.trim() || null,
        type,
        description_md: descriptionMd.trim(),
        active: true,
      }),
    })

    setSaving(false)

    if (!res.ok) {
      const data = await res.json()
      setFormError(data.error ?? 'Failed to save.')
      return
    }

    // Reload jobs
    await loadJobs(company.id)
    startNew()
  }

  async function handleDeactivate(job: JobListing) {
    if (!confirm(`Remove "${job.title}" from open roles?`)) return

    await fetch('/api/jobs/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: job.id,
        company_slug: company!.slug,
        title: job.title,
        location: job.location,
        type: job.type,
        description_md: job.description_md,
        active: false,
      }),
    })

    await loadJobs(company!.id)
  }

  if (loading) {
    return (
      <div style={{ paddingTop: 'var(--space-3xl)', textAlign: 'center', color: 'var(--color-muted)' }}>
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ paddingTop: 'var(--space-3xl)', maxWidth: '480px', margin: '0 auto' }}>
        <p style={{ color: 'var(--color-muted)', fontSize: '15px' }}>{error}</p>
      </div>
    )
  }

  const activeJobs = jobs.filter(j => j.active)
  const inactiveJobs = jobs.filter(j => !j.active)

  return (
    <div style={{ paddingTop: 'var(--space-xl)', paddingBottom: 'var(--space-3xl)' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.5rem',
              color: 'var(--color-ink)',
              marginBottom: 'var(--space-xs)',
            }}
          >
            Manage Jobs
          </h1>
          {company && (
            <p style={{ fontSize: '14px', color: 'var(--color-secondary)' }}>
              for{' '}
              <a href={`/company/${company.slug}`} style={{ color: 'var(--color-primary)' }}>
                {company.name}
              </a>
            </p>
          )}
        </div>

        {/* Form */}
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-lg)',
            marginBottom: 'var(--space-xl)',
          }}
        >
          <h2
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--color-ink)',
              marginBottom: 'var(--space-md)',
            }}
          >
            {editingId ? 'Edit role' : 'Post a new role'}
          </h2>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-secondary)', marginBottom: '6px' }}>
                Role title *
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '14px',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-ink)',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-secondary)', marginBottom: '6px' }}>
                  Location
                </label>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Remote, New York"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-ink)',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-secondary)', marginBottom: '6px' }}>
                  Type
                </label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as JobListing['type'])}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--color-ink)',
                    boxSizing: 'border-box',
                  }}
                >
                  {JOB_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: 'var(--color-secondary)', marginBottom: '6px' }}>
                Description (markdown)
              </label>
              <textarea
                value={descriptionMd}
                onChange={e => setDescriptionMd(e.target.value)}
                rows={8}
                placeholder="Describe the role, responsibilities, requirements…"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--color-bg)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-ink)',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {formError && (
              <p style={{ fontSize: '13px', color: '#dc2626' }}>{formError}</p>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : editingId ? 'Update role' : 'Post role'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={startNew}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    color: 'var(--color-secondary)',
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Active jobs */}
        {activeJobs.length > 0 && (
          <div style={{ marginBottom: 'var(--space-xl)' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-md)' }}>
              Active ({activeJobs.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {activeJobs.map(job => (
                <div
                  key={job.id}
                  style={{
                    padding: 'var(--space-md)',
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 'var(--space-md)',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)' }}>{job.title}</p>
                    <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                      {job.type}{job.location ? ` · ${job.location}` : ''}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-xs)', flexShrink: 0 }}>
                    <button
                      onClick={() => startEdit(job)}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        color: 'var(--color-secondary)',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeactivate(job)}
                      style={{
                        fontSize: '12px',
                        padding: '4px 10px',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        color: '#dc2626',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inactive jobs */}
        {inactiveJobs.length > 0 && (
          <div>
            <h2 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-md)' }}>
              Closed ({inactiveJobs.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {inactiveJobs.map(job => (
                <div
                  key={job.id}
                  style={{
                    padding: 'var(--space-md)',
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    opacity: 0.6,
                  }}
                >
                  <p style={{ fontSize: '14px', color: 'var(--color-ink)' }}>{job.title}</p>
                  <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
                    {job.type}{job.location ? ` · ${job.location}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeJobs.length === 0 && inactiveJobs.length === 0 && (
          <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
            No roles posted yet. Post your first role above.
          </p>
        )}
      </div>
    </div>
  )
}

export default function JobsEditorPage() {
  return (
    <Suspense fallback={<div style={{ paddingTop: 'var(--space-3xl)', textAlign: 'center', color: 'var(--color-muted)' }}>Loading…</div>}>
      <JobsEditorInner />
    </Suspense>
  )
}
