'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { toSlug } from '@/lib/wikilinks'
import Avatar from '@/components/Avatar'
import type { Company, CompanyMember, Profile } from '@/types'

type Tab = 'details' | 'team'

interface Employee {
  profile: Pick<Profile, 'id' | 'slug' | 'display_name' | 'avatar_url' | 'title'>
}

function CompanyEditorInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editSlug = searchParams.get('slug')
  const isEditing = !!editSlug
  const initialTab = searchParams.get('tab') === 'team' ? 'team' : 'details'

  // Details tab state
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

  // Team tab state
  const [activeTab, setActiveTab] = useState<Tab>(isEditing ? initialTab : 'details')
  const [companyId, setCompanyId] = useState('')
  const [companyOwnerId, setCompanyOwnerId] = useState('')
  const [myProfileId, setMyProfileId] = useState('')
  const [members, setMembers] = useState<CompanyMember[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [inviteHandle, setInviteHandle] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Load existing company if editing
  useEffect(() => {
    if (!editSlug) return

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }

      const { data: company } = await supabase
        .from('companies')
        .select('*')
        .eq('slug', editSlug)
        .single()

      if (company) {
        const co = company as Company
        setName(co.name)
        setSlug(co.slug)
        setTagline(co.tagline ?? '')
        setWebsite(co.website ?? '')
        setBio(co.bio ?? '')
        setContent(co.markdown_content ?? '')
        setSlugManuallyEdited(true)
        setCompanyId(co.id)
        setCompanyOwnerId(co.user_id)
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (profile) setMyProfileId(profile.id)

      setLoading(false)
    }
    load()
  }, [editSlug, router])

  // Load team data when team tab is active
  useEffect(() => {
    if (activeTab !== 'team' || !companyId) return
    loadTeam()
  }, [activeTab, companyId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadTeam() {
    setTeamLoading(true)

    const [membersRes, employeesRes] = await Promise.all([
      supabase
        .from('company_members')
        .select('company_id, profile_id, role, created_at, profile:profiles(id, slug, display_name, user_id, avatar_url)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true }),
      supabase
        .from('experience')
        .select('profile_id, profile:profiles(id, slug, display_name, avatar_url, title)')
        .eq('company_slug', editSlug ?? '')
        .not('profile', 'is', null),
    ])

    setMembers((membersRes.data ?? []) as unknown as CompanyMember[])

    // Deduplicate employees by profile id
    const seen = new Set<string>()
    const deduped: Employee[] = []
    for (const row of (employeesRes.data ?? [])) {
      const p = (row as unknown as { profile: Employee['profile'] }).profile
      if (p && !seen.has(p.id)) {
        seen.add(p.id)
        deduped.push({ profile: p })
      }
    }
    setEmployees(deduped)

    setTeamLoading(false)
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteHandle.trim()) return
    setInviting(true)
    setInviteError('')

    const res = await fetch('/api/company/member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_slug: editSlug, profile_slug: inviteHandle.trim() }),
    })

    setInviting(false)

    if (!res.ok) {
      const data = await res.json()
      setInviteError(data.error ?? 'Failed to add admin')
      return
    }

    setInviteHandle('')
    await loadTeam()
  }

  async function handleRemove(member: CompanyMember) {
    const profileSlug = member.profile?.slug
    if (!profileSlug) return
    setRemovingId(member.profile_id)

    const res = await fetch('/api/company/member', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company_slug: editSlug, profile_slug: profileSlug }),
    })

    setRemovingId(null)

    if (!res.ok) {
      const data = await res.json()
      setInviteError(data.error ?? 'Failed to remove admin')
      return
    }

    await loadTeam()
  }

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
      <div className="p-3xl text-center text-muted">
        Loading…
      </div>
    )
  }

  const inputCls = "w-full py-sm px-md border border-border rounded-sm text-[14px] font-sans text-text bg-card box-border outline-none"

  function onFocus(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.target.style.borderColor = 'var(--color-primary)'
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) {
    e.target.style.borderColor = 'var(--color-border)'
  }

  return (
    <div className="pt-xl pb-3xl">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-xl">
          <h1 className="font-serif text-[1.25rem] text-ink">
            {isEditing ? 'Edit company' : 'Add a company'}
          </h1>
          <a
            href={isEditing ? `/company/${editSlug}` : '/companies'}
            className="text-[13px] text-secondary"
          >
            {isEditing ? `← ${name || 'Company'}` : '← Companies'}
          </a>
        </div>

        {/* Tabs (only when editing) */}
        {isEditing && (
          <div className="flex gap-0 border-b border-border mb-xl">
            {(['details', 'team'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="py-[8px] px-[16px] text-[13px] bg-transparent border-none -mb-[1px] cursor-pointer capitalize font-sans"
                style={{
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? 'var(--color-ink)' : 'var(--color-secondary)',
                  borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Details tab */}
        {activeTab === 'details' && (
          <form onSubmit={handleSave} className="flex flex-col gap-md">
            {/* Name */}
            <div>
              <label className="block text-[12px] font-medium text-secondary mb-[4px]">
                Company name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
                required
                className={inputCls}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-[12px] font-medium text-secondary mb-[4px]">
                URL slug *
              </label>
              <div className="flex items-center gap-xs">
                <span className="text-[13px] text-muted shrink-0">
                  /company/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => { setSlug(e.target.value); setSlugManuallyEdited(true) }}
                  placeholder="acme-corp"
                  required
                  disabled={isEditing}
                  className={inputCls}
                  style={{ opacity: isEditing ? 0.6 : 1 }}
                  onFocus={onFocus}
                  onBlur={onBlur}
                />
              </div>
              <p className="text-[11px] text-muted mt-[4px]">
                Your company profile will be at{' '}
                <span className="font-mono text-primary">
                  /company/{slug || 'your-company'}.md
                </span>
              </p>
            </div>

            {/* Tagline */}
            <div>
              <label className="block text-[12px] font-medium text-secondary mb-[4px]">
                Tagline
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="One line about the company"
                className={inputCls}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Website */}
            <div>
              <label className="block text-[12px] font-medium text-secondary mb-[4px]">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className={inputCls}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Bio */}
            <div>
              <label className="block text-[12px] font-medium text-secondary mb-[4px]">
                Short bio
              </label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short description shown in the sidebar"
                className={inputCls}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-[12px] font-medium text-secondary mb-[4px]">
                About (markdown)
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`Write about the company in markdown.\n\nYou can link to team members with [[Their Name]] and other companies with [[company:Partner Corp]].`}
                rows={12}
                className={`${inputCls} resize-y leading-[1.6] font-mono !text-[13px]`}
                onFocus={onFocus}
                onBlur={onBlur}
              />
              <p className="text-[11px] text-muted mt-[4px]">
                Use{' '}
                <span className="font-mono">[[Name]]</span> to link to profiles,{' '}
                <span className="font-mono">[[company:Name]]</span> to link to companies.
              </p>
            </div>

            {error && (
              <p className="text-[#dc2626] text-[13px]">{error}</p>
            )}

            <div className="flex gap-sm items-center">
              <button
                type="submit"
                disabled={saving || !name.trim() || !slug.trim()}
                className="py-[9px] px-[24px] text-white rounded-sm border-none text-[14px] font-semibold font-sans"
                style={{
                  background: saving || !name.trim() || !slug.trim() ? 'var(--color-border)' : 'var(--color-primary)',
                  cursor: saving || !name.trim() || !slug.trim() ? 'default' : 'pointer',
                }}
              >
                {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create company'}
              </button>
              {isEditing && (
                <a
                  href={`/company/${editSlug}`}
                  className="text-[13px] text-secondary"
                >
                  Cancel
                </a>
              )}
            </div>
          </form>
        )}

        {/* Team tab */}
        {activeTab === 'team' && (
          <div className="flex flex-col gap-xl">

            {/* Admins section */}
            <section>
              <h2 className="text-[13px] font-medium text-muted uppercase tracking-[0.05em] mb-md">
                Admins
              </h2>

              {teamLoading ? (
                <p className="text-[14px] text-muted">Loading…</p>
              ) : (
                <div className="flex flex-col gap-sm">
                  {members.map(member => {
                    const p = member.profile
                    if (!p) return null
                    const isOwner = p.user_id === companyOwnerId
                    const isMe = member.profile_id === myProfileId
                    const isRemoving = removingId === member.profile_id
                    return (
                      <div
                        key={member.profile_id}
                        className="flex items-center gap-md py-sm px-md bg-card border border-border rounded-md"
                      >
                        <Avatar
                          name={p.display_name}
                          avatarUrl={p.avatar_url}
                          size={32}
                        />
                        <div className="flex-1 min-w-0">
                          <a
                            href={`/@${p.slug}`}
                            className="text-[14px] font-medium text-ink no-underline"
                          >
                            {p.display_name}
                          </a>
                          <span className="ml-[8px] text-[11px] text-muted">@{p.slug}</span>
                        </div>
                        <div className="flex items-center gap-xs shrink-0">
                          {/* Role chip */}
                          <span className="text-[11px] font-medium py-[2px] px-[8px] rounded-full bg-border text-secondary border border-border">
                            {isOwner ? 'owner' : 'admin'}
                          </span>
                          {isMe && (
                            <span className="text-[11px] font-medium py-[2px] px-[8px] rounded-full bg-primary-light text-primary border border-primary/20">
                              you
                            </span>
                          )}
                          {/* Remove button — disabled for owner */}
                          {!isOwner && (
                            <button
                              onClick={() => handleRemove(member)}
                              disabled={isRemoving}
                              className="text-[12px] py-[3px] px-[10px] border border-border rounded-sm bg-transparent"
                              style={{
                                color: isRemoving ? 'var(--color-muted)' : '#dc2626',
                                cursor: isRemoving ? 'not-allowed' : 'pointer',
                                opacity: isRemoving ? 0.5 : 1,
                              }}
                            >
                              {isRemoving ? '…' : 'Remove'}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Invite form */}
              <form
                onSubmit={handleInvite}
                className="mt-md flex gap-sm items-start"
              >
                <div className="flex-1">
                  <input
                    value={inviteHandle}
                    onChange={e => setInviteHandle(e.target.value)}
                    placeholder="@handle or username"
                    className="w-full py-[8px] px-[12px] text-[14px] bg-card border border-border rounded-sm text-ink box-border outline-none font-sans"
                  />
                  {inviteError && (
                    <p className="text-[12px] text-[#dc2626] mt-[4px]">{inviteError}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={inviting || !inviteHandle.trim()}
                  className="py-[8px] px-[16px] text-[13px] font-medium text-white border-none rounded-sm whitespace-nowrap font-sans"
                  style={{
                    background: inviting || !inviteHandle.trim() ? 'var(--color-border)' : 'var(--color-primary)',
                    cursor: inviting || !inviteHandle.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {inviting ? 'Adding…' : 'Add admin'}
                </button>
              </form>
            </section>

            {/* Employee roster (read-only) */}
            <section>
              <h2 className="text-[13px] font-medium text-muted uppercase tracking-[0.05em] mb-md">
                Employees
                <span className="ml-[8px] font-normal normal-case text-[11px] text-muted">
                  — from experience entries
                </span>
              </h2>

              {teamLoading ? (
                <p className="text-[14px] text-muted">Loading…</p>
              ) : employees.length === 0 ? (
                <p className="text-[14px] text-muted">
                  No employees yet. When someone adds this company to their experience, they appear here.
                </p>
              ) : (
                <div className="flex flex-col gap-sm">
                  {employees.map(({ profile: p }) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-md py-sm px-md bg-card border border-border rounded-md"
                    >
                      <Avatar name={p.display_name} avatarUrl={p.avatar_url} size={32} />
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/@${p.slug}`}
                          className="text-[14px] font-medium text-ink no-underline"
                        >
                          {p.display_name}
                        </a>
                        {p.title && (
                          <p className="text-[12px] text-muted mt-[1px]">{p.title}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
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
