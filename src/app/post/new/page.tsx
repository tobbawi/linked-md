'use client'

import { useState, useEffect, useRef, useTransition, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'
import { renderWikilinks } from '@/lib/wikilinks'
import {
  renderMarkdown,
  slugify,
  useWikilinkAutocomplete,
  FieldGroup,
  Input,
  textareaStyle,
  saveButtonStyle,
  StatusMessage,
  PreviewPanel,
  AutocompleteDropdown,
} from '@/components/editor-shared'

// ── Main component ─────────────────────────────────────────────────────────

function NewPostPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const postParam = searchParams.get('post')

  const [authChecked, setAuthChecked] = useState(false)
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [slugEdited, setSlugEdited] = useState(false)
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [status, setStatus] = useState<{
    type: 'success' | 'error'
    message: string
    url?: string
  } | null>(null)

  const [contentCursor, setContentCursor] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auth guard + optionally load existing post for editing
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/auth')
        return
      }

      supabase
        .from('profiles')
        .select('id, slug')
        .eq('user_id', user.id)
        .single()
        .then(async ({ data: profileData }) => {
          if (!profileData) {
            // No profile yet — send to editor to create one first
            router.push('/editor')
            return
          }

          if (postParam) {
            const { data: postData } = await supabase
              .from('posts')
              .select('*')
              .eq('profile_id', profileData.id)
              .eq('slug', postParam)
              .single()
            if (postData) {
              setTitle(postData.title ?? '')
              setSlug(postData.slug)
              setSlugEdited(true)
              setContent(postData.markdown_content)
              setTags((postData.tags ?? []).join(', '))
            }
          }

          setAuthChecked(true)
        })
    })
  }, [router, postParam])

  // Markdown preview
  useEffect(() => {
    const withWikilinks = renderWikilinks(content, new Set())
    renderMarkdown(withWikilinks).then(setPreviewHtml)
  }, [content])

  // Auto-slug from title
  useEffect(() => {
    if (!slugEdited && title) {
      setSlug(slugify(title))
    }
  }, [title, slugEdited])

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

  async function handleSave() {
    if (!slug.trim() || !content.trim()) {
      setStatus({ type: 'error', message: 'Slug and content are required.' })
      return
    }
    setStatus(null)
    startTransition(async () => {
      const res = await fetch('/api/post/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || undefined,
          slug,
          markdown_content: content,
          tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        const url = `/profile/${data.profileSlug}/post/${slug}.md`
        setStatus({ type: 'success', message: `Posted! View at ${url}`, url })
      } else {
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
      <h1
        style={{
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--color-ink)',
          marginBottom: 'var(--space-lg)',
        }}
      >
        {postParam ? 'Edit post' : 'New post'}
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
            }}
          >
            <FieldGroup label="Title" htmlFor="post-title">
              <Input
                id="post-title"
                value={title}
                onChange={(v) => {
                  setTitle(v)
                  if (!slugEdited) setSlug(slugify(v))
                }}
                placeholder="My first post"
              />
            </FieldGroup>

            <FieldGroup label="Slug" htmlFor="post-slug">
              <Input
                id="post-slug"
                value={slug}
                onChange={(v) => {
                  setSlug(v)
                  setSlugEdited(true)
                }}
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
                onChange={setTags}
                placeholder="engineering, product, open-source"
              />
            </FieldGroup>

            <StatusMessage status={status} />

            {status?.type === 'success' && status.url && (
              <a
                href={status.url}
                style={{
                  display: 'inline-block',
                  marginBottom: 'var(--space-md)',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-primary)',
                }}
              >
                {status.url}
              </a>
            )}

            <button onClick={handleSave} disabled={isPending} style={saveButtonStyle(isPending)}>
              {isPending ? 'Saving…' : 'Publish post'}
            </button>
          </div>
        </div>

        {/* Right — preview */}
        <PreviewPanel html={previewHtml} label="Post preview" />
      </div>
    </div>
  )
}

export default function NewPostPage() {
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
      <NewPostPageInner />
    </Suspense>
  )
}
