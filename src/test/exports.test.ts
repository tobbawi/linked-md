import { describe, it, expect } from 'vitest'
import { buildProfileMarkdown, buildPostMarkdown, buildLlmTxt } from '@/lib/exports'
import type { Profile, Post } from '@/types'

const mockProfile: Profile = {
  id: 'p1',
  user_id: 'u1',
  slug: 'jane-doe',
  display_name: 'Jane Doe',
  title: null,
  location: null,
  website: null,
  bio: 'Engineer at Acme.',
  markdown_content: 'I write about systems.',
  outbound_links: [],
  company_links: [],
  created_at: '2026-03-20T00:00:00Z',
  updated_at: '2026-03-20T00:00:00Z',
}

const mockPost: Post = {
  id: 'post1',
  profile_id: 'p1',
  slug: 'hello-world',
  title: 'Hello World',
  markdown_content: 'This is my first post.',
  tags: [],
  created_at: '2026-03-20T00:00:00Z',
  updated_at: '2026-03-20T00:00:00Z',
}

describe('buildProfileMarkdown', () => {
  it('includes display name as h1', () => {
    const md = buildProfileMarkdown(mockProfile)
    expect(md).toContain('# Jane Doe')
  })

  it('includes bio when present', () => {
    const md = buildProfileMarkdown(mockProfile)
    expect(md).toContain('Engineer at Acme.')
  })

  it('includes content when present', () => {
    const md = buildProfileMarkdown(mockProfile)
    expect(md).toContain('I write about systems.')
  })

  it('handles null bio', () => {
    const md = buildProfileMarkdown({ ...mockProfile, bio: null })
    expect(md).toContain('# Jane Doe')
    expect(md).not.toContain('null')
  })

  it('handles empty content', () => {
    const md = buildProfileMarkdown({ ...mockProfile, markdown_content: '' })
    expect(md).toContain('# Jane Doe')
    expect(md).not.toContain('null')
  })
})

describe('buildPostMarkdown', () => {
  it('includes title as h1', () => {
    const md = buildPostMarkdown(mockPost, 'jane-doe')
    expect(md).toContain('# Hello World')
  })

  it('includes post content', () => {
    const md = buildPostMarkdown(mockPost, 'jane-doe')
    expect(md).toContain('This is my first post.')
  })

  it('includes author slug in frontmatter', () => {
    const md = buildPostMarkdown(mockPost, 'jane-doe')
    expect(md).toContain('author: jane-doe')
  })

  it('includes created date', () => {
    const md = buildPostMarkdown(mockPost, 'jane-doe')
    expect(md).toContain('created:')
  })

  it('omits title line when title is null', () => {
    const md = buildPostMarkdown({ ...mockPost, title: null }, 'jane-doe')
    expect(md).not.toContain('# ')
    expect(md).toContain('This is my first post.')
  })
})

describe('buildLlmTxt', () => {
  it('starts with profile heading', () => {
    const txt = buildLlmTxt(mockProfile, [])
    expect(txt).toContain('# Jane Doe')
    expect(txt).toContain('linked.md profile')
  })

  it('includes bio section', () => {
    const txt = buildLlmTxt(mockProfile, [])
    expect(txt).toContain('## Bio')
    expect(txt).toContain('Engineer at Acme.')
  })

  it('includes posts section when posts exist', () => {
    const txt = buildLlmTxt(mockProfile, [mockPost])
    expect(txt).toContain('## Posts')
    expect(txt).toContain('### Hello World')
    expect(txt).toContain('This is my first post.')
  })

  it('omits posts section when no posts', () => {
    const txt = buildLlmTxt(mockProfile, [])
    expect(txt).not.toContain('## Posts')
  })
})
