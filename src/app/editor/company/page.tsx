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
        {/* Header */}
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
            href={isEditing ? `/company/${editSlug}` : '/companies'}
            style={{ fontSize: '13px', color: 'var(--color-secondary)' }}
          >
            {isEditing ? `← ${name || 'Company'}` : '← Companies'}
          </a>
        </div>

        {/* Tabs (only when editing) */}
        {isEditing && (
          <div
            style={{
              display: 'flex',
              gap: '0',
              borderBottom: '1px solid var(--color-border)',
              marginBottom: 'var(--space-xl)',
            }}
          >
            {(['details', 'team'] as Tab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: activeTab === tab ? 600 : 400,
                  color: activeTab === tab ? 'var(--color-ink)' : 'var(--color-secondary)',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                  marginBottom: '-1px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        {/* Details tab */}
        {activeTab === 'details' && (
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
        )}

        {/* Team tab */}
        {activeTab === 'team' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>

            {/* Admins section */}
            <section>
              <h2 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-md)' }}>
                Admins
              </h2>

              {teamLoading ? (
                <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>Loading…</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {members.map(member => {
                    const p = member.profile
                    if (!p) return null
                    const isOwner = p.user_id === companyOwnerId
                    const isMe = member.profile_id === myProfileId
                    const isRemoving = removingId === member.profile_id
                    return (
                      <div
                        key={member.profile_id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-md)',
                          padding: 'var(--space-sm) var(--space-md)',
                          background: 'var(--color-card)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-md)',
                        }}
                      >
                        <Avatar
                          name={p.display_name}
                          avatarUrl={p.avatar_url}
                          size={32}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <a
                            href={`/@${p.slug}`}
                            style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)', textDecoration: 'none' }}
                          >
                            {p.display_name}
                          </a>
                          <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--color-muted)' }}>@{p.slug}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexShrink: 0 }}>
                          {/* Role chip */}
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              padding: '2px 8px',
                              borderRadius: '999px',
                              background: isOwner ? 'var(--color-border)' : 'var(--color-surface, var(--color-border))',
                              color: 'var(--color-secondary)',
                              border: '1px solid var(--color-border)',
                            }}
                          >
                            {isOwner ? 'owner' : 'admin'}
                          </span>
                          {isMe && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                padding: '2px 8px',
                                borderRadius: '999px',
                                background: 'rgba(13,147,115,0.1)',
                                color: 'var(--color-primary)',
                                border: '1px solid rgba(13,147,115,0.2)',
                              }}
                            >
                              you
                            </span>
                          )}
                          {/* Remove button — disabled for owner */}
                          {!isOwner && (
                            <button
                              onClick={() => handleRemove(member)}
                              disabled={isRemoving}
                              style={{
                                fontSize: '12px',
                                padding: '3px 10px',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                background: 'transparent',
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
                style={{
                  marginTop: 'var(--space-md)',
                  display: 'flex',
                  gap: 'var(--space-sm)',
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flex: 1 }}>
                  <input
                    value={inviteHandle}
                    onChange={e => setInviteHandle(e.target.value)}
                    placeholder="@handle or username"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      background: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-ink)',
                      boxSizing: 'border-box',
                      outline: 'none',
                      fontFamily: 'var(--font-sans)',
                    }}
                  />
                  {inviteError && (
                    <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px' }}>{inviteError}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={inviting || !inviteHandle.trim()}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: 500,
                    background: inviting || !inviteHandle.trim() ? 'var(--color-border)' : 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: inviting || !inviteHandle.trim() ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-sans)',
                  }}
                >
                  {inviting ? 'Adding…' : 'Add admin'}
                </button>
              </form>
            </section>

            {/* Employee roster (read-only) */}
            <section>
              <h2 style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-md)' }}>
                Employees
                <span style={{ marginLeft: '8px', fontWeight: 400, textTransform: 'none', fontSize: '11px', color: 'var(--color-muted)' }}>
                  — from experience entries
                </span>
              </h2>

              {teamLoading ? (
                <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>Loading…</p>
              ) : employees.length === 0 ? (
                <p style={{ fontSize: '14px', color: 'var(--color-muted)' }}>
                  No employees yet. When someone adds this company to their experience, they appear here.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                  {employees.map(({ profile: p }) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-md)',
                        padding: 'var(--space-sm) var(--space-md)',
                        background: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <Avatar name={p.display_name} avatarUrl={p.avatar_url} size={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <a
                          href={`/@${p.slug}`}
                          style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-ink)', textDecoration: 'none' }}
                        >
                          {p.display_name}
                        </a>
                        {p.title && (
                          <p style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '1px' }}>{p.title}</p>
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
