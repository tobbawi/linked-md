import fs from 'fs'
import path from 'path'
import type { Profile, Post, ExperienceEntry, Company } from '@/types'

const EXPORT_ROOT = path.join(process.cwd(), 'exports')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function formatExperiencePeriod(entry: ExperienceEntry): string {
  const start = entry.start_month
    ? `${entry.start_month}/${entry.start_year}`
    : `${entry.start_year}`
  if (entry.is_current) return `${start} – present`
  const end = entry.end_year
    ? entry.end_month
      ? `${entry.end_month}/${entry.end_year}`
      : `${entry.end_year}`
    : ''
  return end ? `${start} – ${end}` : start
}

export function buildProfileMarkdown(profile: Profile, experience: ExperienceEntry[] = []): string {
  const lines: string[] = []
  lines.push(`# ${profile.display_name}`)
  lines.push('')
  const meta: string[] = []
  if (profile.title) meta.push(profile.title)
  if (profile.location) meta.push(profile.location)
  if (profile.website) meta.push(profile.website)
  if (meta.length) {
    lines.push(meta.join(' · '))
    lines.push('')
  }
  if (profile.bio) {
    lines.push(profile.bio)
    lines.push('')
  }
  if (experience.length > 0) {
    lines.push(`## Experience`)
    lines.push('')
    for (const entry of experience) {
      const period = formatExperiencePeriod(entry)
      lines.push(`### ${entry.title} at ${entry.company_name}`)
      lines.push(`_${period}_`)
      if (entry.description) {
        lines.push('')
        lines.push(entry.description)
      }
      lines.push('')
    }
  }
  if (profile.markdown_content) {
    lines.push(profile.markdown_content)
    lines.push('')
  }
  return lines.join('\n')
}

export function buildPostMarkdown(post: Post, authorSlug: string): string {
  const lines: string[] = []
  if (post.title) {
    lines.push(`# ${post.title}`)
    lines.push('')
  }
  lines.push(post.markdown_content)
  lines.push('')
  lines.push(`---`)
  lines.push(`author: ${authorSlug}`)
  lines.push(`created: ${post.created_at}`)
  return lines.join('\n')
}

interface PostWithStats extends Post {
  likeCount?: number
  commentCount?: number
}

interface ProfileStats {
  followerCount?: number
  followingCount?: number
}

// Summary: current roles only, bio, network stats, pointer to full
export function buildLlmTxt(
  profile: Profile,
  experience: ExperienceEntry[] = [],
  stats?: ProfileStats
): string {
  const lines: string[] = []
  lines.push(`# ${profile.display_name} — linked.md profile`)
  lines.push('')
  if (profile.title) lines.push(`title: ${profile.title}`)
  if (profile.location) lines.push(`location: ${profile.location}`)
  if (profile.website) lines.push(`website: ${profile.website}`)
  if (profile.title || profile.location || profile.website) lines.push('')

  if (profile.bio) {
    lines.push(`## Bio`)
    lines.push(profile.bio)
    lines.push('')
  }

  const currentRoles = experience.filter(e => e.is_current)
  if (currentRoles.length > 0) {
    lines.push(`## Current`)
    for (const entry of currentRoles) {
      const period = formatExperiencePeriod(entry)
      lines.push(`- ${entry.title} at ${entry.company_name} (${period})`)
    }
    lines.push('')
  }

  if (stats?.followerCount !== undefined || stats?.followingCount !== undefined) {
    lines.push(`## Network`)
    if (stats.followerCount !== undefined) lines.push(`followers: ${stats.followerCount}`)
    if (stats.followingCount !== undefined) lines.push(`following: ${stats.followingCount}`)
    lines.push('')
  }

  lines.push(`Full profile (experience history + posts): /profile/${profile.slug}/llm-full.txt`)
  return lines.join('\n')
}

// Full: all experience history, all posts, stats
export function buildLlmFullTxt(
  profile: Profile,
  posts: Post[],
  experience: ExperienceEntry[] = [],
  stats?: ProfileStats
): string {
  const lines: string[] = []
  lines.push(`# ${profile.display_name} — linked.md profile (full)`)
  lines.push(`> Source: /profile/${profile.slug}/llm-full.txt`)
  lines.push(`> Last updated: ${profile.updated_at}`)
  lines.push('')

  if (profile.title || profile.location || profile.website) {
    if (profile.title) lines.push(`title: ${profile.title}`)
    if (profile.location) lines.push(`location: ${profile.location}`)
    if (profile.website) lines.push(`website: ${profile.website}`)
    lines.push('')
  }

  if (profile.bio) {
    lines.push(`## Bio`)
    lines.push(profile.bio)
    lines.push('')
  }

  if (experience.length > 0) {
    lines.push(`## Experience`)
    for (const entry of experience) {
      const period = formatExperiencePeriod(entry)
      lines.push(`### ${entry.title} at ${entry.company_name} (${period})`)
      if (entry.description) lines.push(entry.description)
      lines.push('')
    }
  }

  if (profile.markdown_content) {
    lines.push(`## About`)
    lines.push(profile.markdown_content)
    lines.push('')
  }

  if (stats?.followerCount !== undefined || stats?.followingCount !== undefined) {
    lines.push(`## Network`)
    if (stats.followerCount !== undefined) lines.push(`followers: ${stats.followerCount}`)
    if (stats.followingCount !== undefined) lines.push(`following: ${stats.followingCount}`)
    lines.push('')
  }

  if (posts.length > 0) {
    lines.push(`## Posts (${posts.length})`)
    lines.push('')
    for (const post of posts as PostWithStats[]) {
      if (post.title) lines.push(`### ${post.title}`)
      lines.push(`> /profile/${profile.slug}/post/${post.slug}.md`)
      lines.push(`> Posted: ${post.created_at}`)
      lines.push('')
      lines.push(post.markdown_content)
      const meta: string[] = []
      if (post.likeCount) meta.push(`${post.likeCount} likes`)
      if (post.commentCount) meta.push(`${post.commentCount} comments`)
      if (meta.length) lines.push(`_${meta.join(' · ')}_`)
      lines.push('')
      lines.push('---')
      lines.push('')
    }
  }

  return lines.join('\n')
}

// Company summary: name, tagline, bio, current people count, pointer to full
export function buildLlmCompanyTxt(
  company: Company,
  currentPeopleCount: number
): string {
  const lines: string[] = []
  lines.push(`# ${company.name} — linked.md company profile`)
  lines.push('')
  if (company.tagline) {
    lines.push(company.tagline)
    lines.push('')
  }
  if (company.website) {
    lines.push(`website: ${company.website}`)
    lines.push('')
  }
  if (company.bio) {
    lines.push(`## About`)
    lines.push(company.bio)
    lines.push('')
  }
  if (currentPeopleCount > 0) {
    lines.push(`## People`)
    lines.push(`${currentPeopleCount} current employee${currentPeopleCount === 1 ? '' : 's'} on linked.md`)
    lines.push('')
  }
  lines.push(`Full company profile (all people + history): /company/${company.slug}/llm-full.txt`)
  return lines.join('\n')
}

interface PersonEntry {
  display_name: string
  slug: string
  title: string
  is_current: boolean
  period: string
}

// Company full: bio, all content, all people with roles
export function buildLlmCompanyFullTxt(
  company: Company,
  people: PersonEntry[]
): string {
  const lines: string[] = []
  lines.push(`# ${company.name} — linked.md company profile (full)`)
  lines.push(`> Source: /company/${company.slug}/llm-full.txt`)
  lines.push(`> Last updated: ${company.updated_at}`)
  lines.push('')
  if (company.tagline) {
    lines.push(company.tagline)
    lines.push('')
  }
  if (company.website) {
    lines.push(`website: ${company.website}`)
    lines.push('')
  }
  if (company.bio) {
    lines.push(`## About`)
    lines.push(company.bio)
    lines.push('')
  }
  if (company.markdown_content) {
    lines.push(company.markdown_content)
    lines.push('')
  }
  if (people.length > 0) {
    lines.push(`## People`)
    const current = people.filter(p => p.is_current)
    const past = people.filter(p => !p.is_current)
    if (current.length > 0) {
      lines.push(`### Current`)
      for (const p of current) {
        lines.push(`- ${p.display_name} — ${p.title} (${p.period}) /profile/${p.slug}`)
      }
      lines.push('')
    }
    if (past.length > 0) {
      lines.push(`### Alumni`)
      for (const p of past) {
        lines.push(`- ${p.display_name} — ${p.title} (${p.period}) /profile/${p.slug}`)
      }
      lines.push('')
    }
  }
  return lines.join('\n')
}

export function buildGraphJson(profile: Profile, experience: ExperienceEntry[]): object {
  const nodes: Array<{ id: string; type: string; label: string }> = [
    { id: profile.slug, type: 'profile', label: profile.display_name },
  ]
  const edges: Array<{ source: string; target: string; label: string; period: string }> = []

  for (const entry of experience) {
    if (!entry.company_slug) continue
    if (!nodes.find(n => n.id === entry.company_slug)) {
      nodes.push({ id: entry.company_slug, type: 'company', label: entry.company_name })
    }
    edges.push({
      source: profile.slug,
      target: entry.company_slug,
      label: entry.title,
      period: formatExperiencePeriod(entry),
    })
  }

  return { nodes, edges }
}

export function exportProfileMarkdown(profile: Profile, experience: ExperienceEntry[] = []): void {
  const dir = path.join(EXPORT_ROOT, 'profile', profile.slug)
  ensureDir(dir)
  const md = buildProfileMarkdown(profile, experience)
  fs.writeFileSync(path.join(dir, 'index.md'), md, 'utf-8')
}

export function exportPostMarkdown(post: Post, authorSlug: string): void {
  const dir = path.join(EXPORT_ROOT, 'profile', authorSlug, 'post')
  ensureDir(dir)
  const md = buildPostMarkdown(post, authorSlug)
  fs.writeFileSync(path.join(dir, `${post.slug}.md`), md, 'utf-8')
}

export function exportLlmTxt(
  profile: Profile,
  experience: ExperienceEntry[] = [],
  stats?: { followerCount?: number; followingCount?: number }
): void {
  const dir = path.join(EXPORT_ROOT, 'profile', profile.slug)
  ensureDir(dir)
  const txt = buildLlmTxt(profile, experience, stats)
  fs.writeFileSync(path.join(dir, 'llm.txt'), txt, 'utf-8')
}

export function exportLlmFullTxt(
  profile: Profile,
  posts: Post[],
  experience: ExperienceEntry[] = [],
  stats?: { followerCount?: number; followingCount?: number }
): void {
  const dir = path.join(EXPORT_ROOT, 'profile', profile.slug)
  ensureDir(dir)
  const txt = buildLlmFullTxt(profile, posts, experience, stats)
  fs.writeFileSync(path.join(dir, 'llm-full.txt'), txt, 'utf-8')
}

export function exportGraphJson(profile: Profile, experience: ExperienceEntry[]): void {
  const dir = path.join(EXPORT_ROOT, 'profile', profile.slug)
  ensureDir(dir)
  const graph = buildGraphJson(profile, experience)
  fs.writeFileSync(path.join(dir, 'graph.json'), JSON.stringify(graph, null, 2), 'utf-8')
}

export async function exportAllProfileFiles(
  profile: Profile,
  posts: Post[],
  experience: ExperienceEntry[] = [],
  stats?: { followerCount?: number; followingCount?: number }
): Promise<void> {
  exportProfileMarkdown(profile, experience)
  exportLlmTxt(profile, experience, stats)
  exportLlmFullTxt(profile, posts, experience, stats)
  exportGraphJson(profile, experience)
  for (const post of posts) {
    exportPostMarkdown(post, profile.slug)
  }
}
