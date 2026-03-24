import { describe, it, expect } from 'vitest'
import { buildProfileMarkdown, buildPostMarkdown, buildLlmTxt, buildLlmFullTxt, buildLlmCompanyTxt, buildLlmCompanyFullTxt } from '@/lib/exports'
import type { Profile, Post, ExperienceEntry, EducationEntry, ProfileSkill, Recommendation, Company, Repost } from '@/types'

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
  avatar_url: null,
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

const mockExperience: ExperienceEntry = {
  id: 'e1',
  profile_id: 'p1',
  company_name: 'Acme Corp',
  company_slug: 'acme-corp',
  title: 'Staff Engineer',
  start_year: 2022,
  start_month: 1,
  end_year: null,
  end_month: null,
  is_current: true,
  description: 'Building distributed systems.',
  sort_order: 0,
  created_at: '2026-03-20T00:00:00Z',
  updated_at: '2026-03-20T00:00:00Z',
}

const mockPastExperience: ExperienceEntry = {
  id: 'e2',
  profile_id: 'p1',
  company_name: 'Beta Inc',
  company_slug: 'beta-inc',
  title: 'Engineer',
  start_year: 2020,
  start_month: 3,
  end_year: 2021,
  end_month: 12,
  is_current: false,
  description: null,
  sort_order: 1,
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

  it('includes experience entries', () => {
    const md = buildProfileMarkdown(mockProfile, [mockExperience])
    expect(md).toContain('## Experience')
    expect(md).toContain('### Staff Engineer at Acme Corp')
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

describe('buildLlmTxt (summary)', () => {
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

  it('includes current roles only', () => {
    const txt = buildLlmTxt(mockProfile, [mockExperience, mockPastExperience])
    expect(txt).toContain('## Current')
    expect(txt).toContain('Staff Engineer at Acme Corp')
    expect(txt).not.toContain('Beta Inc')
  })

  it('omits current section when no current roles', () => {
    const txt = buildLlmTxt(mockProfile, [mockPastExperience])
    expect(txt).not.toContain('## Current')
  })

  it('includes pointer to llm-full.txt', () => {
    const txt = buildLlmTxt(mockProfile, [])
    expect(txt).toContain('/profile/jane-doe/llm-full.txt')
  })

  it('does not include posts', () => {
    const txt = buildLlmTxt(mockProfile, [])
    expect(txt).not.toContain('## Posts')
  })

  it('includes network stats when provided', () => {
    const txt = buildLlmTxt(mockProfile, [], { followerCount: 42, followingCount: 10 })
    expect(txt).toContain('followers: 42')
    expect(txt).toContain('following: 10')
  })
})

const mockEducation: EducationEntry = {
  id: 'edu1',
  profile_id: 'p1',
  school: 'MIT',
  degree: 'BS',
  field_of_study: 'Computer Science',
  start_year: 2014,
  start_month: 9,
  end_year: 2018,
  end_month: 5,
  is_current: false,
  sort_order: 0,
  created_at: '2026-03-20T00:00:00Z',
  updated_at: '2026-03-20T00:00:00Z',
}

const mockSkill: ProfileSkill = {
  id: 'sk1',
  profile_id: 'p1',
  name: 'TypeScript',
  sort_order: 0,
  created_at: '2026-03-20T00:00:00Z',
}

const mockRecommendation: Recommendation = {
  id: 'rec1',
  author_id: 'p2',
  recipient_id: 'p1',
  body: 'Jane is an exceptional engineer with a strong system design background.',
  visible: true,
  created_at: '2026-03-20T00:00:00Z',
  updated_at: '2026-03-20T00:00:00Z',
  author: { slug: 'bob-smith', display_name: 'Bob Smith' },
}

describe('buildLlmFullTxt (full)', () => {
  it('starts with full heading', () => {
    const txt = buildLlmFullTxt(mockProfile, { posts: [mockPost] })
    expect(txt).toContain('# Jane Doe')
    expect(txt).toContain('(full)')
  })

  it('includes all experience entries', () => {
    const txt = buildLlmFullTxt(mockProfile, { experience: [mockExperience, mockPastExperience] })
    expect(txt).toContain('## Experience')
    expect(txt).toContain('Staff Engineer at Acme Corp')
    expect(txt).toContain('Engineer at Beta Inc')
  })

  it('includes posts section when posts exist', () => {
    const txt = buildLlmFullTxt(mockProfile, { posts: [mockPost] })
    expect(txt).toContain('## Posts')
    expect(txt).toContain('### Hello World')
    expect(txt).toContain('This is my first post.')
  })

  it('omits posts section when no posts', () => {
    const txt = buildLlmFullTxt(mockProfile, {})
    expect(txt).not.toContain('## Posts')
  })

  it('includes source pointer', () => {
    const txt = buildLlmFullTxt(mockProfile, {})
    expect(txt).toContain('/profile/jane-doe/llm-full.txt')
  })

  it('includes education section when education provided', () => {
    const txt = buildLlmFullTxt(mockProfile, { education: [mockEducation] })
    expect(txt).toContain('## Education')
    expect(txt).toContain('MIT')
    expect(txt).toContain('BS, Computer Science')
  })

  it('omits education section when empty', () => {
    const txt = buildLlmFullTxt(mockProfile, {})
    expect(txt).not.toContain('## Education')
  })

  it('includes skills section when skills provided', () => {
    const txt = buildLlmFullTxt(mockProfile, { skills: [mockSkill] })
    expect(txt).toContain('## Skills')
    expect(txt).toContain('TypeScript')
  })

  it('omits skills section when empty', () => {
    const txt = buildLlmFullTxt(mockProfile, {})
    expect(txt).not.toContain('## Skills')
  })

  it('includes recommendations section when provided', () => {
    const txt = buildLlmFullTxt(mockProfile, { recommendations: [mockRecommendation] })
    expect(txt).toContain('## Recommendations')
    expect(txt).toContain('Bob Smith')
    expect(txt).toContain('exceptional engineer')
  })

  it('omits recommendations section when empty', () => {
    const txt = buildLlmFullTxt(mockProfile, {})
    expect(txt).not.toContain('## Recommendations')
  })
})

const mockCompany: Company = {
  id: 'c1',
  user_id: 'u1',
  slug: 'acme-corp',
  name: 'Acme Corp',
  tagline: 'Building the future',
  website: 'https://acme.com',
  bio: 'We make things.',
  markdown_content: '## Our story\nFounded in 2020.',
  outbound_links: [],
  created_at: '2026-03-20T00:00:00Z',
  updated_at: '2026-03-20T00:00:00Z',
}

const mockRepost = {
  id: 'rp1',
  profile_id: 'p1',
  original_post_id: 'post2',
  comment: 'Great insights here.',
  created_at: '2026-03-24T10:00:00Z',
  post: {
    slug: 'hello-world',
    title: 'Hello World',
    profile: { slug: 'bob-smith', display_name: 'Bob Smith' },
  },
} as Repost & { post: { slug: string; title: string | null; profile: { slug: string; display_name: string } } }

describe('buildLlmFullTxt — reposts', () => {
  it('includes Reposts section when reposts provided', () => {
    const txt = buildLlmFullTxt(mockProfile, { reposts: [mockRepost] })
    expect(txt).toContain('## Reposts (1)')
    expect(txt).toContain('Reposted: "Hello World"')
    expect(txt).toContain('/profile/bob-smith/post/hello-world.md')
    expect(txt).toContain('Great insights here.')
  })

  it('omits Reposts section when no reposts', () => {
    const txt = buildLlmFullTxt(mockProfile, {})
    expect(txt).not.toContain('## Reposts')
  })

  it('omits Reposts section when empty array', () => {
    const txt = buildLlmFullTxt(mockProfile, { reposts: [] })
    expect(txt).not.toContain('## Reposts')
  })

  it('handles repost without comment', () => {
    const noComment = { ...mockRepost, comment: null }
    const txt = buildLlmFullTxt(mockProfile, { reposts: [noComment] })
    expect(txt).toContain('## Reposts (1)')
    expect(txt).not.toContain('null')
  })

  it('handles repost with null title (untitled post)', () => {
    const untitled = { ...mockRepost, post: { ...mockRepost.post, title: null } }
    const txt = buildLlmFullTxt(mockProfile, { reposts: [untitled] })
    expect(txt).toContain('a post by Bob Smith')
  })

  it('shows correct count for multiple reposts', () => {
    const repost2 = { ...mockRepost, id: 'rp2', original_post_id: 'post3' }
    const txt = buildLlmFullTxt(mockProfile, { reposts: [mockRepost, repost2] })
    expect(txt).toContain('## Reposts (2)')
  })

  it('Reposts section appears before Posts section', () => {
    const txt = buildLlmFullTxt(mockProfile, { posts: [mockPost], reposts: [mockRepost] })
    const repostsIdx = txt.indexOf('## Reposts')
    const postsIdx = txt.indexOf('## Posts')
    expect(repostsIdx).toBeGreaterThan(-1)
    expect(postsIdx).toBeGreaterThan(-1)
    expect(repostsIdx).toBeLessThan(postsIdx)
  })
})

describe('buildLlmCompanyTxt (company summary)', () => {
  it('includes company name heading', () => {
    const txt = buildLlmCompanyTxt(mockCompany, 3)
    expect(txt).toContain('# Acme Corp')
    expect(txt).toContain('linked.md company profile')
  })

  it('includes tagline when present', () => {
    const txt = buildLlmCompanyTxt(mockCompany, 0)
    expect(txt).toContain('Building the future')
  })

  it('includes website when present', () => {
    const txt = buildLlmCompanyTxt(mockCompany, 0)
    expect(txt).toContain('website: https://acme.com')
  })

  it('includes bio when present', () => {
    const txt = buildLlmCompanyTxt(mockCompany, 0)
    expect(txt).toContain('## About')
    expect(txt).toContain('We make things.')
  })

  it('includes people count when > 0', () => {
    const txt = buildLlmCompanyTxt(mockCompany, 5)
    expect(txt).toContain('## People')
    expect(txt).toContain('5 current employees')
  })

  it('uses singular for 1 employee', () => {
    const txt = buildLlmCompanyTxt(mockCompany, 1)
    expect(txt).toContain('1 current employee on linked.md')
  })

  it('omits people section when 0', () => {
    const txt = buildLlmCompanyTxt(mockCompany, 0)
    expect(txt).not.toContain('## People')
  })

  it('includes pointer to llm-full.txt', () => {
    const txt = buildLlmCompanyTxt(mockCompany, 0)
    expect(txt).toContain('/company/acme-corp/llm-full.txt')
  })

  it('handles null tagline and bio', () => {
    const txt = buildLlmCompanyTxt({ ...mockCompany, tagline: null, bio: null, website: null }, 0)
    expect(txt).toContain('# Acme Corp')
    expect(txt).not.toContain('null')
  })
})

describe('buildLlmCompanyFullTxt (company full)', () => {
  const currentPerson = {
    display_name: 'Jane Doe',
    slug: 'jane-doe',
    title: 'Staff Engineer',
    is_current: true,
    period: '2022–now',
  }
  const pastPerson = {
    display_name: 'Bob Smith',
    slug: 'bob-smith',
    title: 'Engineer',
    is_current: false,
    period: '2020–2021',
  }

  it('includes company name heading with (full)', () => {
    const txt = buildLlmCompanyFullTxt(mockCompany, [])
    expect(txt).toContain('# Acme Corp')
    expect(txt).toContain('(full)')
  })

  it('includes source pointer', () => {
    const txt = buildLlmCompanyFullTxt(mockCompany, [])
    expect(txt).toContain('/company/acme-corp/llm-full.txt')
  })

  it('includes current and alumni sections', () => {
    const txt = buildLlmCompanyFullTxt(mockCompany, [currentPerson, pastPerson])
    expect(txt).toContain('## People')
    expect(txt).toContain('### Current')
    expect(txt).toContain('Jane Doe')
    expect(txt).toContain('### Alumni')
    expect(txt).toContain('Bob Smith')
  })

  it('omits alumni section when none', () => {
    const txt = buildLlmCompanyFullTxt(mockCompany, [currentPerson])
    expect(txt).toContain('### Current')
    expect(txt).not.toContain('### Alumni')
  })

  it('omits people section when empty', () => {
    const txt = buildLlmCompanyFullTxt(mockCompany, [])
    expect(txt).not.toContain('## People')
  })

  it('includes markdown content', () => {
    const txt = buildLlmCompanyFullTxt(mockCompany, [])
    expect(txt).toContain('## Our story')
  })

  it('omits Open Roles section when no jobs passed', () => {
    const txt = buildLlmCompanyFullTxt(mockCompany, [])
    expect(txt).not.toContain('## Open Roles')
  })

  it('includes Open Roles section with job details', () => {
    const jobs = [
      {
        id: 'job-1',
        company_id: 'co-1',
        title: 'Senior Engineer',
        location: 'Remote',
        type: 'full-time' as const,
        description_md: 'We are looking for a senior engineer.',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]
    const txt = buildLlmCompanyFullTxt(mockCompany, [], jobs)
    expect(txt).toContain('## Open Roles')
    expect(txt).toContain('### Senior Engineer')
    expect(txt).toContain('location: Remote')
    expect(txt).toContain('type: full-time')
    expect(txt).toContain('We are looking for a senior engineer.')
  })

  it('omits location line when job has no location', () => {
    const jobs = [
      {
        id: 'job-2',
        company_id: 'co-1',
        title: 'Part-time Contractor',
        location: null,
        type: 'contract' as const,
        description_md: '',
        active: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
    ]
    const txt = buildLlmCompanyFullTxt(mockCompany, [], jobs)
    expect(txt).toContain('### Part-time Contractor')
    expect(txt).not.toContain('location:')
  })
})
