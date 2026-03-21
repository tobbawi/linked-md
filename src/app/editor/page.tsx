'use client'

import { useState, useEffect, useRef, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { renderWikilinks } from '@/lib/wikilinks'

type EditorMode = 'profile' | 'post'

interface SearchResult {
  slug: string
  display_name: string
}

// ── Markdown rendering ─────────────────────────────────────────────────────

async function renderMarkdown(content: string): Promise<string> {
  const { remark } = await import('remark')
  const remarkHtml = (await import('remark-html')).default
  const result = await remark().use(remarkHtml).process(content)
  return String(result)
}

// ── Slug generation ────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

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

// ── Wikilink autocomplete hook ─────────────────────────────────────────────

function useWikilinkAutocomplete(
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
    // Find if cursor is inside a [[ ... ]] pattern
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

// ── Main editor component ──────────────────────────────────────────────────

function EditorPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const modeParam = searchParams.get('mode') as EditorMode | null
  const postParam = searchParams.get('post')

  const [authChecked, setAuthChecked] = useState(false)
  const [isNewProfile, setIsNewProfile] = useState(false)
  const [mode, setMode] = useState<EditorMode>(modeParam === 'post' ? 'post' : 'profile')
  const [isPending, startTransition] = useTransition()

  // Profile fields
  const [profileDisplayName, setProfileDisplayName] = useState('')
  const [profileTitle, setProfileTitle] = useState('')
  const [profileLocation, setProfileLocation] = useState('')
  const [profileWebsite, setProfileWebsite] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [profileContent, setProfileContent] = useState('')
  const [profileSlug, setProfileSlug] = useState('')
  const [profilePreviewHtml, setProfilePreviewHtml] = useState('')
  const [profileStatus, setProfileStatus] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Post fields
  const [postTitle, setPostTitle] = useState('')
  const [postSlug, setPostSlug] = useState('')
  const [postSlugEdited, setPostSlugEdited] = useState(false)
  const [postContent, setPostContent] = useState('')
  const [postTags, setPostTags] = useState('')
  const [postPreviewHtml, setPostPreviewHtml] = useState('')
  const [postStatus, setPostStatus] = useState<{
    type: 'success' | 'error'
    message: string
    url?: string
  } | null>(null)

  // Cursor tracking for autocomplete
  const [profileContentCursor, setProfileContentCursor] = useState(0)
  const [postContentCursor, setPostContentCursor] = useState(0)
  const profileTextareaRef = useRef<HTMLTextAreaElement>(null)
  const postTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Auth guard + load existing data
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
            setProfileDisplayName(profileData.display_name ?? '')
            setProfileTitle(profileData.title ?? '')
            setProfileLocation(profileData.location ?? '')
            setProfileWebsite(profileData.website ?? '')
            setProfileBio(profileData.bio ?? '')
            setProfileContent(profileData.markdown_content ?? '')
            setProfileSlug(profileData.slug ?? '')

            // Load existing post if ?post= param present
            if (postParam) {
              const { data: postData } = await supabase
                .from('posts')
                .select('*')
                .eq('profile_id', profileData.id)
                .eq('slug', postParam)
                .single()
              if (postData) {
                setPostTitle(postData.title ?? '')
                setPostSlug(postData.slug)
                setPostSlugEdited(true)
                setPostContent(postData.markdown_content)
                setPostTags((postData.tags ?? []).join(', '))
                setMode('post')
              }
            }
          } else {
            setIsNewProfile(true)
          }
          setAuthChecked(true)
        })
    })
  }, [router, postParam])

  // Profile markdown preview
  useEffect(() => {
    const md =
      buildProfileMarkdown(profileDisplayName, profileBio) + '\n' + profileContent
    renderMarkdown(md).then(setProfilePreviewHtml)
  }, [profileDisplayName, profileBio, profileContent])

  // Post markdown preview (with unresolved wikilinks for preview)
  useEffect(() => {
    const withWikilinks = renderWikilinks(postContent, new Set())
    renderMarkdown(withWikilinks).then(setPostPreviewHtml)
  }, [postContent])

  // Auto-slug from post title
  useEffect(() => {
    if (!postSlugEdited && postTitle) {
      setPostSlug(slugify(postTitle))
    }
  }, [postTitle, postSlugEdited])

  // Autocomplete for profile content
  const profileAutocomplete = useWikilinkAutocomplete(
    profileContent,
    profileContentCursor,
    (result, start, end) => {
      const before = profileContent.slice(0, start)
      const after = profileContent.slice(end)
      const insertion = `[[${result.display_name}]]`
      const next = before + insertion + after
      setProfileContent(next)
      const newCursor = start + insertion.length
      setProfileContentCursor(newCursor)
      setTimeout(() => {
        profileTextareaRef.current?.setSelectionRange(newCursor, newCursor)
        profileTextareaRef.current?.focus()
      }, 0)
    }
  )

  // Autocomplete for post content
  const postAutocomplete = useWikilinkAutocomplete(
    postContent,
    postContentCursor,
    (result, start, end) => {
      const before = postContent.slice(0, start)
      const after = postContent.slice(end)
      const insertion = `[[${result.display_name}]]`
      const next = before + insertion + after
      setPostContent(next)
      const newCursor = start + insertion.length
      setPostContentCursor(newCursor)
      setTimeout(() => {
        postTextareaRef.current?.setSelectionRange(newCursor, newCursor)
        postTextareaRef.current?.focus()
      }, 0)
    }
  )

  // Save handlers
  async function handleSaveProfile() {
    if (!profileDisplayName.trim() || !profileSlug.trim()) {
      setProfileStatus({ type: 'error', message: 'Display name and slug are required.' })
      return
    }
    setProfileStatus(null)
    startTransition(async () => {
      const res = await fetch('/api/profile/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: profileDisplayName,
          title: profileTitle || undefined,
          location: profileLocation || undefined,
          website: profileWebsite || undefined,
          bio: profileBio,
          markdown_content: profileContent,
          slug: profileSlug,
        }),
      })
      if (res.ok) {
        router.push(`/profile/${profileSlug}`)
        router.refresh()
      } else {
        const data = await res.json()
        setProfileStatus({
          type: 'error',
          message: data.error ?? 'Save failed.',
        })
      }
    })
  }

  async function handleSavePost() {
    if (!postSlug.trim() || !postContent.trim()) {
      setPostStatus({ type: 'error', message: 'Slug and content are required.' })
      return
    }
    setPostStatus(null)
    startTransition(async () => {
      const res = await fetch('/api/post/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: postTitle || undefined,
          slug: postSlug,
          markdown_content: postContent,
          tags: postTags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        const url = `/profile/${data.profileSlug}/post/${postSlug}.md`
        setPostStatus({
          type: 'success',
          message: `Posted! View at ${url}`,
          url,
        })
      } else {
        setPostStatus({
          type: 'error',
          message: data.error ?? 'Save failed.',
        })
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
      {/* Mode tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          background: 'var(--color-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-sm)',
          padding: '3px',
          marginBottom: 'var(--space-lg)',
          width: 'fit-content',
        }}
      >
        {(['profile', 'post'] as EditorMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '7px 20px',
              fontSize: '13px',
              fontWeight: mode === m ? 600 : 400,
              fontFamily: 'var(--font-sans)',
              color: mode === m ? 'var(--color-ink)' : 'var(--color-secondary)',
              background: mode === m ? 'var(--color-bg)' : 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
          >
            {m === 'profile' ? 'Edit Profile' : 'New Post'}
          </button>
        ))}
      </div>

      {mode === 'profile' ? (
        <ProfileEditor
          displayName={profileDisplayName}
          title={profileTitle}
          location={profileLocation}
          website={profileWebsite}
          bio={profileBio}
          content={profileContent}
          slug={profileSlug}
          previewHtml={profilePreviewHtml}
          status={profileStatus}
          isPending={isPending}
          textareaRef={profileTextareaRef}
          autocomplete={profileAutocomplete}
          onDisplayNameChange={setProfileDisplayName}
          onTitleChange={setProfileTitle}
          onLocationChange={setProfileLocation}
          onWebsiteChange={setProfileWebsite}
          onBioChange={setProfileBio}
          onContentChange={(v) => {
            setProfileContent(v)
          }}
          onContentCursorChange={setProfileContentCursor}
          onSlugChange={setProfileSlug}
          onSave={handleSaveProfile}
        />
      ) : (
        <PostEditor
          title={postTitle}
          slug={postSlug}
          content={postContent}
          tags={postTags}
          previewHtml={postPreviewHtml}
          status={postStatus}
          isPending={isPending}
          textareaRef={postTextareaRef}
          autocomplete={postAutocomplete}
          onTitleChange={(v) => {
            setPostTitle(v)
            if (!postSlugEdited) setPostSlug(slugify(v))
          }}
          onSlugChange={(v) => {
            setPostSlug(v)
            setPostSlugEdited(true)
          }}
          onContentChange={(v) => {
            setPostContent(v)
          }}
          onContentCursorChange={setPostContentCursor}
          onTagsChange={setPostTags}
          onSave={handleSavePost}
        />
      )}
    </div>
  )
}

export default function EditorPage() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <EditorPageInner />
    </Suspense>
  )
}

// ── Profile editor subcomponent ────────────────────────────────────────────

interface ProfileEditorProps {
  displayName: string
  title: string
  location: string
  website: string
  bio: string
  content: string
  slug: string
  previewHtml: string
  status: { type: 'success' | 'error'; message: string } | null
  isPending: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement>
  autocomplete: ReturnType<typeof useWikilinkAutocomplete>
  onDisplayNameChange: (v: string) => void
  onTitleChange: (v: string) => void
  onLocationChange: (v: string) => void
  onWebsiteChange: (v: string) => void
  onBioChange: (v: string) => void
  onContentChange: (v: string) => void
  onContentCursorChange: (pos: number) => void
  onSlugChange: (v: string) => void
  onSave: () => void
}

function ProfileEditor({
  displayName,
  title,
  location,
  website,
  bio,
  content,
  slug,
  previewHtml,
  status,
  isPending,
  textareaRef,
  autocomplete,
  onDisplayNameChange,
  onTitleChange,
  onLocationChange,
  onWebsiteChange,
  onBioChange,
  onContentChange,
  onContentCursorChange,
  onSlugChange,
  onSave,
}: ProfileEditorProps) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'flex-start' }}>
      {/* Left — form */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-lg)',
          }}
        >
          <FieldGroup label="Display name" htmlFor="display-name">
            <Input
              id="display-name"
              value={displayName}
              onChange={onDisplayNameChange}
              placeholder="Jane Doe"
            />
          </FieldGroup>

          <FieldGroup label="Title / role" htmlFor="profile-title">
            <Input
              id="profile-title"
              value={title}
              onChange={onTitleChange}
              placeholder="Software Engineer at Acme"
            />
          </FieldGroup>

          <FieldGroup label="Location" htmlFor="profile-location">
            <Input
              id="profile-location"
              value={location}
              onChange={onLocationChange}
              placeholder="San Francisco, CA"
            />
          </FieldGroup>

          <FieldGroup label="Website" htmlFor="profile-website">
            <Input
              id="profile-website"
              value={website}
              onChange={onWebsiteChange}
              placeholder="https://yoursite.com"
            />
          </FieldGroup>

          <FieldGroup label="Profile slug" htmlFor="profile-slug">
            <Input
              id="profile-slug"
              value={slug}
              onChange={onSlugChange}
              placeholder="jane-doe"
              mono
            />
          </FieldGroup>

          <FieldGroup label="Bio (one line)" htmlFor="bio">
            <Input
              id="bio"
              value={bio}
              onChange={onBioChange}
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
                  onContentChange(e.target.value)
                  onContentCursorChange(e.target.selectionStart)
                }}
                onKeyDown={(e) => {
                  autocomplete.handleKey(e)
                  onContentCursorChange(
                    (e.target as HTMLTextAreaElement).selectionStart
                  )
                }}
                onSelect={(e) =>
                  onContentCursorChange(
                    (e.target as HTMLTextAreaElement).selectionStart
                  )
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

          <StatusMessage status={status} />

          <button
            onClick={onSave}
            disabled={isPending}
            style={saveButtonStyle(isPending)}
          >
            {isPending ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>

      {/* Right — preview */}
      <PreviewPanel html={previewHtml} label="Profile preview" />
    </div>
  )
}

// ── Post editor subcomponent ───────────────────────────────────────────────

interface PostEditorProps {
  title: string
  slug: string
  content: string
  tags: string
  previewHtml: string
  status: { type: 'success' | 'error'; message: string; url?: string } | null
  isPending: boolean
  textareaRef: React.RefObject<HTMLTextAreaElement>
  autocomplete: ReturnType<typeof useWikilinkAutocomplete>
  onTitleChange: (v: string) => void
  onSlugChange: (v: string) => void
  onContentChange: (v: string) => void
  onContentCursorChange: (pos: number) => void
  onTagsChange: (v: string) => void
  onSave: () => void
}

function PostEditor({
  title,
  slug,
  content,
  tags,
  previewHtml,
  status,
  isPending,
  textareaRef,
  autocomplete,
  onTitleChange,
  onSlugChange,
  onContentChange,
  onContentCursorChange,
  onTagsChange,
  onSave,
}: PostEditorProps) {
  return (
    <div style={{ display: 'flex', gap: 'var(--space-lg)', alignItems: 'flex-start' }}>
      {/* Left — form */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            background: 'var(--color-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-lg)',
          }}
        >
          <FieldGroup label="Title" htmlFor="post-title">
            <Input
              id="post-title"
              value={title}
              onChange={onTitleChange}
              placeholder="My first post"
            />
          </FieldGroup>

          <FieldGroup label="Slug" htmlFor="post-slug">
            <Input
              id="post-slug"
              value={slug}
              onChange={onSlugChange}
              placeholder="my-first-post"
              mono
            />
          </FieldGroup>

          <FieldGroup label="Content (markdown)" htmlFor="post-content">
            <div style={{ position: 'relative' }}>
              <textarea
                id="post-content"
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  onContentChange(e.target.value)
                  onContentCursorChange(e.target.selectionStart)
                }}
                onKeyDown={(e) => {
                  autocomplete.handleKey(e)
                  onContentCursorChange(
                    (e.target as HTMLTextAreaElement).selectionStart
                  )
                }}
                onSelect={(e) =>
                  onContentCursorChange(
                    (e.target as HTMLTextAreaElement).selectionStart
                  )
                }
                placeholder="Write your post... Use [[Name]] to link people."
                rows={16}
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
            <p
              style={{
                marginTop: 'var(--space-xs)',
                fontSize: '11px',
                color: 'var(--color-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              Tip: Use [[Name]] to link people
            </p>
          </FieldGroup>

          <FieldGroup label="Tags (comma-separated)" htmlFor="post-tags">
            <Input
              id="post-tags"
              value={tags}
              onChange={onTagsChange}
              placeholder="engineering, product, open-source"
            />
          </FieldGroup>

          <StatusMessage status={status} />

          <button
            onClick={onSave}
            disabled={isPending}
            style={saveButtonStyle(isPending)}
          >
            {isPending ? 'Saving…' : 'Publish post'}
          </button>
        </div>
      </div>

      {/* Right — preview */}
      <PreviewPanel html={previewHtml} label="Post preview" />
    </div>
  )
}

// ── Shared UI helpers ──────────────────────────────────────────────────────

function FieldGroup({
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

function Input({
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

const textareaStyle: React.CSSProperties = {
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

function saveButtonStyle(isPending: boolean): React.CSSProperties {
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

function StatusMessage({
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

function PreviewPanel({ html, label }: { html: string; label: string }) {
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
        dangerouslySetInnerHTML={{ __html: html || '<p style="color: var(--color-muted); font-style: italic;">Preview will appear here…</p>' }}
      />
    </div>
  )
}

function AutocompleteDropdown({
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
              i === selectedIdx
                ? 'var(--color-primary-light)'
                : 'transparent',
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
