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

      // Resolve the viewer's profile id (needed for membership check)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!profile) {
        setError('Profile not found. Complete your profile first.')
        setLoading(false)
        return
      }

      if (!companySlug) {
        // Find any company this user admins via company_members
        const { data: membership } = await supabase
          .from('company_members')
          .select('company_id, companies(*)')
          .eq('profile_id', profile.id)
          .limit(1)
          .maybeSingle()

        if (!membership) {
          setError('No company found. Create a company first.')
          setLoading(false)
          return
        }
        const co = (membership as unknown as { companies: Company }).companies
        setCompany(co)
        await loadJobs(co.id)
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

        // Verify caller is an admin of this company
        const { data: membership } = await supabase
          .from('company_members')
          .select('role')
          .eq('company_id', co.id)
          .eq('profile_id', profile.id)
          .maybeSingle()

        if (!membership) {
          setError('You are not an admin of this company.')
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
      <div className="pt-3xl text-center text-muted">
        Loading…
      </div>
    )
  }

  if (error) {
    return (
      <div className="pt-3xl max-w-[480px] mx-auto">
        <p className="text-muted text-[15px]">{error}</p>
      </div>
    )
  }

  const inputCls = "w-full py-[8px] px-[12px] text-[14px] bg-bg border border-border rounded-sm text-ink box-border"

  const activeJobs = jobs.filter(j => j.active)
  const inactiveJobs = jobs.filter(j => !j.active)

  return (
    <div className="pt-xl pb-3xl">
      <div>
        {/* Header */}
        <div className="mb-xl">
          <h1 className="font-serif text-[1.25rem] text-ink mb-xs">
            Manage Jobs
          </h1>
          {company && (
            <p className="text-[14px] text-secondary">
              for{' '}
              <a href={`/company/${company.slug}`} className="text-primary">
                {company.name}
              </a>
            </p>
          )}
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-lg p-lg mb-xl">
          <h2 className="text-[14px] font-semibold text-ink mb-md">
            {editingId ? 'Edit role' : 'Post a new role'}
          </h2>

          <form onSubmit={handleSave} className="flex flex-col gap-md">
            <div>
              <label className="block text-[12px] font-medium text-secondary mb-[6px]">
                Role title *
              </label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Senior Software Engineer"
                className={inputCls}
              />
            </div>

            <div className="flex gap-md">
              <div className="flex-1">
                <label className="block text-[12px] font-medium text-secondary mb-[6px]">
                  Location
                </label>
                <input
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Remote, New York"
                  className={inputCls}
                />
              </div>

              <div className="flex-1">
                <label className="block text-[12px] font-medium text-secondary mb-[6px]">
                  Type
                </label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as JobListing['type'])}
                  className={inputCls}
                >
                  {JOB_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-secondary mb-[6px]">
                Description (markdown)
              </label>
              <textarea
                value={descriptionMd}
                onChange={e => setDescriptionMd(e.target.value)}
                rows={8}
                placeholder="Describe the role, responsibilities, requirements…"
                className={`${inputCls} font-mono resize-y`}
              />
            </div>

            {formError && (
              <p className="text-[13px] text-[#dc2626]">{formError}</p>
            )}

            <div className="flex gap-sm items-center">
              <button
                type="submit"
                disabled={saving}
                className="py-[8px] px-[20px] text-[13px] font-medium bg-primary text-white border-none rounded-sm"
                style={{
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
                  className="py-[8px] px-[16px] text-[13px] text-secondary bg-transparent border border-border rounded-sm cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Active jobs */}
        {activeJobs.length > 0 && (
          <div className="mb-xl">
            <h2 className="text-[13px] font-medium text-muted uppercase tracking-[0.05em] mb-md">
              Active ({activeJobs.length})
            </h2>
            <div className="flex flex-col gap-sm">
              {activeJobs.map(job => (
                <div
                  key={job.id}
                  className="p-md bg-card border border-border rounded-md flex items-center justify-between gap-md"
                >
                  <div>
                    <p className="text-[14px] font-medium text-ink">{job.title}</p>
                    <p className="text-[12px] text-muted mt-[2px]">
                      {job.type}{job.location ? ` · ${job.location}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-xs shrink-0">
                    <button
                      onClick={() => startEdit(job)}
                      className="text-[12px] py-[4px] px-[10px] border border-border rounded-sm bg-transparent text-secondary cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeactivate(job)}
                      className="text-[12px] py-[4px] px-[10px] border border-border rounded-sm bg-transparent text-[#dc2626] cursor-pointer"
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
            <h2 className="text-[13px] font-medium text-muted uppercase tracking-[0.05em] mb-md">
              Closed ({inactiveJobs.length})
            </h2>
            <div className="flex flex-col gap-sm">
              {inactiveJobs.map(job => (
                <div
                  key={job.id}
                  className="p-md bg-card border border-border rounded-md opacity-60"
                >
                  <p className="text-[14px] text-ink">{job.title}</p>
                  <p className="text-[12px] text-muted mt-[2px]">
                    {job.type}{job.location ? ` · ${job.location}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeJobs.length === 0 && inactiveJobs.length === 0 && (
          <p className="text-[14px] text-muted">
            No roles posted yet. Post your first role above.
          </p>
        )}
      </div>
    </div>
  )
}

export default function JobsEditorPage() {
  return (
    <Suspense fallback={<div className="pt-3xl text-center text-muted">Loading…</div>}>
      <JobsEditorInner />
    </Suspense>
  )
}
